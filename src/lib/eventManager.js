const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const Ajv = require('ajv');

// Import LifeOS Protocol components
const { LifeURIResolver, BuiltInResolvers } = require('lifeos-protocol');
const { isValidEventType, getEventTypeDescription } = require('lifeos-protocol/eventTypes');

class EventManager {
  constructor(dbPath = './data/lifeos.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.resolver = new LifeURIResolver();
    this.ajv = new Ajv({ allErrors: true });
    // Add date-time format support
    this.ajv.addFormat('date-time', {
      type: 'string',
      validate: (dateTimeString) => {
        return !isNaN(Date.parse(dateTimeString));
      }
    });
    
    // Load schema for validation
    this.schema = require('lifeos-protocol/lifeevent.schema.json');
    this.validate = this.ajv.compile(this.schema);
  }

  /**
   * Initialize the database and create tables
   */
  async initialize() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    await fs.mkdir(dataDir, { recursive: true });

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create events table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            metadata TEXT,
            linked_uris TEXT,
            tags TEXT,
            mood INTEGER,
            location TEXT,
            duration INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create indexes for better performance
          this.db.run('CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)');
          this.db.run('CREATE INDEX IF NOT EXISTS idx_source ON events(source)');
          this.db.run('CREATE INDEX IF NOT EXISTS idx_type ON events(type)');
          this.db.run('CREATE INDEX IF NOT EXISTS idx_tags ON events(tags)');

          // Register file system resolver
          this.resolver.registerResolver('local', BuiltInResolvers.fileSystemResolver('./data/events'));
          
          resolve();
        });
      });
    });
  }

  /**
   * Create a new LifeEvent
   * @param {Object} eventData - The event data
   * @returns {Object} The created event with ID
   */
  async createEvent(eventData) {
    // Validate the event
    if (!this.validate(eventData)) {
      throw new Error(`Invalid event: ${this.ajv.errorsText(this.validate.errors)}`);
    }

    // Generate ID if not provided
    const event = {
      ...eventData,
      id: eventData.id || uuidv4(),
      created_at: eventData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Serialize complex fields
    const serializedEvent = {
      ...event,
      metadata: JSON.stringify(event.metadata || {}),
      linked_uris: JSON.stringify(event.linked_uris || []),
      tags: JSON.stringify(event.tags || []),
      location: event.location ? JSON.stringify(event.location) : null
    };

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO events (
          id, timestamp, source, type, title, metadata, linked_uris, 
          tags, mood, location, duration, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        serializedEvent.id,
        serializedEvent.timestamp,
        serializedEvent.source,
        serializedEvent.type,
        serializedEvent.title,
        serializedEvent.metadata,
        serializedEvent.linked_uris,
        serializedEvent.tags,
        serializedEvent.mood,
        serializedEvent.location,
        serializedEvent.duration,
        serializedEvent.created_at,
        serializedEvent.updated_at
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }

        // Return the event with parsed fields
        resolve({
          ...event,
          metadata: JSON.parse(serializedEvent.metadata),
          linked_uris: JSON.parse(serializedEvent.linked_uris),
          tags: JSON.parse(serializedEvent.tags),
          location: serializedEvent.location ? JSON.parse(serializedEvent.location) : null
        });
      });

      stmt.finalize();
    });
  }

  /**
   * Get an event by ID
   * @param {string} id - The event ID
   * @returns {Object|null} The event or null if not found
   */
  async getEvent(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        // Parse complex fields
        resolve({
          ...row,
          metadata: JSON.parse(row.metadata || '{}'),
          linked_uris: JSON.parse(row.linked_uris || '[]'),
          tags: JSON.parse(row.tags || '[]'),
          location: row.location ? JSON.parse(row.location) : null
        });
      });
    });
  }

  /**
   * Get events with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Array} Array of events
   */
  async getEvents(options = {}) {
    const {
      source,
      type,
      startDate,
      endDate,
      tags,
      limit = 100,
      offset = 0,
      orderBy = 'timestamp DESC'
    } = options;

    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }

    if (tags && tags.length > 0) {
      // Simple tag matching (could be improved with full-text search)
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%${tag}%`));
    }

    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse complex fields for each event
        const events = rows.map(row => ({
          ...row,
          metadata: JSON.parse(row.metadata || '{}'),
          linked_uris: JSON.parse(row.linked_uris || '[]'),
          tags: JSON.parse(row.tags || '[]'),
          location: row.location ? JSON.parse(row.location) : null
        }));

        resolve(events);
      });
    });
  }

  /**
   * Update an event
   * @param {string} id - The event ID
   * @param {Object} updates - The updates to apply
   * @returns {Object} The updated event
   */
  async updateEvent(id, updates) {
    const event = await this.getEvent(id);
    if (!event) {
      throw new Error(`Event not found: ${id}`);
    }

    // Merge updates
    const updatedEvent = {
      ...event,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Validate the updated event
    if (!this.validate(updatedEvent)) {
      throw new Error(`Invalid event: ${this.ajv.errorsText(this.validate.errors)}`);
    }

    // Serialize complex fields
    const serializedEvent = {
      ...updatedEvent,
      metadata: JSON.stringify(updatedEvent.metadata || {}),
      linked_uris: JSON.stringify(updatedEvent.linked_uris || []),
      tags: JSON.stringify(updatedEvent.tags || []),
      location: updatedEvent.location ? JSON.stringify(updatedEvent.location) : null
    };

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE events SET
          timestamp = ?, source = ?, type = ?, title = ?, metadata = ?,
          linked_uris = ?, tags = ?, mood = ?, location = ?, duration = ?,
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run([
        serializedEvent.timestamp,
        serializedEvent.source,
        serializedEvent.type,
        serializedEvent.title,
        serializedEvent.metadata,
        serializedEvent.linked_uris,
        serializedEvent.tags,
        serializedEvent.mood,
        serializedEvent.location,
        serializedEvent.duration,
        serializedEvent.updated_at,
        id
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(updatedEvent);
      });

      stmt.finalize();
    });
  }

  /**
   * Delete an event
   * @param {string} id - The event ID
   * @returns {boolean} True if deleted
   */
  async deleteEvent(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM events WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this.changes > 0);
      });
    });
  }

  /**
   * Search events by text
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Array of matching events
   */
  async searchEvents(query, options = {}) {
    const { limit = 50 } = options;
    
    return new Promise((resolve, reject) => {
      const searchQuery = `
        SELECT * FROM events 
        WHERE title LIKE ? OR metadata LIKE ? OR tags LIKE ?
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      const searchTerm = `%${query}%`;
      
      this.db.all(searchQuery, [searchTerm, searchTerm, searchTerm, limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const events = rows.map(row => ({
          ...row,
          metadata: JSON.parse(row.metadata || '{}'),
          linked_uris: JSON.parse(row.linked_uris || '[]'),
          tags: JSON.parse(row.tags || '[]'),
          location: row.location ? JSON.parse(row.location) : null
        }));

        resolve(events);
      });
    });
  }

  /**
   * Get event statistics
   * @returns {Object} Statistics about events
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as total FROM events', (err, totalRow) => {
        if (err) {
          reject(err);
          return;
        }

        this.db.all('SELECT source, COUNT(*) as count FROM events GROUP BY source', (err, sourceRows) => {
          if (err) {
            reject(err);
            return;
          }

          this.db.all('SELECT type, COUNT(*) as count FROM events GROUP BY type', (err, typeRows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve({
              total: totalRow.total,
              bySource: sourceRows,
              byType: typeRows
            });
          });
        });
      });
    });
  }

  /**
   * Resolve a life:// URI to an event
   * @param {string} uri - The life:// URI
   * @returns {Object} The resolved event
   */
  async resolveURI(uri) {
    try {
      return await this.resolver.resolveURI(uri);
    } catch (error) {
      // If external resolver fails, try to find in local database
      const parsed = this.resolver.parseURI(uri);
      const events = await this.getEvents({
        source: parsed.source,
        type: parsed.type,
        limit: 1
      });

      if (events.length > 0) {
        return events[0];
      }

      throw error;
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = EventManager; 