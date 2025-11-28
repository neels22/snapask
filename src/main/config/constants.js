/**
 * Application-wide constants
 * @module constants
 */

module.exports = {
  // Window dimensions
  WINDOW_SIZES: {
    FLOATING: { width: 420, height: 380 },
    MAIN_APP: { width: 900, height: 700, minWidth: 600, minHeight: 500 },
    ONBOARDING: { width: 600, height: 600 },
  },

  // Global shortcuts
  SHORTCUTS: {
    SCREENSHOT: 'Command+Shift+S',
  },

  // AI Configuration
  AI: {
    // Default provider and model
    DEFAULT_PROVIDER: 'google',
    DEFAULT_MODEL: 'gemini-2.0-flash',
    
    // Provider configurations
    PROVIDERS: {
      google: {
        name: 'Google Gemini',
        models: [
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        ],
        supportsImage: true,
        langchainPackage: '@langchain/google-genai',
      },
      openai: {
        name: 'OpenAI',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ],
        supportsImage: true,
        langchainPackage: '@langchain/openai',
      },
      anthropic: {
        name: 'Anthropic Claude',
        models: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        ],
        supportsImage: true,
        langchainPackage: '@langchain/anthropic',
      },
    },
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
  },

  // Storage keys
  STORAGE_KEYS: {
    API_KEY: 'apiKey',
    AI_PROVIDER: 'aiProvider',
    AI_MODEL: 'aiModel',
    HAS_COMPLETED_ONBOARDING: 'hasCompletedOnboarding',
  },

  // Database Configuration
  DATABASE: {
    NAME: 'conversations.db',
    VERSION: 1,
  },

  // IPC Channels
  IPC_CHANNELS: {
    SCREENSHOT_CAPTURED: 'screenshot-captured',
    CLOSE_WINDOW: 'close-window',
    OPEN_MAIN_APP: 'open-main-app',
    CLOSE_APP_WINDOW: 'close-app-window',
    ASK_AI: 'ask-ai',
    APP_DATA: 'app-data',
    SAVE_API_KEY: 'save-api-key',
    GET_API_KEY: 'get-api-key',
    CLOSE_ONBOARDING: 'close-onboarding',
    COPY_TO_CLIPBOARD: 'copy-to-clipboard',
    // Conversation Management
    SAVE_CONVERSATION: 'save-conversation',
    LOAD_CONVERSATIONS: 'load-conversations',
    LOAD_CONVERSATION: 'load-conversation',
    SAVE_MESSAGE: 'save-message',
    DELETE_CONVERSATION: 'delete-conversation',
    UPDATE_CONVERSATION: 'update-conversation',
  },

  // Window positioning
  WINDOW_OFFSETS: {
    CURSOR_X: 12,
    CURSOR_Y: 12,
    MIN_Y: 40,
  },
};

