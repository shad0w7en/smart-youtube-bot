/**
 * YouTube API quota management utility
 */

const logger = require('./logger');
const constants = require('../config/constants');

class QuotaManager {
  constructor() {
    this.dailyQuotaUsed = 0;
    this.quotaResetTime = this.getNextQuotaReset();
    this.quotaHistory = [];
    
    // Check for quota reset every hour
    setInterval(() => this.checkQuotaReset(), 3600000);
  }

  getNextQuotaReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  checkQuotaReset() {
    const now = new Date();
    
    if (now >= this.quotaResetTime) {
      logger.info(`🔄 Daily quota reset - Previous usage: ${this.dailyQuotaUsed}/${constants.YOUTUBE_API.DAILY_QUOTA_LIMIT}`);
      
      this.dailyQuotaUsed = 0;
      this.quotaResetTime = this.getNextQuotaReset();
      this.quotaHistory = [];
    }
  }

  canMakeApiCall(operationType) {
    this.checkQuotaReset();
    
    const cost = constants.YOUTUBE_API.COSTS[operationType.toUpperCase()] || 1;
    const projectedUsage = this.dailyQuotaUsed + cost;
    
    if (projectedUsage > constants.YOUTUBE_API.SAFE_QUOTA_LIMIT) {
      logger.warn(`⚠️ API call blocked - Would exceed safe quota limit. Current: ${this.dailyQuotaUsed}, Cost: ${cost}, Limit: ${constants.YOUTUBE_API.SAFE_QUOTA_LIMIT}`);
      return false;
    }
    
    return true;
  }

  trackApiCall(operationType, success = true) {
    const cost = constants.YOUTUBE_API.COSTS[operationType.toUpperCase()] || 1;
    
    if (success) {
      this.dailyQuotaUsed += cost;
      
      this.quotaHistory.push({
        timestamp: Date.now(),
        operation: operationType,
        cost: cost,
        success: true
      });
      
      logger.debug(`📊 API quota used: ${cost} units for ${operationType}. Total: ${this.dailyQuotaUsed}/${constants.YOUTUBE_API.DAILY_QUOTA_LIMIT}`);
      
      // Warning at 70% usage
      if (this.dailyQuotaUsed > constants.YOUTUBE_API.DAILY_QUOTA_LIMIT * 0.7) {
        logger.warn(`⚠️ High quota usage: ${this.dailyQuotaUsed}/${constants.YOUTUBE_API.DAILY_QUOTA_LIMIT} (${Math.round((this.dailyQuotaUsed / constants.YOUTUBE_API.DAILY_QUOTA_LIMIT) * 100)}%)`);
      }
    } else {
      this.quotaHistory.push({
        timestamp: Date.now(),
        operation: operationType,
        cost: 0,
        success: false
      });
      
      logger.error(`❌ API call failed: ${operationType}`);
    }
    
    // Keep only last 100 entries
    if (this.quotaHistory.length > 100) {
      this.quotaHistory = this.quotaHistory.slice(-100);
    }
  }

  getQuotaStatus() {
    const percentUsed = (this.dailyQuotaUsed / constants.YOUTUBE_API.DAILY_QUOTA_LIMIT) * 100;
    const remaining = constants.YOUTUBE_API.DAILY_QUOTA_LIMIT - this.dailyQuotaUsed;
    const timeToReset = this.quotaResetTime.getTime() - Date.now();
    
    return {
      used: this.dailyQuotaUsed,
      limit: constants.YOUTUBE_API.DAILY_QUOTA_LIMIT,
      remaining: remaining,
      percentUsed: Math.round(percentUsed * 100) / 100,
      resetTime: this.quotaResetTime.toISOString(),
      timeToResetMs: timeToReset,
      safeLimit: constants.YOUTUBE_API.SAFE_QUOTA_LIMIT,
      isNearLimit: this.dailyQuotaUsed > constants.YOUTUBE_API.SAFE_QUOTA_LIMIT * 0.8
    };
  }

  getQuotaHistory() {
    return this.quotaHistory.slice(-20); // Last 20 operations
  }

  estimateRemainingCalls(operationType) {
    const cost = constants.YOUTUBE_API.COSTS[operationType.toUpperCase()] || 1;
    const remaining = constants.YOUTUBE_API.SAFE_QUOTA_LIMIT - this.dailyQuotaUsed;
    return Math.floor(remaining / cost);
  }
}

module.exports = QuotaManager;