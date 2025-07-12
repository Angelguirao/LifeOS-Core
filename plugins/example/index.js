#!/usr/bin/env node

/**
 * Example Plugin for LifeOS Core
 * 
 * This is a simple example plugin that demonstrates
 * how to create events in LifeOS Core.
 */

const EventManager = require('../../src/lib/eventManager');

async function runPlugin(config) {
  console.log('Running Example Plugin...');
  
  try {
    // Initialize event manager
    const eventManager = new EventManager();
    await eventManager.initialize();
    
    // Create an example event
    const event = {
      timestamp: new Date().toISOString(),
      source: 'example-plugin',
      type: 'plugin.event',
      title: 'Example Plugin Event',
      metadata: {
        plugin: 'example',
        config: config,
        message: 'This event was created by the example plugin'
      },
      tags: ['plugin', 'example'],
      mood: 7
    };
    
    // Save the event
    const savedEvent = await eventManager.createEvent(event);
    console.log('Created event:', savedEvent.id);
    
    console.log('Example Plugin completed successfully');
  } catch (error) {
    console.error('Example Plugin failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const config = require('./plugin.json');
  runPlugin(config).catch(console.error);
}

module.exports = { runPlugin }; 