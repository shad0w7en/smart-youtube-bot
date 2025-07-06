/**
 * Application constants and static configuration
 */

module.exports = {
  // API Quotas
  YOUTUBE_API: {
    DAILY_QUOTA_LIMIT: 10000,
    SAFE_QUOTA_LIMIT: 9000,
    COSTS: {
      SEARCH: 100,
      VIDEO_LIST: 1,
      CHAT_LIST: 5,
      CHAT_INSERT: 50
    }
  },

  // Response Types
  RESPONSE_TYPES: {
    GREETING: 'greeting',
    QUESTION: 'question',
    REACTION: 'reaction',
    GAMEPLAY: 'gameplay',
    ADMIN: 'admin'
  },

  // Game States
  GAME_STATES: {
    UNKNOWN: 'unknown',
    PLAYING: 'playing',
    WINNING: 'winning',
    STRUGGLING: 'struggling',
    INTENSE: 'intense',
    MENU: 'menu'
  },

  // Chat Moods
  CHAT_MOODS: {
    NEUTRAL: 'neutral',
    EXCITED: 'excited',
    FRUSTRATED: 'frustrated',
    SUPPORTIVE: 'supportive',
    HYPED: 'hyped'
  },

  // Permission Levels
  PERMISSION_LEVELS: {
    USER: 'user',
    VERIFIED: 'verified',
    MODERATOR: 'moderator',
    OWNER: 'owner'
  },

  // Supported Games
  SUPPORTED_GAMES: {
    valorant: ['valorant', 'val', 'valo'],
    minecraft: ['minecraft', 'mc'],
    fortnite: ['fortnite', 'fn'],
    apex: ['apex', 'apex legends'],
    cod: ['cod', 'call of duty', 'warzone'],
    gta: ['gta', 'grand theft auto'],
    wow: ['wow', 'world of warcraft'],
    lol: ['lol', 'league of legends'],
    cs2: ['cs2', 'counter-strike'],
    overwatch: ['overwatch', 'ow'],
    pubg: ['pubg', 'battlegrounds'],
    'rocket league': ['rocket league', 'rl'],
    dota: ['dota', 'dota 2'],
    'among us': ['among us', 'amongus'],
    'fall guys': ['fall guys']
  },

  // Error Types
  ERROR_TYPES: {
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    AUTH_ERROR: 'AUTH_ERROR',
    STREAM_NOT_FOUND: 'STREAM_NOT_FOUND',
    CHAT_DISABLED: 'CHAT_DISABLED',
    RATE_LIMITED: 'RATE_LIMITED'
  },

  // Default Intervals (in milliseconds)
  INTERVALS: {
    STREAM_CHECK: 45 * 60 * 1000,      // 45 minutes
    CONTEXT_CLEANUP: 30 * 60 * 1000,   // 30 minutes
    KEEP_ALIVE: 25 * 60 * 1000,        // 25 minutes
    MIN_POLL_INTERVAL: 12000,          // 12 seconds
    MAX_BACKOFF: 300000                // 5 minutes
  }
};