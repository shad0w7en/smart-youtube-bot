/**
 * Message analysis system for understanding chat context
 */

const logger = require('../utils/logger');
const constants = require('../config/constants');

class MessageAnalyzer {
  constructor() {
    this.chatPatterns = this.initializeChatPatterns();
    this.emotionKeywords = this.initializeEmotionKeywords();
    this.gameKeywords = constants.SUPPORTED_GAMES;
  }

  initializeChatPatterns() {
    return {
      greetings: /^(hello|hi|hey|sup|what'?s up|good morning|good evening|yo|hiya|howdy|wassup)/i,
      questions: /(\?|how do|what is|when does|where can|why did|can you|could you|help me|tell me|explain)/i,
      excitement: /(!{2,}|wow|amazing|incredible|insane|epic|poggers|pog|let'?s go|hype|fire|lit|sick|dope)/i,
      frustration: /(ugh|fail|noob|trash|bad|terrible|worst|rage|angry|wtf|omg|damn|shit|fuck)/i,
      gameplay: /(play|game|level|boss|enemy|weapon|skill|strategy|tip|guide|build|craft|win|lose|died|kill)/i,
      streamer: /(streamer|player|you|your|nice|good|great|love|like|awesome)/i,
      bots: /(bot|ai|robot|artificial|chatbot)/i,
      commands: /^!/,
      encouragement: /(you got this|keep going|don't give up|good luck|you can do it|believe)/i,
      reactions: /(lol|lmao|rofl|haha|😂|🤣|💀|😭|😱|🔥|💯|👏|🎉)/i,
      spam: /(.)\1{4,}|(.{1,3})\2{3,}/i // Repeated characters or patterns
    };
  }

  initializeEmotionKeywords() {
    return {
      positive: [
        'love', 'awesome', 'amazing', 'great', 'good', 'nice', 'cool', 'best', 'perfect',
        'fantastic', 'excellent', 'wonderful', 'brilliant', 'outstanding', 'impressive',
        'beautiful', 'lovely', 'adorable', 'cute', 'sweet', 'fun', 'enjoy', 'happy',
        'excited', 'pumped', 'hyped', 'stoked', 'thrilled', 'delighted'
      ],
      negative: [
        'hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', 'disgusting', 'trash',
        'garbage', 'suck', 'sucks', 'boring', 'stupid', 'dumb', 'annoying', 'frustrating',
        'disappointed', 'sad', 'angry', 'mad', 'pissed', 'upset', 'irritated', 'fail'
      ],
      neutral: [
        'okay', 'ok', 'fine', 'alright', 'normal', 'average', 'decent', 'reasonable',
        'standard', 'typical', 'usual', 'common', 'regular', 'ordinary'
      ]
    };
  }

  analyze(messageText, author, context = {}) {
    try {
      const text = messageText.toLowerCase().trim();
      
      // Basic message properties
      const analysis = {
        originalText: messageText,
        cleanText: text,
        author: author,
        timestamp: Date.now(),
        length: messageText.length,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length
      };

      // Pattern matching
      analysis.patterns = this.detectPatterns(text);
      
      // Sentiment analysis
      analysis.sentiment = this.analyzeSentiment(text);
      analysis.emotion = this.detectEmotion(text);
      
      // Intent detection
      analysis.intent = this.detectIntent(text, analysis.patterns);
      
      // Content analysis
      analysis.gameRelated = this.isGameRelated(text, context.currentGame);
      analysis.streamerMention = this.mentionsStreamer(text, context);
      analysis.botMention = this.mentionsBot(text, context);
      
      // Response requirements
      analysis.requiresResponse = this.requiresResponse(analysis);
      analysis.urgency = this.determineUrgency(analysis);
      analysis.responseType = this.determineResponseType(analysis);
      
      // Quality checks
      analysis.isSpam = this.detectSpam(text);
      analysis.confidence = this.calculateConfidence(analysis);
      
      // Context relevance
      analysis.contextRelevance = this.analyzeContextRelevance(analysis, context);
      
      logger.debug(`Message analyzed: ${author} - ${analysis.sentiment}/${analysis.intent} (confidence: ${analysis.confidence})`);
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing message:', error.message);
      return this.getDefaultAnalysis(messageText, author);
    }
  }

  detectPatterns(text) {
    const patterns = {};
    
    Object.entries(this.chatPatterns).forEach(([patternName, regex]) => {
      patterns[patternName] = regex.test(text);
    });
    
    return patterns;
  }

  analyzeSentiment(text) {
    let positiveScore = 0;
    let negativeScore = 0;
    
    // Check emotion keywords
    this.emotionKeywords.positive.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });
    
    this.emotionKeywords.negative.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });
    
    // Check patterns
    if (this.chatPatterns.excitement.test(text)) positiveScore += 2;
    if (this.chatPatterns.frustration.test(text)) negativeScore += 2;
    if (this.chatPatterns.encouragement.test(text)) positiveScore += 1;
    
    // Emoji sentiment (basic)
    const positiveEmojis = text.match(/[😀😃😄😁😆😊😍🥰😘🤗🎉🔥💯👏]/g);
    const negativeEmojis = text.match(/[😠😡🤬😤😒😔😢😭💀😱]/g);
    
    if (positiveEmojis) positiveScore += positiveEmojis.length;
    if (negativeEmojis) negativeScore += negativeEmojis.length;
    
    // Determine overall sentiment
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  detectEmotion(text) {
    if (this.chatPatterns.excitement.test(text)) return 'excited';
    if (this.chatPatterns.frustration.test(text)) return 'frustrated';
    if (this.chatPatterns.encouragement.test(text)) return 'supportive';
    if (this.chatPatterns.reactions.test(text)) return 'reactive';
    return 'neutral';
  }

  detectIntent(text, patterns) {
    if (patterns.commands) return 'command';
    if (patterns.greetings) return 'greeting';
    if (patterns.questions) return 'question';
    if (patterns.bots) return 'bot_mention';
    if (patterns.encouragement) return 'encouragement';
    if (patterns.reactions) return 'reaction';
    return 'comment';
  }

  isGameRelated(text, currentGame) {
    // Check for general gaming terms
    if (this.chatPatterns.gameplay.test(text)) return true;
    
    // Check for specific game keywords
    for (const [game, keywords] of Object.entries(this.gameKeywords)) {
      if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        return true;
      }
    }
    
    // Check if current game is mentioned
    if (currentGame && text.includes(currentGame.toLowerCase())) {
      return true;
    }
    
    return false;
  }

  mentionsStreamer(text, context) {
    if (this.chatPatterns.streamer.test(text)) return true;
    
    // Check for direct mentions (you, your, etc.)
    const streamerPronouns = ['you', 'your', 'yours', 'u', 'ur'];
    return streamerPronouns.some(pronoun => text.includes(pronoun));
  }

  mentionsBot(text, context) {
    if (this.chatPatterns.bots.test(text)) return true;
    
    // Check for bot name mention
    const botName = context.botName?.toLowerCase();
    if (botName && text.includes(botName)) return true;
    
    return false;
  }

  requiresResponse(analysis) {
    // High priority response triggers
    if (analysis.intent === 'greeting') return true;
    if (analysis.intent === 'question') return true;
    if (analysis.intent === 'bot_mention') return true;
    if (analysis.botMention) return true;
    
    // Medium priority triggers
    if (analysis.intent === 'encouragement' && analysis.sentiment === 'positive') return true;
    if (analysis.streamerMention && analysis.intent === 'question') return true;
    
    return false;
  }

  determineUrgency(analysis) {
    if (analysis.intent === 'question' && analysis.botMention) return 'high';
    if (analysis.intent === 'greeting' || analysis.intent === 'bot_mention') return 'medium';
    if (analysis.requiresResponse) return 'medium';
    return 'low';
  }

  determineResponseType(analysis) {
    if (analysis.intent === 'greeting') return constants.RESPONSE_TYPES.GREETING;
    if (analysis.intent === 'question') return constants.RESPONSE_TYPES.QUESTION;
    if (analysis.gameRelated) return constants.RESPONSE_TYPES.GAMEPLAY;
    if (analysis.sentiment !== 'neutral') return constants.RESPONSE_TYPES.REACTION;
    return 'general';
  }

  detectSpam(text) {
    // Check for repeated characters or patterns
    if (this.chatPatterns.spam.test(text)) return true;
    
    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.7 && text.length > 10) return true;
    
    // Check for excessive punctuation
    const punctuationRatio = (text.match(/[!?.,;:]/g) || []).length / text.length;
    if (punctuationRatio > 0.3) return true;
    
    return false;
  }

  calculateConfidence(analysis) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for clear patterns
    if (analysis.patterns.greetings) confidence += 0.3;
    if (analysis.patterns.questions) confidence += 0.3;
    if (analysis.patterns.commands) confidence += 0.4;
    
    // Increase confidence for sentiment clarity
    if (analysis.sentiment !== 'neutral') confidence += 0.2;
    
    // Decrease confidence for spam or unclear content
    if (analysis.isSpam) confidence -= 0.3;
    if (analysis.wordCount < 2) confidence -= 0.2;
    
    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  analyzeContextRelevance(analysis, context) {
    let relevance = 0.5; // Base relevance
    
    // Game context relevance
    if (analysis.gameRelated && context.currentGame) {
      relevance += 0.3;
    }
    
    // Chat mood relevance
    if (context.chatMood === constants.CHAT_MOODS.EXCITED && analysis.sentiment === 'positive') {
      relevance += 0.2;
    }
    
    if (context.chatMood === constants.CHAT_MOODS.FRUSTRATED && analysis.intent === 'encouragement') {
      relevance += 0.3;
    }
    
    // Recent context relevance
    if (context.recentEvents && context.recentEvents.length > 0) {
      const recentGameEvents = context.recentEvents.filter(event => 
        event.type === 'gameplay' && Date.now() - event.timestamp < 300000 // 5 minutes
      );
      
      if (recentGameEvents.length > 0 && analysis.gameRelated) {
        relevance += 0.2;
      }
    }
    
    return Math.max(0, Math.min(1, relevance));
  }

  getDefaultAnalysis(messageText, author) {
    return {
      originalText: messageText,
      cleanText: messageText.toLowerCase(),
      author: author,
      timestamp: Date.now(),
      sentiment: 'neutral',
      intent: 'comment',
      gameRelated: false,
      requiresResponse: false,
      urgency: 'low',
      confidence: 0.1,
      isSpam: false,
      patterns: {},
      contextRelevance: 0.1
    };
  }

  // Batch analysis for context building
  analyzeMessageBatch(messages, context) {
    return messages.map(message => {
      const text = message.snippet?.displayMessage || '';
      const author = message.authorDetails?.displayName || 'Unknown';
      return this.analyze(text, author, context);
    });
  }

  // Get analysis statistics
  getAnalysisStats(analyses) {
    if (!analyses || analyses.length === 0) {
      return { totalMessages: 0 };
    }

    const sentiments = analyses.map(a => a.sentiment);
    const intents = analyses.map(a => a.intent);
    const gameRelated = analyses.filter(a => a.gameRelated).length;
    
    return {
      totalMessages: analyses.length,
      sentimentDistribution: {
        positive: sentiments.filter(s => s === 'positive').length,
        negative: sentiments.filter(s => s === 'negative').length,
        neutral: sentiments.filter(s => s === 'neutral').length
      },
      intentDistribution: intents.reduce((acc, intent) => {
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      }, {}),
      gameRelatedPercentage: Math.round((gameRelated / analyses.length) * 100),
      averageConfidence: analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length,
      spamMessages: analyses.filter(a => a.isSpam).length
    };
  }
}

module.exports = MessageAnalyzer;