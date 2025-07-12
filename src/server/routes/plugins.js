const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');
const EventManager = require('../../lib/eventManager');

// Initialize event manager
const eventManager = new EventManager();

// Plugin directory
const PLUGIN_DIR = './plugins';

// Store active cron jobs
const activeJobs = new Map();

/**
 * GET /api/plugins
 * Get all available plugins
 */
router.get('/', async (req, res) => {
  try {
    // Ensure plugin directory exists
    await fs.mkdir(PLUGIN_DIR, { recursive: true });
    
    const files = await fs.readdir(PLUGIN_DIR);
    const plugins = [];
    
    for (const file of files) {
      const pluginPath = path.join(PLUGIN_DIR, file);
      const stat = await fs.stat(pluginPath);
      
      if (stat.isDirectory()) {
        try {
          const configPath = path.join(pluginPath, 'plugin.json');
          const configContent = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          plugins.push({
            id: file,
            name: config.name || file,
            description: config.description || '',
            version: config.version || '1.0.0',
            author: config.author || '',
            source: config.source || '',
            type: config.type || 'manual',
            schedule: config.schedule || null,
            enabled: config.enabled !== false,
            lastRun: config.lastRun || null,
            config: config.config || {}
          });
        } catch (error) {
          console.error(`Error reading plugin config for ${file}:`, error);
          plugins.push({
            id: file,
            name: file,
            description: 'Plugin configuration not found',
            version: '1.0.0',
            enabled: false,
            error: 'Invalid configuration'
          });
        }
      }
    }
    
    res.json({ plugins });
  } catch (error) {
    console.error('Error getting plugins:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plugins/:id
 * Get a specific plugin
 */
router.get('/:id', async (req, res) => {
  try {
    const pluginPath = path.join(PLUGIN_DIR, req.params.id);
    
    try {
      const stat = await fs.stat(pluginPath);
      if (!stat.isDirectory()) {
        return res.status(404).json({ error: 'Plugin not found' });
      }
    } catch (error) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    
    const configPath = path.join(pluginPath, 'plugin.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Check if plugin has main file
    const mainFile = config.main || 'index.js';
    const mainPath = path.join(pluginPath, mainFile);
    
    let hasMainFile = false;
    try {
      await fs.access(mainPath);
      hasMainFile = true;
    } catch (error) {
      hasMainFile = false;
    }
    
    res.json({
      id: req.params.id,
      name: config.name || req.params.id,
      description: config.description || '',
      version: config.version || '1.0.0',
      author: config.author || '',
      source: config.source || '',
      type: config.type || 'manual',
      schedule: config.schedule || null,
      enabled: config.enabled !== false,
      lastRun: config.lastRun || null,
      config: config.config || {},
      hasMainFile,
      mainFile
    });
  } catch (error) {
    console.error('Error getting plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/plugins/:id/run
 * Run a plugin manually
 */
router.post('/:id/run', async (req, res) => {
  try {
    const pluginPath = path.join(PLUGIN_DIR, req.params.id);
    
    // Check if plugin exists
    try {
      await fs.stat(pluginPath);
    } catch (error) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    
    // Read plugin config
    const configPath = path.join(pluginPath, 'plugin.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    const mainFile = config.main || 'index.js';
    const mainPath = path.join(pluginPath, mainFile);
    
    // Check if main file exists
    try {
      await fs.access(mainPath);
    } catch (error) {
      return res.status(400).json({ error: 'Plugin main file not found' });
    }
    
    // Run the plugin
    const result = await runPlugin(req.params.id, mainPath, config, req.body);
    
    res.json({
      success: true,
      plugin: req.params.id,
      result
    });
  } catch (error) {
    console.error('Error running plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/plugins/:id/enable
 * Enable a plugin
 */
router.post('/:id/enable', async (req, res) => {
  try {
    const pluginPath = path.join(PLUGIN_DIR, req.params.id);
    const configPath = path.join(pluginPath, 'plugin.json');
    
    // Read current config
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Enable plugin
    config.enabled = true;
    
    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Start scheduled job if schedule is configured
    if (config.schedule && config.enabled) {
      startScheduledJob(req.params.id, config);
    }
    
    res.json({
      success: true,
      plugin: req.params.id,
      enabled: true
    });
  } catch (error) {
    console.error('Error enabling plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/plugins/:id/disable
 * Disable a plugin
 */
router.post('/:id/disable', async (req, res) => {
  try {
    const pluginPath = path.join(PLUGIN_DIR, req.params.id);
    const configPath = path.join(pluginPath, 'plugin.json');
    
    // Read current config
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Disable plugin
    config.enabled = false;
    
    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Stop scheduled job
    stopScheduledJob(req.params.id);
    
    res.json({
      success: true,
      plugin: req.params.id,
      enabled: false
    });
  } catch (error) {
    console.error('Error disabling plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/plugins/:id/config
 * Update plugin configuration
 */
router.put('/:id/config', async (req, res) => {
  try {
    const pluginPath = path.join(PLUGIN_DIR, req.params.id);
    const configPath = path.join(pluginPath, 'plugin.json');
    
    // Read current config
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Update config with provided values
    const updates = req.body;
    Object.assign(config, updates);
    
    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Restart scheduled job if schedule changed
    if (config.schedule && config.enabled) {
      stopScheduledJob(req.params.id);
      startScheduledJob(req.params.id, config);
    } else if (!config.enabled) {
      stopScheduledJob(req.params.id);
    }
    
    res.json({
      success: true,
      plugin: req.params.id,
      config
    });
  } catch (error) {
    console.error('Error updating plugin config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plugins/:id/logs
 * Get plugin logs
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const logPath = path.join(PLUGIN_DIR, req.params.id, 'plugin.log');
    
    try {
      const logs = await fs.readFile(logPath, 'utf8');
      const lines = logs.split('\n').filter(line => line.trim());
      
      res.json({
        plugin: req.params.id,
        logs: lines.slice(-100) // Last 100 lines
      });
    } catch (error) {
      res.json({
        plugin: req.params.id,
        logs: []
      });
    }
  } catch (error) {
    console.error('Error getting plugin logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/plugins/install
 * Install a plugin from a source
 */
router.post('/install', async (req, res) => {
  try {
    const { source, name } = req.body;
    
    if (!source || !name) {
      return res.status(400).json({ error: 'Source and name are required' });
    }
    
    // Create plugin directory
    const pluginPath = path.join(PLUGIN_DIR, name);
    await fs.mkdir(pluginPath, { recursive: true });
    
    // Create basic plugin.json
    const pluginConfig = {
      name,
      description: `Plugin installed from ${source}`,
      version: '1.0.0',
      author: 'LifeOS Core',
      source,
      type: 'manual',
      enabled: false,
      config: {}
    };
    
    const configPath = path.join(pluginPath, 'plugin.json');
    await fs.writeFile(configPath, JSON.stringify(pluginConfig, null, 2));
    
    // Create basic index.js
    const indexContent = `#!/usr/bin/env node

/**
 * ${name} Plugin for LifeOS Core
 * 
 * This plugin was automatically generated.
 * Edit this file to implement your plugin logic.
 */

const EventManager = require('../../../lib/eventManager');

async function runPlugin(config) {
  console.log('Running ${name} plugin...');
  
  // TODO: Implement your plugin logic here
  // Example:
  // const eventManager = new EventManager();
  // await eventManager.initialize();
  // 
  // const event = {
  //   timestamp: new Date().toISOString(),
  //   source: '${name}',
  //   type: 'plugin.event',
  //   title: 'Plugin Event',
  //   metadata: { plugin: '${name}' }
  // };
  // 
  // await eventManager.createEvent(event);
  
  console.log('${name} plugin completed');
}

// Run if called directly
if (require.main === module) {
  const config = require('./plugin.json');
  runPlugin(config).catch(console.error);
}

module.exports = { runPlugin };
`;
    
    const indexPath = path.join(pluginPath, 'index.js');
    await fs.writeFile(indexPath, indexContent);
    
    res.status(201).json({
      success: true,
      plugin: name,
      message: 'Plugin installed successfully'
    });
  } catch (error) {
    console.error('Error installing plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions

async function runPlugin(pluginId, mainPath, config, args = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [mainPath], {
      cwd: path.dirname(mainPath),
      env: {
        ...process.env,
        PLUGIN_CONFIG: JSON.stringify(config),
        PLUGIN_ARGS: JSON.stringify(args)
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      // Update last run time
      updatePluginLastRun(pluginId);
      
      if (code === 0) {
        resolve({
          success: true,
          stdout,
          stderr,
          exitCode: code
        });
      } else {
        reject(new Error(`Plugin failed with exit code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function updatePluginLastRun(pluginId) {
  try {
    const configPath = path.join(PLUGIN_DIR, pluginId, 'plugin.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    config.lastRun = new Date().toISOString();
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error updating plugin last run time:', error);
  }
}

function startScheduledJob(pluginId, config) {
  // Stop existing job if running
  stopScheduledJob(pluginId);
  
  if (config.schedule && config.enabled) {
    const job = cron.schedule(config.schedule, async () => {
      try {
        const pluginPath = path.join(PLUGIN_DIR, pluginId);
        const mainFile = config.main || 'index.js';
        const mainPath = path.join(pluginPath, mainFile);
        
        await runPlugin(pluginId, mainPath, config);
        console.log(`Scheduled plugin ${pluginId} completed successfully`);
      } catch (error) {
        console.error(`Scheduled plugin ${pluginId} failed:`, error);
      }
    });
    
    activeJobs.set(pluginId, job);
    console.log(`Started scheduled job for plugin ${pluginId}`);
  }
}

function stopScheduledJob(pluginId) {
  const job = activeJobs.get(pluginId);
  if (job) {
    job.stop();
    activeJobs.delete(pluginId);
    console.log(`Stopped scheduled job for plugin ${pluginId}`);
  }
}

// Initialize scheduled jobs on startup
async function initializeScheduledJobs() {
  try {
    await fs.mkdir(PLUGIN_DIR, { recursive: true });
    
    const files = await fs.readdir(PLUGIN_DIR);
    
    for (const file of files) {
      const pluginPath = path.join(PLUGIN_DIR, file);
      const stat = await fs.stat(pluginPath);
      
      if (stat.isDirectory()) {
        try {
          const configPath = path.join(pluginPath, 'plugin.json');
          const configContent = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          if (config.enabled && config.schedule) {
            startScheduledJob(file, config);
          }
        } catch (error) {
          console.error(`Error initializing plugin ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing scheduled jobs:', error);
  }
}

// Initialize on startup
initializeScheduledJobs();

module.exports = router; 