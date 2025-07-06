/**
 * Configuration management with validation
 */

const logger = require('../utils/logger');

class Config {
  constructor() {
    this.loadConfiguration();
  }

  loadConfiguration() {
    // YouTube API Configuration
    this.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    this.YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
    this.YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
    this.YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
    
    // Bot Configuration
    this.BOT_NAME = process.env.BOT_NAME || 'GameBuddy';
    this.OWNER_USERNAME = process.env.OWNER_USERNAME || '';
    this.MODERATORS = process.env.MODERATORS || '';
    
    // Streaming Schedule
    this.STREAM_START_HOUR = parseInt(process.env.STREAM_START_HOUR) || 18;
    this.STREAM_END_HOUR = parseInt(process.env.STREAM_END_HOUR) || 23;
    
    // OAuth Tokens
    this.OAUTH_TOKENS = process.env.OAUTH_TOKENS || null;
    
    // Server Configuration
    this.PORT = parseInt(process.env.PORT) || 3000;
    this.NODE_ENV = process.env.NODE_ENV || 'development';
    
    // Rate Limiting
    this.MAX_RESPONSES_PER_HOUR = parseInt(process.env.MAX_RESPONSES_PER_HOUR) || 30;
    this.GLOBAL_RESPONSE_COOLDOWN = parseInt(process.env.GLOBAL_RESPONSE_COOLDOWN) || 8000;
    this.USER_RESPONSE_COOLDOWN = parseInt(process.env.USER_RESPONSE_COOLDOWN) || 30000;
    
    // Feature Flags
    this.ENABLE_DEBUG_MODE = process.env.ENABLE_DEBUG_MODE === 'true';
    this.ENABLE_GAME_DETECTION = process.env.ENABLE_GAME_DETECTION !== 'false';
    this.ENABLE_CONTEXT_TRACKING = process.env.ENABLE_CONTEXT_TRACKING !== 'false';
    
    // Deployment
    this.RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;
    this.RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
    
    // Logging
    this.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
    this.LOG_FILE = process.env.LOG_FILE || 'logs/bot.log';
  }

  validate() {
    const required = [
      'YOUTUBE_API_KEY',
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_CHANNEL_ID'
    ];

    logger.info('🔍 Validating configuration...');

    const missing = required.filter(key => !this[key]);

    if (missing.length > 0) {
      const error = `Missing required configuration: ${missing.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('✅ Configuration validation passed');

    // Log configuration status
    this.logConfigurationStatus();
  }

  logConfigurationStatus() {
    const features = {
      'Message Sending': !!this.OAUTH_TOKENS,
      'Owner Commands': !!this.OWNER_USERNAME,
      'Moderator Support': !!this.MODERATORS,
      'Game Detection': this.ENABLE_GAME_DETECTION,
      'Context Tracking': this.ENABLE_CONTEXT_TRACKING,
      'Debug Mode': this.ENABLE_DEBUG_MODE
    };

    logger.info('📋 Feature Status:');
    Object.entries(features).forEach(([feature, enabled]) => {
      logger.info(`   ${enabled ? '✅' : '❌'} ${feature}`);
    });

    logger.info(`⏰ Streaming Hours: ${this.STREAM_START_HOUR}:00 - ${this.STREAM_END_HOUR}:00`);
    logger.info(`🛡️ Rate Limits: ${this.MAX_RESPONSES_PER_HOUR}/hour, ${this.GLOBAL_RESPONSE_COOLDOWN}ms cooldown`);
  }

  // Helper methods
  isProduction() {
    return this.NODE_ENV === 'production';
  }

  isDevelopment() {
    return this.NODE_ENV === 'development';
  }

  getStreamingHours() {
    return {
      start: this.STREAM_START_HOUR,
      end: this.STREAM_END_HOUR
    };
  }

  getRateLimits() {
    return {
      maxResponsesPerHour: this.MAX_RESPONSES_PER_HOUR,
      globalCooldown: this.GLOBAL_RESPONSE_COOLDOWN,
      userCooldown: this.USER_RESPONSE_COOLDOWN
    };
  }

  getDeploymentUrl() {
    return this.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${this.RAILWAY_PUBLIC_DOMAIN}`
      : this.RENDER_EXTERNAL_URL
      ? this.RENDER_EXTERNAL_URL
      : `http://localhost:${this.PORT}`;
  }
}

module.exports = new Config();