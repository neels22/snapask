/**
 * Window configuration factory
 * Provides consistent window configurations for all window types
 * @module windowConfig
 */

const { WINDOW_SIZES } = require('./constants');

/**
 * Get common webPreferences configuration
 * @param {string} preloadPath - Path to preload script
 * @returns {object} Common web preferences
 */
const getCommonConfig = (preloadPath) => ({
  webPreferences: {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
  },
});

/**
 * Get configuration for floating window (popup)
 * @param {string} preloadPath - Path to preload script
 * @returns {object} BrowserWindow configuration
 */
const getFloatingWindowConfig = (preloadPath) => ({
  ...WINDOW_SIZES.FLOATING,
  type: 'panel', // Makes it behave like macOS NSPanel - prevents Space switching
  frame: false,
  alwaysOnTop: true,
  transparent: true,
  resizable: false,
  movable: true,
  skipTaskbar: true,
  show: false, // Don't show immediately - use showInactive() instead
  visibleOnAllWorkspaces: true, // Appear on current Space/Desktop
  ...getCommonConfig(preloadPath),
});

/**
 * Get configuration for main app window
 * @param {string} preloadPath - Path to preload script
 * @returns {object} BrowserWindow configuration
 */
const getMainAppWindowConfig = (preloadPath) => ({
  ...WINDOW_SIZES.MAIN_APP,
  frame: true,
  backgroundColor: '#1a1a1a',
  show: false,
  ...getCommonConfig(preloadPath),
});

/**
 * Get configuration for onboarding window
 * @param {string} preloadPath - Path to preload script
 * @returns {object} BrowserWindow configuration
 */
const getOnboardingWindowConfig = (preloadPath) => ({
  ...WINDOW_SIZES.ONBOARDING,
  frame: true,
  backgroundColor: '#ffffff',
  show: false,
  resizable: false,
  ...getCommonConfig(preloadPath),
});

module.exports = {
  getFloatingWindowConfig,
  getMainAppWindowConfig,
  getOnboardingWindowConfig,
};

