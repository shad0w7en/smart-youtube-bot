/**
 * Owner and permission detection system
 */

const logger = require('../utils/logger');
const constants = require('../config/constants');

class OwnerDetection {
  constructor(config) {
    this.config = config;
    this.ownerChannelId = config.YOUTUBE_CHANNEL_ID;
    this.ownerUsernames = this.parseOwnerUsernames();
    this.moderators = this.parseModerators();
    
    logger.debug(`Owner detection initialized with ${this.ownerUsernames.length} usernames and ${this.moderators.length} moderators`);
  }

  parseOwnerUsernames() {
    if (!this.config.OWNER_USERNAME) return [];
    return this.config.OWNER_USERNAME
      .split(',')
      .map(name => name.trim().toLowerCase())
      .filter(name => name.length > 0);
  }

  parseModerators() {
    if (!this.config.MODERATORS) return [];
    return this.config.MODERATORS
      .split(',')
      .map(name => name.trim().toLowerCase())
      .filter(name => name.length > 0);
  }

  isOwnerOrAdmin(message) {
    try {
      const author = message.authorDetails;
      if (!author) return false;

      // Method 1: Channel owner (most reliable)
      if (author.channelId === this.ownerChannelId) {
        logger.debug(`Owner detected via channel ID: ${author.displayName}`);
        return true;
      }
      
      // Method 2: YouTube's chat owner flag
      if (author.isChatOwner === true) {
        logger.debug(`Owner detected via chat owner flag: ${author.displayName}`);
        return true;
      }
      
      // Method 3: Username matching (case-insensitive)
      const displayName = author.displayName?.toLowerCase() || '';
      if (this.ownerUsernames.length > 0) {
        const usernameMatch = this.ownerUsernames.some(username => 
          displayName === username || displayName.includes(username)
        );
        if (usernameMatch) {
          logger.debug(`Owner detected via username match: ${author.displayName}`);
          return true;
        }
      }
      
      // Method 4: Moderator list
      if (this.moderators.length > 0) {
        const moderatorMatch = this.moderators.some(mod => displayName === mod);
        if (moderatorMatch) {
          logger.debug(`Moderator detected: ${author.displayName}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error in owner detection:', error.message);
      return false;
    }
  }

  getUserPermissionLevel(message) {
    try {
      const author = message.authorDetails;
      if (!author) return constants.PERMISSION_LEVELS.USER;

      // Check for owner status
      if (author.channelId === this.ownerChannelId || author.isChatOwner) {
        return constants.PERMISSION_LEVELS.OWNER;
      }
      
      // Check username-based owner detection
      const displayName = author.displayName?.toLowerCase() || '';
      if (this.ownerUsernames.length > 0) {
        const usernameMatch = this.ownerUsernames.some(username => 
          displayName === username || displayName.includes(username)
        );
        if (usernameMatch) {
          return constants.PERMISSION_LEVELS.OWNER;
        }
      }
      
      // Check for moderator status
      if (this.moderators.length > 0) {
        const moderatorMatch = this.moderators.some(mod => displayName === mod);
        if (moderatorMatch) {
          return constants.PERMISSION_LEVELS.MODERATOR;
        }
      }
      
      // Check for verified status
      if (author.isVerified) {
        return constants.PERMISSION_LEVELS.VERIFIED;
      }
      
      return constants.PERMISSION_LEVELS.USER;
    } catch (error) {
      logger.error('Error getting permission level:', error.message);
      return constants.PERMISSION_LEVELS.USER;
    }
  }

  getDetectionDetails(message) {
    try {
      const author = message.authorDetails;
      if (!author) return null;

      return {
        displayName: author.displayName,
        channelId: author.channelId,
        isChatOwner: author.isChatOwner,
        isVerified: author.isVerified,
        badges: author.badges || [],
        permissionLevel: this.getUserPermissionLevel(message),
        isOwnerOrAdmin: this.isOwnerOrAdmin(message),
        detectionMethods: this.getDetectionMethods(message)
      };
    } catch (error) {
      logger.error('Error getting detection details:', error.message);
      return null;
    }
  }

  getDetectionMethods(message) {
    const methods = [];
    const author = message.authorDetails;
    
    if (!author) return methods;

    if (author.channelId === this.ownerChannelId) {
      methods.push('channel_id');
    }
    
    if (author.isChatOwner) {
      methods.push('chat_owner_flag');
    }
    
    const displayName = author.displayName?.toLowerCase() || '';
    if (this.ownerUsernames.some(username => 
      displayName === username || displayName.includes(username)
    )) {
      methods.push('username_match');
    }
    
    if (this.moderators.some(mod => displayName === mod)) {
      methods.push('moderator_list');
    }
    
    if (author.isVerified) {
      methods.push('verified_channel');
    }
    
    return methods;
  }

  logDetectionDetails(message) {
    if (this.config.ENABLE_DEBUG_MODE) {
      const details = this.getDetectionDetails(message);
      if (details) {
        logger.debug('🔍 Owner Detection Analysis:', details);
      }
    }
  }

  // Test detection methods (for debugging)
  testDetection(testCases) {
    logger.info('🧪 Testing owner detection methods...');
    
    testCases.forEach((testCase, index) => {
      const mockMessage = {
        authorDetails: testCase
      };
      
      const result = {
        input: testCase,
        isOwnerOrAdmin: this.isOwnerOrAdmin(mockMessage),
        permissionLevel: this.getUserPermissionLevel(mockMessage),
        detectionMethods: this.getDetectionMethods(mockMessage)
      };
      
      logger.info(`Test ${index + 1}:`, result);
    });
  }

  // Update configuration at runtime
  updateOwnerUsernames(newUsernames) {
    this.config.OWNER_USERNAME = newUsernames;
    this.ownerUsernames = this.parseOwnerUsernames();
    logger.info(`Updated owner usernames: ${this.ownerUsernames.join(', ')}`);
  }

  updateModerators(newModerators) {
    this.config.MODERATORS = newModerators;
    this.moderators = this.parseModerators();
    logger.info(`Updated moderators: ${this.moderators.join(', ')}`);
  }

  // Get configuration status
  getStatus() {
    return {
      ownerChannelId: this.ownerChannelId,
      ownerUsernames: this.ownerUsernames,
      moderators: this.moderators,
      hasOwnerConfig: this.ownerUsernames.length > 0,
      hasModeratorConfig: this.moderators.length > 0
    };
  }
}

module.exports = OwnerDetection;