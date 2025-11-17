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
    SCREENSHOT: 'Control+Alt+Command+S',
  },

  // AI Configuration
  AI: {
    MODEL: 'gemini-2.0-flash',
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
  },

  // Storage keys
  STORAGE_KEYS: {
    API_KEY: 'apiKey',
    HAS_COMPLETED_ONBOARDING: 'hasCompletedOnboarding',
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
  },

  // Window positioning
  WINDOW_OFFSETS: {
    CURSOR_X: 12,
    CURSOR_Y: 12,
    MIN_Y: 40,
  },
};

