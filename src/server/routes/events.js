const express = require('express');
const router = express.Router();
const EventManager = require('../../lib/eventManager');

// Initialize event manager
const eventManager = new EventManager();

// Initialize database on startup
let isInitialized = false;
eventManager.initialize()
  .then(() => {
    isInitialized = true;
    console.log('✅ EventManager initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize EventManager:', error);
    process.exit(1);
  });

// Middleware to ensure database is initialized
const ensureInitialized = (req, res, next) => {
  if (!isInitialized) {
    return res.status(503).json({ error: 'Database is initializing, please try again' });
  }
  next();
};

/**
 * GET /api/events
 * Get events with optional filtering
 */
router.get('/', ensureInitialized, async (req, res) => {
  try {
    const {
      source,
      type,
      startDate,
      endDate,
      tags,
      limit = 100,
      offset = 0,
      orderBy = 'timestamp DESC'
    } = req.query;

    // Parse tags if provided
    const parsedTags = tags ? tags.split(',') : undefined;

    const events = await eventManager.getEvents({
      source,
      type,
      startDate,
      endDate,
      tags: parsedTags,
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy
    });

    res.json({
      events,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: events.length
      }
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/events/sources
 * Get all available sources
 */
router.get('/sources', ensureInitialized, async (req, res) => {
  try {
    const events = await eventManager.getEvents({ limit: 1000 });
    const sources = [...new Set(events.map(event => event.source))];
    res.json({ sources });
  } catch (error) {
    console.error('Error getting sources:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/events/types
 * Get all available event types
 */
router.get('/types', ensureInitialized, async (req, res) => {
  try {
    const events = await eventManager.getEvents({ limit: 1000 });
    const types = [...new Set(events.map(event => event.type))];
    res.json({ types });
  } catch (error) {
    console.error('Error getting types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/events/search
 * Search events by text
 */
router.get('/search', ensureInitialized, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const events = await eventManager.searchEvents(q, { limit: parseInt(limit) });
    res.json({ events, query: q });
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/events/stats
 * Get event statistics
 */
router.get('/stats', ensureInitialized, async (req, res) => {
  try {
    const stats = await eventManager.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/events/resolve
 * Resolve a life:// URI to an event
 */
router.post('/resolve', ensureInitialized, async (req, res) => {
  try {
    const { uri } = req.body;
    
    if (!uri) {
      return res.status(400).json({ error: 'URI is required' });
    }

    const event = await eventManager.resolveURI(uri);
    res.json(event);
  } catch (error) {
    console.error('Error resolving URI:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/events
 * Create a new event
 */
router.post('/', ensureInitialized, async (req, res) => {
  try {
    const eventData = req.body;
    
    // Add default timestamp if not provided
    if (!eventData.timestamp) {
      eventData.timestamp = new Date().toISOString();
    }

    const event = await eventManager.createEvent(eventData);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/events/:id
 * Get a specific event by ID
 */
router.get('/:id', ensureInitialized, async (req, res) => {
  try {
    const event = await eventManager.getEvent(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/events/:id
 * Update an event
 */
router.put('/:id', ensureInitialized, async (req, res) => {
  try {
    const updates = req.body;
    const event = await eventManager.updateEvent(req.params.id, updates);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event
 */
router.delete('/:id', ensureInitialized, async (req, res) => {
  try {
    const deleted = await eventManager.deleteEvent(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 