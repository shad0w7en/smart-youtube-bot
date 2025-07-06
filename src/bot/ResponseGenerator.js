/**
 * Smart response generation system
 */

const logger = require('../utils/logger');
const constants = require('../config/constants');

class ResponseGenerator {
  constructor() {
    this.responses = this.initializeResponses();
    this.contextualResponses = this.initializeContextualResponses();
    this.recentResponses = new Map(); // Track recent responses to avoid repetition
  }

  initializeResponses() {
    return {
      greetings: [
        "Hey there! Welcome to the stream! 🎮",
        "What's up, gamer! Ready for some epic gameplay?",
        "Welcome aboard! Hope you enjoy the stream! 🚀",
        "Hey! Great to see you here! Let's have some fun!",
        "Welcome to the party! This is gonna be awesome! 🔥",
        "Yo! Thanks for joining us! 🎉",
        "Hello there! Perfect timing for some great content! ✨"
      ],

      questions: [
        "That's a great question! 🤔",
        "Interesting point! The streamer might know more about that!",
        "Good question! Let's see what happens! 💭",
        "Hmm, that's worth thinking about!",
        "Great question! I'm curious about that too! 🧐",
        "That's something I'd love to know as well!",
        "Ooh, good one! Hope we get an answer! 🙋‍♂️"
      ],

      botMentions: [
        "Yes, I'm a bot! 🤖 Here to enjoy the stream with everyone!",
        "Beep boop! 🤖 Just a friendly gaming bot!",
        "AI-powered and ready to chat! 🚀",
        "Hello human! I'm here to have fun! 🎮",
        "That's me! Your friendly neighborhood chat bot! 🏠",
        "Guilty as charged! 🤖 But I'm the fun kind of bot!",
        "Bot life! 🤖 Living my best digital life!"
      ],

      reactions: {
        positive: [
          "Absolutely! 💯", "So true! 👍", "Exactly! 🎯", "Right?! 🔥",
          "Couldn't agree more! ✨", "This! 👆", "YES! 🙌", "Facts! 📠"
        ],
        negative: [
          "Oof, that's rough! 😅", "We've all been there!", "Better luck next time! 💪",
          "Don't worry, it happens!", "F in the chat 😢", "Unlucky!", "Next time! 🚀"
        ],
        excited: [
          "LET'S GOOO! 🚀", "HYPE! 🔥", "This is it! 🎉", "AMAZING! ✨",
          "SO GOOD! 💯", "INCREDIBLE! 🤯", "YESSS! 🙌", "POGGERS! 🎮"
        ]
      },

      encouragement: [
        "You got this! 💪", "Keep going, you're doing great!", "Don't give up!",
        "Believe in yourself!", "You're getting better every game!", "Stay positive! ✨",
        "Push through! 🚀", "You're almost there!", "Keep the energy up! ⚡"
      ],

      gameplay: {
        general: [
          "Great gameplay! 🎮", "Nice moves! 👏", "Solid play! 💪",
          "Good strategy! 🧠", "Clean execution! ✨", "Well played! 🎯"
        ],
        wins: [
          "VICTORY! 🏆", "Nice win! 🎉", "GG! 🎮", "Clean victory! ✨",
          "Dominant performance! 💪", "That's how it's done! 🔥"
        ],
        fails: [
          "Unlucky! 😅", "Happens to the best! 💪", "Next round! 🚀",
          "Learning experience! 📚", "Comeback time! ⚡", "Shake it off! 🎯"
        ]
      },

      general: [
        "This stream is so good! 🔥", "Great energy in chat! ❤️",
        "Love this community! 🌟", "Such good vibes! ✨",
        "Perfect way to spend time! 🎮", "This is awesome! 🎉"
      ]
    };
  }

  initializeContextualResponses() {
    return {
      gameSpecific: {
        valorant: {
          positive: ["Nice shot! 🎯", "Clean aim! 💯", "Ace potential! 🔥", "Clutch mode! ⚡"],
          negative: ["Unlucky round! 😅", "Get em next time! 💪", "Eco round! 💰"],
          general: ["Good positioning! 🎮", "Smart play! 🧠", "Team diff! 👥"]
        },
        minecraft: {
          positive: ["Epic build! 🏗️", "That's creative! ✨", "Masterpiece! 🎨", "Incredible design! 🔥"],
          negative: ["Creeper says hi! 💥", "Mining accidents happen! ⛏️", "Respawn time! 🏃‍♂️"],
          general: ["Nice block choice! 🧱", "Good mining! ⛏️", "Cool idea! 💡"]
        },
        fortnite: {
          positive: ["Victory Royale! 👑", "Nice build! 🏗️", "Clean edit! ✂️", "Good rotation! 🌪️"],
          negative: ["Storm got you! 🌪️", "Third partied! 😅", "Better RNG next time! 🎲"],
          general: ["Good loot! 📦", "Smart positioning! 🎯", "Nice skin! 👕"]
        },
        apex: {
          positive: ["Champion! 🏆", "Third party king! 👑", "Clutch legend! ⚡", "Perfect rotation! 🔄"],
          negative: ["Third partied! 😅", "Zone's rough! 🌪️", "Unlucky RNG! 🎲"],
          general: ["Good legend choice! 🦸‍♂️", "Nice positioning! 📍", "Team work! 👥"]
        },
        default: {
          positive: ["Nice play! 🎮", "Well done! 👏", "Great job! ⭐", "Impressive! 🔥"],
          negative: ["Tough luck! 😅", "Next time! 💪", "It happens! 🤷‍♂️", "Learning curve! 📈"],
          general: ["Good attempt! 🎯", "Interesting move! 🤔", "Keep it up! 🚀", "Nice try! 👍"]
        }
      },

      moodResponses: {
        [constants.CHAT_MOODS.EXCITED]: [
          "The energy is REAL! 🔥", "Chat is HYPED! 🚀", "This is amazing! ✨",
          "EVERYONE'S PUMPED! 🎉", "THE HYPE IS CONTAGIOUS! ⚡"
        ],
        [constants.CHAT_MOODS.FRUSTRATED]: [
          "Stay positive everyone! 💪", "We got this! 🚀", "Comeback incoming! ⚡",
          "Don't lose hope! ✨", "Turn it around! 🔄"
        ],
        [constants.CHAT_MOODS.SUPPORTIVE]: [
          "Love this community! ❤️", "Such good vibes! ✨", "Supportive squad! 👥",
          "This chat is wholesome! 🌟", "Amazing energy! ⚡"
        ]
      },

      timeBasedResponses: {
        morning: [
          "Good morning, gamers! 🌅", "Early bird squad! 🐦", "Rise and grind! ⚡",
          "Morning gaming session! ☕", "Fresh start vibes! ✨"
        ],
        afternoon: [
          "Afternoon gaming! ☀️", "Perfect timing! 🎯", "Midday squad! 🌞",
          "Lunch break gaming! 🍕", "Afternoon energy! ⚡"
        ],
        evening: [
          "Evening squad! 🌙", "Prime time gaming! ⭐", "After work vibes! 💼",
          "Dinner and gaming! 🍽️", "Evening energy! 🌆"
        ],
        night: [
          "Night owl crew! 🦉", "Late night gaming! 🌙", "Midnight squad! ⭐",
          "After hours gaming! 🌃", "Night time vibes! 🌌"
        ]
      }
    };
  }

  generate(messageText, author, analysis, context) {
    try {
      // Don't respond to spam
      if (analysis.isSpam) {
        logger.debug(`Skipping response to spam from ${author}`);
        return null;
      }

      // Check if we've responded to this user recently with similar content
      if (this.hasRecentSimilarResponse(author, analysis.intent)) {
        logger.debug(`Skipping similar recent response to ${author}`);
        return null;
      }

      let response = null;

      // Generate response based on intent and context
      switch (analysis.intent) {
        case 'greeting':
          response = this.generateGreeting(analysis, context);
          break;
        case 'question':
          response = this.generateQuestionResponse(analysis, context);
          break;
        case 'bot_mention':
          response = this.generateBotMentionResponse(analysis, context);
          break;
        case 'encouragement':
          response = this.generateEncouragementResponse(analysis, context);
          break;
        case 'reaction':
          response = this.generateReactionResponse(analysis, context);
          break;
        default:
          response = this.generateContextualResponse(analysis, context);
      }

      // Add variety and context enhancement
      if (response) {
        response = this.enhanceResponse(response, analysis, context);
        this.trackResponse(author, analysis.intent, response);
      }

      return response;
    } catch (error) {
      logger.error('Error generating response:', error.message);
      return null;
    }
  }

  generateGreeting(analysis, context) {
    let greetings = [...this.responses.greetings];

    // Add time-based greetings
    const hour = new Date().getHours();
    if (hour < 12) greetings.push(...this.contextualResponses.timeBasedResponses.morning);
    else if (hour < 17) greetings.push(...this.contextualResponses.timeBasedResponses.afternoon);
    else if (hour < 22) greetings.push(...this.contextualResponses.timeBasedResponses.evening);
    else greetings.push(...this.contextualResponses.timeBasedResponses.night);

    return this.selectRandomResponse(greetings);
  }

  generateQuestionResponse(analysis, context) {
    const responses = [...this.responses.questions];

    // Add game-specific question responses if relevant
    if (analysis.gameRelated && context.currentGame) {
      responses.push(
        `Great question about ${context.currentGame}! 🎮`,
        `Interesting ${context.currentGame} question! 🤔`,
        `Good point about the gameplay! 💭`
      );
    }

    return this.selectRandomResponse(responses);
  }

  generateBotMentionResponse(analysis, context) {
    const responses = [...this.responses.botMentions];

    // Add context-aware bot responses
    if (context.currentGame) {
      responses.push(
        `Yep! Just here enjoying some ${context.currentGame}! 🎮`,
        `Bot life! Watching this ${context.currentGame} gameplay! 🤖`
      );
    }

    return this.selectRandomResponse(responses);
  }

  generateEncouragementResponse(analysis, context) {
    const responses = [...this.responses.encouragement];

    // Add game-specific encouragement
    if (context.gameState === constants.GAME_STATES.STRUGGLING) {
      responses.push(
        "Comeback time! 🔄", "This is the learning phase! 📚",
        "Every pro was once a beginner! ⭐", "You're improving! 📈"
      );
    }

    return this.selectRandomResponse(responses);
  }

  generateReactionResponse(analysis, context) {
    const sentiment = analysis.sentiment;
    const emotion = analysis.emotion;

    if (emotion === 'excited' || sentiment === 'positive') {
      return this.selectRandomResponse([
        ...this.responses.reactions.positive,
        ...this.responses.reactions.excited
      ]);
    } else if (sentiment === 'negative') {
      return this.selectRandomResponse(this.responses.reactions.negative);
    }

    return this.selectRandomResponse(this.responses.reactions.positive);
  }

  generateContextualResponse(analysis, context) {
    // Game-specific responses
    if (analysis.gameRelated && context.currentGame) {
      return this.generateGameSpecificResponse(analysis, context);
    }

    // Mood-based responses
    if (context.chatMood && this.contextualResponses.moodResponses[context.chatMood]) {
      if (Math.random() < 0.3) { // 30% chance for mood response
        return this.selectRandomResponse(this.contextualResponses.moodResponses[context.chatMood]);
      }
    }

    // Sentiment-based general responses
    if (analysis.sentiment === 'positive') {
      return this.selectRandomResponse(this.responses.reactions.positive);
    } else if (analysis.sentiment === 'negative') {
      return this.selectRandomResponse(this.responses.reactions.negative);
    }

    // Low chance general engagement
    if (Math.random() < 0.05) { // 5% chance
      return this.selectRandomResponse(this.responses.general);
    }

    return null;
  }

  generateGameSpecificResponse(analysis, context) {
    const game = context.currentGame;
    const gameResponses = this.contextualResponses.gameSpecific[game] || 
                         this.contextualResponses.gameSpecific.default;

    // Choose response category based on sentiment and game state
    let responseCategory = 'general';

    if (analysis.sentiment === 'positive' || context.gameState === constants.GAME_STATES.WINNING) {
      responseCategory = 'positive';
    } else if (analysis.sentiment === 'negative' || context.gameState === constants.GAME_STATES.STRUGGLING) {
      responseCategory = 'negative';
    }

    const responses = gameResponses[responseCategory] || gameResponses.general;
    return this.selectRandomResponse(responses);
  }

  enhanceResponse(response, analysis, context) {
    // Add user mention for direct interactions
    if (analysis.requiresResponse && analysis.urgency === 'high') {
      // Don't add @mentions in YouTube chat as they don't work the same way
      // Just return the response as-is
    }

    // Add context-aware elements
    if (Math.random() < 0.2) { // 20% chance to add context
      if (context.currentGame && !response.includes(context.currentGame)) {
        // Sometimes reference the current game
        const gameRefs = [
          ` Great ${context.currentGame} moment!`,
          ` This ${context.currentGame} gameplay is fire!`,
          ` ${context.currentGame} vibes!`
        ];
        
        if (Math.random() < 0.3) {
          response += this.selectRandomResponse(gameRefs);
        }
      }
    }

    return response;
  }

  selectRandomResponse(responses) {
    if (!responses || responses.length === 0) {
      return "Hey there! 🎮"; // Fallback response
    }

    // Avoid recently used responses
    const availableResponses = responses.filter(r => 
      !this.wasRecentlyUsed(r)
    );

    const finalResponses = availableResponses.length > 0 ? availableResponses : responses;
    const selected = finalResponses[Math.floor(Math.random() * finalResponses.length)];
    
    this.markAsRecentlyUsed(selected);
    return selected;
  }

  wasRecentlyUsed(response) {
    const now = Date.now();
    const recentTime = 10 * 60 * 1000; // 10 minutes
    
    for (const [text, timestamp] of this.recentResponses.entries()) {
      if (text === response && now - timestamp < recentTime) {
        return true;
      }
    }
    return false;
  }

  markAsRecentlyUsed(response) {
    this.recentResponses.set(response, Date.now());
    
    // Clean up old entries
    if (this.recentResponses.size > 100) {
      const now = Date.now();
      const oldTime = 30 * 60 * 1000; // 30 minutes
      
      for (const [text, timestamp] of this.recentResponses.entries()) {
        if (now - timestamp > oldTime) {
          this.recentResponses.delete(text);
        }
      }
    }
  }

  hasRecentSimilarResponse(author, intent) {
    const key = `${author}-${intent}`;
    const now = Date.now();
    const cooldown = 5 * 60 * 1000; // 5 minutes
    
    const lastResponse = this.recentResponses.get(key);
    return lastResponse && now - lastResponse < cooldown;
  }

  trackResponse(author, intent, response) {
    const key = `${author}-${intent}`;
    this.recentResponses.set(key, Date.now());
    
    logger.debug(`Generated response for ${author} (${intent}): ${response}`);
  }

  // Admin/Owner specific responses
  generateAdminResponse(command, permissionLevel, context) {
    const responses = {
      help: {
        owner: "🔧 Owner commands: !status !quota !stats !ping !say !mood !game !debug !shutdown !restart !help",
        moderator: "🔧 Mod commands: !status !ping !context !help",
        user: "🔧 Available commands: !help"
      },
      status: {
        template: `🤖 Bot: Active | Game: {game} | Quota: {quota}% | Level: {level}`
      },
      ping: {
        template: `🏓 Pong! ({level}) - {timestamp}ms`
      }
    };

    if (responses[command]) {
      if (responses[command][permissionLevel]) {
        return responses[command][permissionLevel];
      } else if (responses[command].template) {
        return this.fillTemplate(responses[command].template, context, permissionLevel);
      }
    }

    return null;
  }

  fillTemplate(template, context, permissionLevel) {
    return template
      .replace('{game}', context.currentGame || 'Unknown')
      .replace('{quota}', Math.round(context.quotaUsage || 0))
      .replace('{level}', permissionLevel)
      .replace('{timestamp}', Date.now());
  }

  // Response statistics
  getResponseStats() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    
    const recentResponses = Array.from(this.recentResponses.entries())
      .filter(([key, timestamp]) => timestamp > hourAgo);

    const intentCounts = {};
    const authorCounts = {};

    recentResponses.forEach(([key, timestamp]) => {
      if (key.includes('-')) {
        const [author, intent] = key.split('-');
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        authorCounts[author] = (authorCounts[author] || 0) + 1;
      }
    });

    return {
      totalResponses: recentResponses.length,
      intentDistribution: intentCounts,
      topAuthors: Object.entries(authorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      uniqueUsers: Object.keys(authorCounts).length
    };
  }

  // Add custom responses at runtime
  addCustomResponses(category, newResponses) {
    if (this.responses[category]) {
      this.responses[category].push(...newResponses);
      logger.info(`Added ${newResponses.length} custom responses to ${category}`);
    } else {
      this.responses[category] = newResponses;
      logger.info(`Created new response category: ${category}`);
    }
  }

  // Remove responses containing specific text
  removeResponses(category, textToRemove) {
    if (this.responses[category]) {
      const originalLength = this.responses[category].length;
      this.responses[category] = this.responses[category].filter(
        response => !response.toLowerCase().includes(textToRemove.toLowerCase())
      );
      const removed = originalLength - this.responses[category].length;
      logger.info(`Removed ${removed} responses containing "${textToRemove}" from ${category}`);
    }
  }

  // Clear recent response history
  clearHistory() {
    this.recentResponses.clear();
    logger.info('Response history cleared');
  }

  // Get all available response categories
  getAvailableCategories() {
    return Object.keys(this.responses);
  }

  // Export/import response configuration
  exportResponses() {
    return {
      responses: this.responses,
      contextualResponses: this.contextualResponses,
      timestamp: Date.now()
    };
  }

  importResponses(responseData) {
    try {
      if (responseData.responses) {
        this.responses = { ...this.responses, ...responseData.responses };
      }
      if (responseData.contextualResponses) {
        this.contextualResponses = { ...this.contextualResponses, ...responseData.contextualResponses };
      }
      logger.info('Response configuration imported successfully');
      return true;
    } catch (error) {
      logger.error('Failed to import response configuration:', error.message);
      return false;
    }
  }
}

module.exports = ResponseGenerator;