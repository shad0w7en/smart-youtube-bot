/**
 * Game detection system for identifying games from stream titles and content
 */

const logger = require('../utils/logger');
const constants = require('../config/constants');

class GameDetector {
  constructor() {
    this.gameKeywords = constants.SUPPORTED_GAMES;
    this.detectionHistory = [];
    this.confidenceThreshold = 0.7;
  }

  detectGame(title, description = '') {
    try {
      const text = `${title} ${description}`.toLowerCase();
      const results = [];

      // Check each game's keywords
      for (const [gameName, keywords] of Object.entries(this.gameKeywords)) {
        const confidence = this.calculateGameConfidence(text, keywords, gameName);
        
        if (confidence > 0) {
          results.push({
            game: gameName,
            confidence: confidence,
            matchedKeywords: this.getMatchedKeywords(text, keywords)
          });
        }
      }

      // Sort by confidence
      results.sort((a, b) => b.confidence - a.confidence);

      // Log detection attempt
      this.logDetection(title, results);

      // Return best match if confidence is high enough
      if (results.length > 0 && results[0].confidence >= this.confidenceThreshold) {
        const detected = results[0];
        logger.info(`🎮 Game detected: ${detected.game} (confidence: ${Math.round(detected.confidence * 100)}%)`);
        return detected.game;
      }

      // Fallback: check for generic gaming terms
      const genericGame = this.detectGenericGame(text);
      if (genericGame) {
        logger.info(`🎮 Generic game detected: ${genericGame}`);
        return genericGame;
      }

      logger.debug(`No game detected in: "${title}"`);
      return null;
    } catch (error) {
      logger.error('Error detecting game:', error.message);
      return null;
    }
  }

  calculateGameConfidence(text, keywords, gameName) {
    let confidence = 0;
    let matches = 0;
    let totalWeight = 0;

    keywords.forEach((keyword, index) => {
      const weight = this.getKeywordWeight(keyword, index);
      totalWeight += weight;

      if (text.includes(keyword.toLowerCase())) {
        matches++;
        
        // Exact word match gets higher score
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
        if (regex.test(text)) {
          confidence += weight * 1.0;
        } else {
          confidence += weight * 0.7; // Partial match
        }

        // Boost confidence for exact game name matches
        if (keyword.toLowerCase() === gameName.toLowerCase()) {
          confidence += weight * 0.5;
        }
      }
    });

    // Normalize confidence
    if (totalWeight > 0) {
      confidence = confidence / totalWeight;
    }

    // Bonus for multiple keyword matches
    if (matches > 1) {
      confidence *= (1 + (matches - 1) * 0.1);
    }

    // Penalty for very short keywords in long text
    if (text.length > 50) {
      const shortKeywords = keywords.filter(k => k.length <= 3);
      if (shortKeywords.length > 0) {
        confidence *= 0.9;
      }
    }

    return Math.min(confidence, 1.0);
  }

  getKeywordWeight(keyword, index) {
    // First keyword (usually the main name) gets highest weight
    if (index === 0) return 1.0;
    
    // Longer keywords get higher weight (more specific)
    if (keyword.length >= 8) return 0.9;
    if (keyword.length >= 5) return 0.8;
    if (keyword.length >= 3) return 0.7;
    
    // Very short keywords get lower weight
    return 0.6;
  }

  getMatchedKeywords(text, keywords) {
    return keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
  }

  detectGenericGame(text) {
    const genericTerms = {
      'fps': ['fps', 'first person shooter', 'shooting'],
      'moba': ['moba', 'multiplayer online battle arena', 'lane'],
      'battle royale': ['battle royale', 'br', 'last man standing'],
      'mmo': ['mmo', 'mmorpg', 'massively multiplayer'],
      'racing': ['racing', 'car game', 'driving'],
      'sports': ['fifa', 'nba', 'nfl', 'soccer', 'football', 'basketball'],
      'horror': ['horror', 'scary', 'survival horror'],
      'puzzle': ['puzzle', 'brain teaser', 'logic'],
      'platform': ['platformer', 'jumping', 'mario style'],
      'rpg': ['rpg', 'role playing', 'character build'],
      'strategy': ['strategy', 'rts', 'turn based'],
      'simulation': ['simulation', 'sim', 'life sim'],
      'indie': ['indie', 'independent', 'small dev']
    };

    for (const [genre, terms] of Object.entries(genericTerms)) {
      if (terms.some(term => text.includes(term))) {
        return `${genre} game`;
      }
    }

    // Check for gaming keywords
    const gamingKeywords = [
      'gaming', 'playing', 'gameplay', 'stream', 'live',
      'game', 'gamer', 'let\'s play', 'walkthrough'
    ];

    if (gamingKeywords.some(keyword => text.includes(keyword))) {
      return 'gaming';
    }

    return null;
  }

  logDetection(title, results) {
    this.detectionHistory.push({
      timestamp: Date.now(),
      title: title,
      results: results,
      detected: results.length > 0 ? results[0].game : null
    });

    // Keep only last 50 detections
    if (this.detectionHistory.length > 50) {
      this.detectionHistory = this.detectionHistory.slice(-50);
    }
  }

  // Add new game or update existing one
  addGame(gameName, keywords) {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('Keywords must be a non-empty array');
    }

    this.gameKeywords[gameName.toLowerCase()] = keywords.map(k => k.toLowerCase());
    logger.info(`Added/updated game: ${gameName} with keywords: ${keywords.join(', ')}`);
  }

  // Remove a game
  removeGame(gameName) {
    if (this.gameKeywords[gameName.toLowerCase()]) {
      delete this.gameKeywords[gameName.toLowerCase()];
      logger.info(`Removed game: ${gameName}`);
      return true;
    }
    return false;
  }

  // Get all supported games
  getSupportedGames() {
    return Object.keys(this.gameKeywords);
  }

  // Get keywords for a specific game
  getGameKeywords(gameName) {
    return this.gameKeywords[gameName.toLowerCase()] || [];
  }

  // Update confidence threshold
  setConfidenceThreshold(threshold) {
    if (threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold;
      logger.info(`Updated confidence threshold to: ${threshold}`);
    } else {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
  }

  // Test detection with sample titles
  testDetection(testTitles) {
    logger.info('🧪 Testing game detection...');
    
    const results = testTitles.map(title => {
      const detected = this.detectGame(title);
      return {
        title: title,
        detected: detected,
        confidence: this.getLastDetectionConfidence(title)
      };
    });

    results.forEach((result, index) => {
      logger.info(`Test ${index + 1}: "${result.title}" → ${result.detected || 'No game detected'} (${Math.round((result.confidence || 0) * 100)}%)`);
    });

    return results;
  }

  getLastDetectionConfidence(title) {
    const lastDetection = this.detectionHistory
      .reverse()
      .find(d => d.title === title);
    
    return lastDetection && lastDetection.results.length > 0 
      ? lastDetection.results[0].confidence 
      : 0;
  }

  // Get detection statistics
  getDetectionStats() {
    if (this.detectionHistory.length === 0) {
      return { totalDetections: 0 };
    }

    const successful = this.detectionHistory.filter(d => d.detected !== null).length;
    const failed = this.detectionHistory.length - successful;
    
    const gameFrequency = {};
    this.detectionHistory.forEach(d => {
      if (d.detected) {
        gameFrequency[d.detected] = (gameFrequency[d.detected] || 0) + 1;
      }
    });

    const averageConfidence = this.detectionHistory
      .filter(d => d.results.length > 0)
      .reduce((sum, d) => sum + d.results[0].confidence, 0) / 
      Math.max(successful, 1);

    return {
      totalDetections: this.detectionHistory.length,
      successfulDetections: successful,
      failedDetections: failed,
      successRate: Math.round((successful / this.detectionHistory.length) * 100),
      averageConfidence: Math.round(averageConfidence * 100),
      mostDetectedGames: Object.entries(gameFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      recentDetections: this.detectionHistory.slice(-10).map(d => ({
        title: d.title,
        detected: d.detected,
        timestamp: new Date(d.timestamp).toLocaleTimeString()
      }))
    };
  }

  // Enhanced detection with context
  detectGameWithContext(title, description = '', previousGame = null, chatMessages = []) {
    // First try standard detection
    let detected = this.detectGame(title, description);
    
    if (detected) {
      return {
        game: detected,
        confidence: this.getLastDetectionConfidence(title),
        method: 'title_analysis'
      };
    }

    // Try to use previous game if title is generic
    if (previousGame && this.isGenericTitle(title)) {
      logger.debug(`Using previous game context: ${previousGame}`);
      return {
        game: previousGame,
        confidence: 0.6,
        method: 'previous_context'
      };
    }

    // Try to detect from recent chat messages
    if (chatMessages.length > 0) {
      const chatGame = this.detectGameFromChat(chatMessages);
      if (chatGame) {
        return {
          game: chatGame.game,
          confidence: chatGame.confidence,
          method: 'chat_analysis'
        };
      }
    }

    return null;
  }

  isGenericTitle(title) {
    const genericWords = [
      'live', 'stream', 'streaming', 'playing', 'gaming',
      'chill', 'vibes', 'hang', 'chat', 'talk', 'just chatting'
    ];
    
    const titleWords = title.toLowerCase().split(/\s+/);
    const genericCount = titleWords.filter(word => 
      genericWords.includes(word)
    ).length;
    
    return genericCount >= titleWords.length * 0.5; // 50% generic words
  }

  detectGameFromChat(messages) {
    const recentMessages = messages.slice(-20); // Last 20 messages
    const combinedText = recentMessages
      .map(msg => msg.snippet?.displayMessage || '')
      .join(' ')
      .toLowerCase();

    const gameMatches = {};
    
    // Count mentions of each game in chat
    for (const [gameName, keywords] of Object.entries(this.gameKeywords)) {
      let mentions = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = combinedText.match(regex);
        if (matches) {
          mentions += matches.length;
        }
      });
      
      if (mentions > 0) {
        gameMatches[gameName] = mentions;
      }
    }

    // Return most mentioned game
    const sortedGames = Object.entries(gameMatches)
      .sort(([,a], [,b]) => b - a);

    if (sortedGames.length > 0) {
      const [topGame, mentions] = sortedGames[0];
      const confidence = Math.min(mentions * 0.2, 0.8); // Max 80% confidence from chat
      
      return {
        game: topGame,
        confidence: confidence,
        mentions: mentions
      };
    }

    return null;
  }

  // Export/import game configuration
  exportGameConfig() {
    return {
      gameKeywords: this.gameKeywords,
      confidenceThreshold: this.confidenceThreshold,
      timestamp: Date.now()
    };
  }

  importGameConfig(config) {
    try {
      if (config.gameKeywords) {
        this.gameKeywords = { ...this.gameKeywords, ...config.gameKeywords };
      }
      if (config.confidenceThreshold !== undefined) {
        this.confidenceThreshold = config.confidenceThreshold;
      }
      logger.info('Game configuration imported successfully');
      return true;
    } catch (error) {
      logger.error('Failed to import game configuration:', error.message);
      return false;
    }
  }

  // Clear detection history
  clearHistory() {
    this.detectionHistory = [];
    logger.info('Game detection history cleared');
  }
}

module.exports = GameDetector;