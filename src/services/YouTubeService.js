/**
 * YouTube API service for managing all YouTube interactions
 */

const { google } = require('googleapis');
const logger = require('../utils/logger');
const constants = require('../config/constants');

class YouTubeService {
  constructor(config, quotaManager) {
    this.config = config;
    this.quotaManager = quotaManager;
    this.youtube = google.youtube('v3');
    this.oauth2Client = this.setupOAuth();
  }

  setupOAuth() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.config.YOUTUBE_CLIENT_ID,
        this.config.YOUTUBE_CLIENT_SECRET,
        'urn:ietf:wg:oauth:2.0:oob'
      );
      
      if (this.config.OAUTH_TOKENS) {
        const tokens = JSON.parse(this.config.OAUTH_TOKENS);
        oauth2Client.setCredentials(tokens);
        logger.info('✅ OAuth tokens loaded successfully');
      } else {
        logger.warn('⚠️ No OAuth tokens found. Message sending disabled.');
      }
      
      return oauth2Client;
    } catch (error) {
      logger.error('❌ Failed to setup OAuth:', error.message);
      return null;
    }
  }

  async checkForLiveStream() {
    if (!this.quotaManager.canMakeApiCall('SEARCH')) {
      throw new Error('Quota limit reached for stream search');
    }

    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId: this.config.YOUTUBE_CHANNEL_ID,
        eventType: 'live',
        type: 'video',
        key: this.config.YOUTUBE_API_KEY,
        maxResults: 1,
        auth: null // Use API key, not OAuth
      });

      this.quotaManager.trackApiCall('SEARCH', true);

      if (response.data.items && response.data.items.length > 0) {
        const stream = response.data.items[0];
        return {
          videoId: stream.id.videoId,
          title: stream.snippet.title,
          description: stream.snippet.description,
          thumbnail: stream.snippet.thumbnails?.medium?.url
        };
      }

      return null;
    } catch (error) {
      this.quotaManager.trackApiCall('SEARCH', false);
      logger.error('Error checking for live stream:', error.message);
      throw error;
    }
  }

  async getLiveChatId(videoId) {
    if (!this.quotaManager.canMakeApiCall('VIDEO_LIST')) {
      throw new Error('Quota limit reached for video details');
    }

    try {
      const response = await this.youtube.videos.list({
        part: ['liveStreamingDetails'],
        id: [videoId],
        key: this.config.YOUTUBE_API_KEY,
        auth: null
      });

      this.quotaManager.trackApiCall('VIDEO_LIST', true);

      if (response.data.items && response.data.items.length > 0) {
        const liveChatId = response.data.items[0].liveStreamingDetails?.activeLiveChatId;
        if (liveChatId) {
          logger.info('✅ Live chat ID obtained');
          return liveChatId;
        } else {
          logger.warn('⚠️ Live chat not available for this stream');
          return null;
        }
      }

      return null;
    } catch (error) {
      this.quotaManager.trackApiCall('VIDEO_LIST', false);
      logger.error('Error getting live chat ID:', error.message);
      throw error;
    }
  }

  async getChatMessages(liveChatId, pageToken = null) {
    if (!this.quotaManager.canMakeApiCall('CHAT_LIST')) {
      throw new Error('Quota limit reached for chat messages');
    }

    try {
      const response = await this.youtube.liveChatMessages.list({
        liveChatId: liveChatId,
        part: ['snippet', 'authorDetails'],
        pageToken: pageToken,
        auth: this.oauth2Client || null
      });

      this.quotaManager.trackApiCall('CHAT_LIST', true);

      return {
        messages: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
        pollingIntervalMillis: response.data.pollingIntervalMillis
      };
    } catch (error) {
      this.quotaManager.trackApiCall('CHAT_LIST', false);
      logger.error('Error getting chat messages:', error.message);
      throw error;
    }
  }

  async sendMessage(liveChatId, messageText) {
    if (!this.quotaManager.canMakeApiCall('CHAT_INSERT')) {
      throw new Error('Quota limit reached for sending messages');
    }

    if (!this.canSendMessages()) {
      throw new Error('OAuth tokens not configured for message sending');
    }

    try {
      await this.youtube.liveChatMessages.insert({
        part: ['snippet'],
        auth: this.oauth2Client,
        requestBody: {
          snippet: {
            liveChatId: liveChatId,
            type: 'textMessageEvent',
            textMessageDetails: {
              messageText: messageText
            }
          }
        }
      });

      this.quotaManager.trackApiCall('CHAT_INSERT', true);
      logger.debug(`📤 Message sent: ${messageText}`);
    } catch (error) {
      this.quotaManager.trackApiCall('CHAT_INSERT', false);
      logger.error('Error sending message:', error.message);
      throw error;
    }
  }

  canSendMessages() {
    return !!(this.oauth2Client && this.config.OAUTH_TOKENS);
  }

  getApiUsageStats() {
    return this.quotaManager.getQuotaStatus();
  }

  // Helper method to refresh OAuth tokens if needed
  async refreshTokensIfNeeded() {
    if (!this.oauth2Client) return false;

    try {
      const credentials = this.oauth2Client.credentials;
      if (credentials.expiry_date && Date.now() >= credentials.expiry_date) {
        logger.info('🔄 Refreshing OAuth tokens...');
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(newCredentials);
        logger.info('✅ OAuth tokens refreshed successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('❌ Failed to refresh OAuth tokens:', error.message);
      return false;
    }
  }
}

module.exports = YouTubeService;