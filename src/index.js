#!/usr/bin/env node

/**
 * Smart YouTube Chat Bot
 * Entry point for the application
 */

require('dotenv').config();
const logger = require('./utils/logger');
const config = require('./config');
const SmartYouTubeChatBot = require('./bot/SmartYouTubeChatBot');

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown handlers
let botInstance = null;

const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal} - Starting graceful shutdown...`);
  
  if (botInstance) {
    botInstance.gracefulShutdown();
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Main function
async function main() {
  try {
    logger.info('🚀 Starting Smart YouTube Chat Bot...');
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Version: ${require('../package.json').version}`);
    
    // Validate configuration
    config.validate();
    
    // Initialize bot
    botInstance = new SmartYouTubeChatBot(config);
    
    // Start monitoring
    await botInstance.start();
    
    logger.info('✅ Smart YouTube Chat Bot started successfully!');
    
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}

module.exports = { main };