/**
 * Rate limiting utility for managing response frequency
 */

const logger = require('./logger');

class RateLimiter {
  constructor(config = {}) {
    this.maxResponsesPerHour = config.maxResponsesPerHour || 30;
    this.globalCooldown = config.globalCooldown || 8000;
    this.userCooldown = config.userCooldown || 30000;
    
    this.lastGlobalResponse = 0;
    this.userResponses = new Map();
    this.hourlyResponses = [];
    
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  canRespond(userId = 'global') {
    const now = Date.now();
    
    // Check global cooldown
    if (now - this.lastGlobalResponse < this.globalCooldown) {
      return { allowed: false, reason: 'global_cooldown' };
    }
    
    // Check hourly limit
    if (this.getHourlyResponseCount() >= this.maxResponsesPerHour) {
      return { allowed: false, reason: 'hourly_limit' };
    }
    
    // Check user-specific cooldown
    const lastUserResponse = this.userResponses.get(userId);
    if (lastUserResponse && now - lastUserResponse < this.userCooldown) {
      return { allowed: false, reason: 'user_cooldown' };
    }
    
    return { allowed: true };
  }

  recordResponse(userId = 'global') {
    const now = Date.now();
    
    this.lastGlobalResponse = now;
    this.userResponses.set(userId, now);
    this.hourlyResponses.push(now);
    
    logger.debug(`Response recorded for user: ${userId}`);
  }

  getHourlyResponseCount() {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour in milliseconds
    
    // Filter responses from the last hour
    this.hourlyResponses = this.hourlyResponses.filter(time => time > oneHourAgo);
    
    return this.hourlyResponses.length;
  }

  getStats() {
    return {
      hourlyResponses: this.getHourlyResponseCount(),
      maxHourlyResponses: this.maxResponsesPerHour,
      activeUsers: this.userResponses.size,
      globalCooldown: this.globalCooldown,
      userCooldown: this.userCooldown
    };
  }

  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Clean up old hourly responses
    this.hourlyResponses = this.hourlyResponses.filter(time => time > oneHourAgo);
    
    // Clean up old user responses
    for (const [userId, timestamp] of this.userResponses.entries()) {
      if (timestamp < oneHourAgo) {
        this.userResponses.delete(userId);
      }
    }
    
    logger.debug('Rate limiter cleanup completed');
  }

  reset() {
    this.lastGlobalResponse = 0;
    this.userResponses.clear();
    this.hourlyResponses = [];
    
    logger.info('Rate limiter reset');
  }
}

module.exports = RateLimiter;