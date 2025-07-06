#!/usr/bin/env node

/**
 * Setup script for configuring the bot
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('🚀 Smart YouTube Chat Bot Setup');
  console.log('================================\n');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('Please provide the following information:\n');

  // Collect required information
  const config = {
    YOUTUBE_API_KEY: await question('YouTube API Key: '),
    YOUTUBE_CLIENT_ID: await question('YouTube Client ID: '),
    YOUTUBE_CLIENT_SECRET: await question('YouTube Client Secret: '),
    YOUTUBE_CHANNEL_ID: await question('Your YouTube Channel ID: '),
    BOT_NAME: await question('Bot Name (default: GameBuddy): ') || 'GameBuddy',
    OWNER_USERNAME: await question('Your YouTube Display Name (optional): '),
    STREAM_START_HOUR: await question('Stream Start Hour (0-23, default: 18): ') || '18',
    STREAM_END_HOUR: await question('Stream End Hour (0-23, default: 23): ') || '23'
  };

  // Validate required fields
  const required = ['YOUTUBE_API_KEY', 'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_CHANNEL_ID'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    console.log('\n❌ Missing required fields:');
    missing.forEach(field => console.log(`   - ${field}`));
    console.log('\nPlease provide all required information.');
    rl.close();
    return;
  }

  // Validate hours
  const startHour = parseInt(config.STREAM_START_HOUR);
  const endHour = parseInt(config.STREAM_END_HOUR);
  
  if (isNaN(startHour) || startHour < 0 || startHour > 23) {
    console.log('❌ Invalid start hour. Must be between 0-23.');
    rl.close();
    return;
  }
  
  if (isNaN(endHour) || endHour < 0 || endHour > 23) {
    console.log('❌ Invalid end hour. Must be between 0-23.');
    rl.close();
    return;
  }

  // Create .env file
  let envContent = '# YouTube API Configuration (Required)\n';
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  });

  // Add optional configurations
  envContent += '\n# Optional configurations\n';
  envContent += '# MODERATORS=Mod1,Mod2\n';
  envContent += '# OAUTH_TOKENS={"access_token":"...","refresh_token":"..."}\n';
  envContent += '# LOG_LEVEL=info\n';
  envContent += '# NODE_ENV=production\n';
  envContent += '# MAX_RESPONSES_PER_HOUR=30\n';
  envContent += '# ENABLE_DEBUG_MODE=false\n';

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Setup completed!');
  console.log(`📄 Configuration saved to .env`);
  console.log('\n📋 Configuration Summary:');
  console.log(`   🤖 Bot Name: ${config.BOT_NAME}`);
  console.log(`   📺 Channel ID: ${config.YOUTUBE_CHANNEL_ID}`);
  console.log(`   ⏰ Streaming Hours: ${config.STREAM_START_HOUR}:00 - ${config.STREAM_END_HOUR}:00`);
  console.log(`   👤 Owner: ${config.OWNER_USERNAME || 'Not set'}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Run "npm run get-tokens" to get OAuth tokens (optional, for sending messages)');
  console.log('2. Run "npm run dev" to test locally');
  console.log('3. Deploy to Railway using: npm run deploy');
  
  console.log('\n💡 Tips:');
  console.log('- OAuth tokens are only needed if you want the bot to send messages');
  console.log('- The bot will work in read-only mode without OAuth tokens');
  console.log('- You can add moderators later by setting MODERATORS in .env');
  console.log('- Check the Railway deployment guide for detailed instructions');

  rl.close();
}

// Validation functions
function validateApiKey(key) {
  return key && key.startsWith('AIza') && key.length > 30;
}

function validateClientId(id) {
  return id && id.includes('.googleusercontent.com');
}

function validateChannelId(id) {
  return id && (id.startsWith('UC') || id.startsWith('@'));
}

// Help function
function showHelp() {
  console.log(`
🤖 Smart YouTube Chat Bot Setup Help

Required Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. YouTube API Key
   - Go to: https://console.cloud.google.com/
   - Create project → Enable YouTube Data API v3
   - Create API Key credential
   - Format: AIzaSyC...

2. YouTube Client ID & Secret  
   - In same Google Cloud project
   - Create OAuth 2.0 Client ID (Desktop application)
   - Format: 123456789-xxx.apps.googleusercontent.com

3. YouTube Channel ID
   - Your channel ID (starts with UC...)
   - Find at: YouTube Studio → Settings → Channel → Basic Info
   - Or use: https://www.youtube.com/account_advanced

Optional Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Bot Name: Display name for your bot (default: GameBuddy)
- Owner Username: Your YouTube display name for admin commands
- Streaming Hours: When bot should monitor for streams (default: 18-23)

For detailed setup instructions, see: docs/DEPLOYMENT.md
`);
}

// Advanced setup with validation
async function advancedSetup() {
  console.log('🔧 Advanced Setup Mode\n');

  const config = {};

  // YouTube API Key with validation
  while (true) {
    config.YOUTUBE_API_KEY = await question('YouTube API Key: ');
    if (validateApiKey(config.YOUTUBE_API_KEY)) {
      console.log('   ✅ Valid API key format');
      break;
    } else {
      console.log('   ❌ Invalid API key format. Should start with "AIza" and be 30+ characters');
    }
  }

  // YouTube Client ID with validation
  while (true) {
    config.YOUTUBE_CLIENT_ID = await question('YouTube Client ID: ');
    if (validateClientId(config.YOUTUBE_CLIENT_ID)) {
      console.log('   ✅ Valid Client ID format');
      break;
    } else {
      console.log('   ❌ Invalid Client ID format. Should end with ".googleusercontent.com"');
    }
  }

  // YouTube Client Secret
  config.YOUTUBE_CLIENT_SECRET = await question('YouTube Client Secret: ');

  // Channel ID with validation
  while (true) {
    config.YOUTUBE_CHANNEL_ID = await question('Your YouTube Channel ID: ');
    if (validateChannelId(config.YOUTUBE_CHANNEL_ID)) {
      console.log('   ✅ Valid Channel ID format');
      break;
    } else {
      console.log('   ❌ Invalid Channel ID format. Should start with "UC" or "@"');
      const help = await question('   Need help finding your Channel ID? (y/N): ');
      if (help.toLowerCase() === 'y') {
        console.log(`
   🔍 How to find your Channel ID:
   1. Go to YouTube Studio (https://studio.youtube.com)
   2. Click Settings → Channel → Basic Info
   3. Copy the Channel ID (starts with UC...)
   
   Alternative method:
   1. Go to your channel page
   2. View page source (Ctrl+U)
   3. Search for "channelId"
        `);
      }
    }
  }

  // Optional configurations
  config.BOT_NAME = await question('Bot Name (default: GameBuddy): ') || 'GameBuddy';
  config.OWNER_USERNAME = await question('Your YouTube Display Name (for admin commands): ');

  const moderators = await question('Moderator usernames (comma-separated): ');
  if (moderators) config.MODERATORS = moderators;

  // Streaming schedule
  while (true) {
    config.STREAM_START_HOUR = await question('Stream Start Hour (0-23, default: 18): ') || '18';
    const hour = parseInt(config.STREAM_START_HOUR);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      break;
    } else {
      console.log('   ❌ Invalid hour. Must be between 0-23');
    }
  }

  while (true) {
    config.STREAM_END_HOUR = await question('Stream End Hour (0-23, default: 23): ') || '23';
    const hour = parseInt(config.STREAM_END_HOUR);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      break;
    } else {
      console.log('   ❌ Invalid hour. Must be between 0-23');
    }
  }

  // Performance settings
  const performanceSetup = await question('Configure performance settings? (y/N): ');
  if (performanceSetup.toLowerCase() === 'y') {
    config.MAX_RESPONSES_PER_HOUR = await question('Max responses per hour (default: 30): ') || '30';
    config.GLOBAL_RESPONSE_COOLDOWN = await question('Global response cooldown in ms (default: 8000): ') || '8000';
    config.USER_RESPONSE_COOLDOWN = await question('User response cooldown in ms (default: 30000): ') || '30000';
  }

  // Debug mode
  const debugMode = await question('Enable debug mode? (y/N): ');
  if (debugMode.toLowerCase() === 'y') {
    config.ENABLE_DEBUG_MODE = 'true';
    config.LOG_LEVEL = 'debug';
  }

  return config;
}

// Create directory structure
function createDirectoryStructure() {
  const dirs = [
    'src/bot',
    'src/config', 
    'src/utils',
    'src/services',
    'public',
    'logs',
    'tests/unit',
    'tests/integration',
    'docs',
    'scripts'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    rl.close();
    return;
  }

  if (args.includes('--advanced')) {
    const config = await advancedSetup();
    saveConfiguration(config);
  } else if (args.includes('--dirs')) {
    createDirectoryStructure();
    console.log('✅ Directory structure created');
  } else {
    await setup();
  }
}

function saveConfiguration(config) {
  const envPath = path.join(process.cwd(), '.env');
  
  let envContent = '# YouTube API Configuration (Required)\n';
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  });

  // Add commented optional configurations
  envContent += '\n# Additional optional configurations\n';
  envContent += '# OAUTH_TOKENS={"access_token":"...","refresh_token":"..."}\n';
  envContent += '# NODE_ENV=production\n';
  envContent += '# PORT=3000\n';

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Advanced setup completed!');
  console.log(`📄 Configuration saved to .env`);
  displayConfigSummary(config);
  showNextSteps();
}

function displayConfigSummary(config) {
  console.log('\n📋 Configuration Summary:');
  console.log(`   🤖 Bot Name: ${config.BOT_NAME}`);
  console.log(`   📺 Channel ID: ${config.YOUTUBE_CHANNEL_ID}`);
  console.log(`   ⏰ Streaming Hours: ${config.STREAM_START_HOUR}:00 - ${config.STREAM_END_HOUR}:00`);
  console.log(`   👤 Owner: ${config.OWNER_USERNAME || 'Not set'}`);
  console.log(`   👥 Moderators: ${config.MODERATORS || 'None'}`);
  console.log(`   🛡️ Max Responses/Hour: ${config.MAX_RESPONSES_PER_HOUR || '30'}`);
  console.log(`   🐛 Debug Mode: ${config.ENABLE_DEBUG_MODE || 'false'}`);
}

function showNextSteps() {
  console.log('\n🎯 Next Steps:');
  console.log('1. Test configuration: npm run dev');
  console.log('2. Get OAuth tokens: npm run get-tokens (optional)');
  console.log('3. Deploy to Railway: npm run deploy');
  
  console.log('\n📚 Documentation:');
  console.log('- Setup Guide: docs/DEPLOYMENT.md');
  console.log('- API Reference: docs/API.md');
  console.log('- Configuration: docs/CONFIGURATION.md');
  
  console.log('\n🆘 Need Help?');
  console.log('- Run: npm run setup -- --help');
  console.log('- Check the docs/ folder for detailed guides');
  console.log('- Visit: https://github.com/yourusername/smart-youtube-bot');
}

// Handle errors gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled by user');
  rl.close();
  process.exit(0);
});

// Run the setup
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
  });
}

module.exports = { setup, advancedSetup, createDirectoryStructure };