#!/usr/bin/env node

/**
 * LifeOS Core Setup Script
 * 
 * This script helps set up the development environment
 * and creates initial data structures.
 */

const fs = require('fs').promises;
const path = require('path');

async function setup() {
  console.log('🧠 Setting up LifeOS Core...\n');

  try {
    // Create necessary directories
    const directories = [
      './data',
      './data/events',
      './plugins'
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }

    // Create .env file if it doesn't exist
    const envPath = './.env';
    try {
      await fs.access(envPath);
      console.log('✅ .env file already exists');
    } catch (error) {
      const envContent = `# LifeOS Core Configuration
PORT=3456
NODE_ENV=development

# Database
DB_PATH=./data/lifeos.db

# Plugin Directory
PLUGIN_DIR=./plugins

# Log Level
LOG_LEVEL=info
`;
      await fs.writeFile(envPath, envContent);
      console.log('✅ Created .env file');
    }



    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: npm run dev');
    console.log('3. Open: http://localhost:3456');
    console.log('\nHappy life tracking! 🧠');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setup();
}

module.exports = { setup }; 