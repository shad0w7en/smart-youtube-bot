/**
 * Smart YouTube Chat Bot - Main orchestrator class
 * Coordinates all bot components and manages the overall bot lifecycle
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');
const QuotaManager = require('../utils/quotaManager');
const YouTubeService = require('../services/YouTubeService');
const WebServer = require('../services/WebServer');
const OwnerDetection = require('./OwnerDetection');
const MessageAnalyzer = require('./MessageAnalyzer');
const ResponseGenerator = require('./ResponseGenerator');
const GameDetector = require('./GameDetector');
const constants = require('../config/constants');

class SmartYouTubeChatBot extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = config;
    this.state = this.initializeState();
    this.context = this.initializeContext();
    
    // Initialize components
    this.rateLimiter = new RateLimiter(config.getRateLimits());
    this.quotaManager = new QuotaManager();
    this.youtubeService = new YouTubeService(config, this.quotaManager);
    this.ownerDetection = new OwnerDetection(config);
    this.messageAnalyzer = new MessageAnalyzer();
    this.responseGenerator = new ResponseGenerator();
    this.gameDetector = new GameDetector();
    this.webServer = new WebServer(config, this);
    
    // Monitoring intervals
    this.intervals = {
      streamCheck: null,
      contextCleanup: null,
      keepAlive: null
    };
    
    this.setupEventListeners();
    
    logger.info('🤖 SmartYouTubeChatBot initialized');
  }

  initializeState() {
    return {
      isRunning: false,
      isMonitoring: false,
      videoId: null,
      liveChatId: null,
      nextPageToken: null,
      consecutiveErrors: 0,
      maxConsecutiveErrors: 5,
      lastResponseTime: 0,
      startTime: Date.now()
    };
  }

  initializeContext() {
    return {
      currentGame: null,
      gameState: constants.GAME_STATES.UNKNOWN,
      chatMood: constants.CHAT_MOODS.NEUTRAL,
      streamerMood: constants.CHAT_MOODS.NEUTRAL,
      messageHistory: [],
      topicHistory: [],
      recentEvents: []
    };
  }

  setupEventListeners() {
    this.on('streamStarted', this.handleStreamStarted.bind(this));
    this.on('streamEnded', this.handleStreamEnded.bind(this));
    this.on('chatConnected', this.handleChatConnected.bind(this));
    this.on('messageReceived', this.handleMessageReceived.bind(this));
    this.on('messageSent', this.handleMessageSent.bind(this));
    this.on('error', this.handleError.bind(this));
    
    logger.debug('Event listeners registered');
  }

  async start() {
    try {
      logger.info('🚀 Starting bot monitoring...');
      
      // Start web server
      await this.webServer.start();
      
      // Start YouTube monitoring
      await this.startMonitoring();
      
      // Setup cleanup intervals
      this.setupCleanupIntervals();
      
      this.state.isMonitoring = true;
      this.emit('botStarted');
      
      logger.info('✅ Bot started successfully');
      
    } catch (error) {
      logger.error('❌ Failed to start bot:', error);
      throw error;
    }
  }

  async startMonitoring() {
    // Initial stream check
    const isStreaming = await this.checkForStream();
    if (isStreaming) {
      await this.connectToChat();
    }
    
    // Setup periodic monitoring (every 45 minutes)
    this.intervals.streamCheck = setInterval(async () => {
      try {
        const isStreaming = await this.checkForStream();
        if (isStreaming && !this.state.isRunning) {
          await this.connectToChat();
        }
      } catch (error) {
        logger.error('Error in monitoring interval:', error);
        this.handleError(error);
      }
    }, constants.INTERVALS.STREAM_CHECK);
    
    logger.info(`🔄 Stream monitoring started (checking every ${constants.INTERVALS.STREAM_CHECK / 60000} minutes)`);
  }

  async checkForStream() {
    if (!this.quotaManager.canMakeApiCall('SEARCH')) {
      logger.warn('⚠️ Skipping stream check - quota limit reached');
      return false;
    }
    
    if (!this.isStreamingTime()) {
      logger.debug('😴 Outside streaming hours, skipping check');
      return false;
    }

    try {
      const streamInfo = await this.youtubeService.checkForLiveStream();
      
      if (streamInfo) {
        if (streamInfo.videoId !== this.state.videoId) {
          this.state.videoId = streamInfo.videoId;
          
          // Detect game from title
          this.context.currentGame = this.gameDetector.detectGame(streamInfo.title);
          
          logger.info(`🎥 New live stream detected: ${streamInfo.title}`);
          if (this.context.currentGame) {
            logger.info(`🎮 Game detected: ${this.context.currentGame}`);
          }
          
          this.emit('streamStarted', streamInfo);
          return true;
        }
        return this.state.videoId !== null;
      } else {
        if (this.state.videoId) {
          logger.info('📺 Stream ended');
          this.emit('streamEnded');
          this.cleanup();
        }
        return false;
      }
    } catch (error) {
      logger.error('Error checking for stream:', error);
      this.state.consecutiveErrors++;
      return false;
    }
  }

  async connectToChat() {
    try {
      const liveChatId = await this.youtubeService.getLiveChatId(this.state.videoId);
      
      if (liveChatId) {
        this.state.liveChatId = liveChatId;
        this.state.isRunning = true;
        this.state.consecutiveErrors = 0;
        
        this.emit('chatConnected');
        this.startMessagePolling();
        
        logger.info('✅ Connected to live chat');
      } else {
        logger.warn('⚠️ Could not connect to live chat');
      }
    } catch (error) {
      logger.error('Error connecting to chat:', error);
      this.handleError(error);
    }
  }

  startMessagePolling() {
    this.pollMessages();
  }

  async pollMessages() {
    if (!this.state.isRunning || !this.state.liveChatId) {
      return;
    }

    if (!this.quotaManager.canMakeApiCall('CHAT_LIST')) {
      logger.warn('⚠️ Quota exhausted - pausing message polling');
      setTimeout(() => this.pollMessages(), 60000); // Wait 1 minute
      return;
    }

    try {
      const result = await this.youtubeService.getChatMessages(
        this.state.liveChatId, 
        this.state.nextPageToken
      );

      if (result.messages && result.messages.length > 0) {
        for (const message of result.messages) {
          this.emit('messageReceived', message);
        }
      }

      this.state.nextPageToken = result.nextPageToken;
      this.state.consecutiveErrors = 0;

      // Schedule next poll
      const pollInterval = Math.max(result.pollingIntervalMillis || 15000, constants.INTERVALS.MIN_POLL_INTERVAL);
      setTimeout(() => this.pollMessages(), pollInterval);

    } catch (error) {
      logger.error('Error polling messages:', error);
      this.handleError(error);

      if (error.message.includes('disabled') || error.message.includes('not found')) {
        logger.info('📺 Stream ended or chat disabled');
        this.emit('streamEnded');
        return;
      }

      // Exponential backoff for errors
      const backoffTime = Math.min(
        constants.INTERVALS.MIN_POLL_INTERVAL * Math.pow(2, this.state.consecutiveErrors),
        constants.INTERVALS.MAX_BACKOFF
      );
      setTimeout(() => this.pollMessages(), backoffTime);
    }
  }

  // Event handlers
  handleStreamStarted(streamInfo) {
    logger.info(`🎬 Stream started: ${streamInfo.title}`);
    this.updateContext('streamStarted', streamInfo);
  }

  handleStreamEnded() {
    logger.info('🔚 Stream ended');
    this.cleanup();
  }

  handleChatConnected() {
    logger.info('💬 Chat monitoring active');
  }

  async handleMessageReceived(message) {
    try {
      const author = message.authorDetails?.displayName || 'Unknown';
      const text = message.snippet?.displayMessage || '';
      
      logger.debug(`💬 ${author}: ${text}`);

      // Don't process own messages
      if (author === this.config.BOT_NAME) return;

      // Check if this is an admin command
      const isAdmin = this.ownerDetection.isOwnerOrAdmin(message);
      if (isAdmin) {
        const adminResponse = await this.handleAdminCommand(text, message);
        if (adminResponse) {
          await this.sendResponse(adminResponse, 'admin');
          return;
        }
      }

      // Rate limiting check
      const rateLimitResult = this.rateLimiter.canRespond(author);
      if (!rateLimitResult.allowed) {
        logger.debug(`Rate limit blocked response for ${author}: ${rateLimitResult.reason}`);
        return;
      }

      // Analyze message
      const analysis = this.messageAnalyzer.analyze(text, author, this.context);
      
      // Update context
      this.updateContext('messageReceived', { author, text, analysis });

      // Generate response if appropriate
      if (this.shouldRespond(analysis)) {
        const response = this.responseGenerator.generate(text, author, analysis, this.context);
        
        if (response) {
          this.rateLimiter.recordResponse(author);
          await this.sendResponse(response, analysis.responseType || 'general');
        }
      }

    } catch (error) {
      logger.error('Error handling message:', error);
      this.handleError(error);
    }
  }

  handleMessageSent(message) {
    logger.info(`🤖 ${this.config.BOT_NAME}: ${message}`);
  }

  handleError(error) {
    this.state.consecutiveErrors++;
    
    if (this.state.consecutiveErrors >= this.state.maxConsecutiveErrors) {
      logger.error(`Too many consecutive errors (${this.state.consecutiveErrors}). Stopping bot.`);
      this.stop();
    }
  }

  shouldRespond(analysis) {
    // Always respond to direct mentions and questions
    if (analysis.requiresResponse) return true;
    
    // Random engagement based on sentiment and game context
    let responseChance = 0.05; // Base 5% chance
    
    if (analysis.sentiment === 'positive') responseChance *= 2;
    if (analysis.gameRelated && this.context.currentGame) responseChance *= 1.5;
    if (this.context.chatMood === constants.CHAT_MOODS.EXCITED) responseChance *= 1.3;
    
    return Math.random() < responseChance;
  }

  async sendResponse(message, type = 'general') {
    try {
      if (!this.quotaManager.canMakeApiCall('CHAT_INSERT')) {
        logger.warn(`Would send (${type}): "${message}" (quota limit reached)`);
        return;
      }

      if (!this.youtubeService.canSendMessages()) {
        logger.warn(`Would send (${type}): "${message}" (no OAuth tokens)`);
        return;
      }

      // Add human-like delay
      const delay = Math.random() * 4000 + 1000; // 1-5 seconds
      
      setTimeout(async () => {
        try {
          await this.youtubeService.sendMessage(this.state.liveChatId, message);
          this.emit('messageSent', message);
        } catch (error) {
          logger.error('Error sending message:', error);
          this.handleError(error);
        }
      }, delay);

    } catch (error) {
      logger.error('Error in sendResponse:', error);
    }
  }

  async handleAdminCommand(text, message) {
    const command = text.toLowerCase().trim();
    const permissionLevel = this.ownerDetection.getUserPermissionLevel(message);
    
    // Owner-only commands
    if (permissionLevel === constants.PERMISSION_LEVELS.OWNER) {
      switch (command) {
        case '!shutdown':
          this.gracefulShutdown();
          return '🛑 Bot shutting down gracefully... Goodbye!';
          
        case '!restart':
          this.restart();
          return '🔄 Restarting bot systems...';
          
        case '!quota':
          const quota = this.quotaManager.getQuotaStatus();
          return `📊 Quota: ${quota.used}/${quota.limit} (${quota.percentUsed}%) | Resets: ${new Date(quota.resetTime).toLocaleTimeString()}`;
          
        case '!stats':
          return this.getStatsMessage();
          
        case '!debug':
          return this.getDebugInfo();
      }
      
      if (command.startsWith('!say ')) {
        return command.substring(5);
      }
      
      if (command.startsWith('!mood ')) {
        const mood = command.substring(6);
        this.context.streamerMood = mood;
        return `😊 Mood set to: ${mood}`;
      }
      
      if (command.startsWith('!game ')) {
        const game = command.substring(6);
        this.context.currentGame = game;
        return `🎮 Game set to: ${game}`;
      }
    }
    
    // Owner and moderator commands
    if ([constants.PERMISSION_LEVELS.OWNER, constants.PERMISSION_LEVELS.MODERATOR].includes(permissionLevel)) {
      switch (command) {
        case '!status':
          return this.getStatusMessage(permissionLevel);
          
        case '!ping':
          return `🏓 Pong! (${permissionLevel}) - ${Date.now()}ms`;
          
        case '!help':
          return this.getHelpMessage(permissionLevel);
          
        case '!context':
          return `🎮 Game: ${this.context.currentGame || 'Unknown'} | State: ${this.context.gameState} | Mood: ${this.context.chatMood}`;
      }
    }
    
    return null;
  }

  updateContext(eventType, data) {
    const timestamp = Date.now();
    
    // Add to recent events
    this.context.recentEvents.push({
      timestamp,
      type: eventType,
      data
    });
    
    // Keep only last 50 events
    if (this.context.recentEvents.length > 50) {
      this.context.recentEvents = this.context.recentEvents.slice(-50);
    }
    
    // Update specific context based on event type
    if (eventType === 'messageReceived' && data.analysis) {
      // Update chat mood based on sentiment trends
      this.updateChatMood(data.analysis.sentiment);
      
      // Add to message history
      this.context.messageHistory.push({
        timestamp,
        author: data.author,
        sentiment: data.analysis.sentiment,
        intent: data.analysis.intent,
        gameRelated: data.analysis.gameRelated
      });
      
      // Keep only last 100 messages
      if (this.context.messageHistory.length > 100) {
        this.context.messageHistory = this.context.messageHistory.slice(-100);
      }
    }
  }

  updateChatMood(sentiment) {
    const recentSentiments = this.context.messageHistory
      .slice(-10)
      .map(msg => msg.sentiment);
    
    const positiveCount = recentSentiments.filter(s => s === 'positive').length;
    const negativeCount = recentSentiments.filter(s => s === 'negative').length;
    
    if (positiveCount >= 6) {
      this.context.chatMood = constants.CHAT_MOODS.EXCITED;
    } else if (negativeCount >= 6) {
      this.context.chatMood = constants.CHAT_MOODS.FRUSTRATED;
    } else if (positiveCount >= 4) {
      this.context.chatMood = constants.CHAT_MOODS.SUPPORTIVE;
    } else {
      this.context.chatMood = constants.CHAT_MOODS.NEUTRAL;
    }
  }

  isStreamingTime() {
    const now = new Date();
    const hour = now.getHours();
    const { start, end } = this.config.getStreamingHours();
    
    if (start <= end) {
      return hour >= start && hour <= end;
    } else {
      return hour >= start || hour <= end;
    }
  }

  setupCleanupIntervals() {
    // Context cleanup every 30 minutes
    this.intervals.contextCleanup = setInterval(() => {
      this.cleanupContext();
    }, constants.INTERVALS.CONTEXT_CLEANUP);
  }

  cleanupContext() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Clean old message history
    this.context.messageHistory = this.context.messageHistory.filter(
      msg => msg.timestamp > oneHourAgo
    );
    
    // Clean old events
    this.context.recentEvents = this.context.recentEvents.filter(
      event => event.timestamp > oneHourAgo
    );
    
    logger.debug('Context cleanup completed');
  }

  cleanup() {
    this.state.videoId = null;
    this.state.liveChatId = null;
    this.state.nextPageToken = null;
    this.state.isRunning = false;
    this.state.consecutiveErrors = 0;
    
    // Reset context
    this.context.currentGame = null;
    this.context.gameState = constants.GAME_STATES.UNKNOWN;
    this.context.chatMood = constants.CHAT_MOODS.NEUTRAL;
    
    logger.info('🧹 Cleanup completed');
  }

  getStatusReport() {
    const uptime = Date.now() - this.state.startTime;
    const quotaStatus = this.quotaManager.getQuotaStatus();
    const rateLimitStats = this.rateLimiter.getStats();
    
    return {
      bot: {
        name: this.config.BOT_NAME,
        version: require('../../package.json').version,
        environment: this.config.NODE_ENV,
        uptime: Math.floor(uptime / 1000),
        uptimeFormatted: this.formatUptime(uptime)
      },
      status: {
        isRunning: this.state.isRunning,
        isMonitoring: this.state.isMonitoring,
        currentStream: this.state.videoId || 'none',
        chatConnected: !!this.state.liveChatId,
        consecutiveErrors: this.state.consecutiveErrors,
        isStreamingTime: this.isStreamingTime()
      },
      quota: quotaStatus,
      rateLimiting: rateLimitStats,
      context: {
        currentGame: this.context.currentGame || 'Unknown',
        gameState: this.context.gameState,
        chatMood: this.context.chatMood,
        streamerMood: this.context.streamerMood,
        messageHistory: this.context.messageHistory.length,
        recentEvents: this.context.recentEvents.length
      },
      schedule: this.config.getStreamingHours(),
      timestamp: new Date().toISOString()
    };
  }

  formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  getStatusMessage(permissionLevel) {
    const quota = this.quotaManager.getQuotaStatus();
    return `🤖 Bot: Active | Game: ${this.context.currentGame || 'Unknown'} | Quota: ${quota.percentUsed}% | Level: ${permissionLevel}`;
  }

  getStatsMessage() {
    const uptime = this.formatUptime(Date.now() - this.state.startTime);
    const rateLimitStats = this.rateLimiter.getStats();
    return `📊 Uptime: ${uptime} | Messages: ${this.context.messageHistory.length} | Responses: ${rateLimitStats.hourlyResponses}/${rateLimitStats.maxHourlyResponses}`;
  }

  getDebugInfo() {
    return `🐛 Errors: ${this.state.consecutiveErrors}/${this.state.maxConsecutiveErrors} | Context: ${this.context.recentEvents.length} events | Rate: ${this.rateLimiter.getStats().activeUsers} users`;
  }

  getHelpMessage(permissionLevel) {
    if (permissionLevel === constants.PERMISSION_LEVELS.OWNER) {
      return '🔧 Owner: !status !quota !stats !ping !say !mood !game !debug !shutdown !restart !help';
    } else if (permissionLevel === constants.PERMISSION_LEVELS.MODERATOR) {
      return '🔧 Mod: !status !ping !context !help';
    }
    return '🔧 Available: !help';
  }

  async restart() {
    logger.info('🔄 Restarting bot...');
    
    // Clear intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    
    // Cleanup
    this.cleanup();
    
    // Wait a moment then restart
    setTimeout(async () => {
      await this.startMonitoring();
      logger.info('✅ Bot restarted successfully');
    }, 3000);
  }

  async gracefulShutdown() {
    logger.info('🛑 Starting graceful shutdown...');
    
    this.state.isRunning = false;
    this.state.isMonitoring = false;
    
    // Clear intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    
    // Send farewell message if possible
    if (this.state.liveChatId && this.youtubeService.canSendMessages()) {
      try {
        await this.youtubeService.sendMessage(
          this.state.liveChatId, 
          '🤖 Bot going offline. Thanks for the great stream! 👋'
        );
      } catch (error) {
        logger.error('Error sending farewell message:', error);
      }
    }
    
    // Stop web server
    await this.webServer.stop();
    
    this.emit('botStopped');
    
    setTimeout(() => {
      logger.info('👋 Graceful shutdown completed');
      process.exit(0);
    }, 2000);
  }

  async stop() {
    await this.gracefulShutdown();
  }
}

module.exports = SmartYouTubeChatBot;