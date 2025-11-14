/**
 * Shortcut Handlers
 * Handles global keyboard shortcuts
 * @module shortcutHandlers
 */

const { globalShortcut } = require('electron');
const Logger = require('../utils/logger');
const { SHORTCUTS } = require('../config/constants');

const logger = new Logger('ShortcutHandlers');

/**
 * Setup global shortcuts
 * @param {ScreenshotService} screenshotService - Screenshot service instance
 * @param {WindowManager} windowManager - Window manager instance
 * @param {StorageService} storageService - Storage service instance
 * @param {AIService} aiService - AI service instance
 */
function setupShortcuts(screenshotService, windowManager, storageService, aiService) {
  logger.info('Setting up global shortcuts');

  // Register screenshot shortcut
  const registered = globalShortcut.register(SHORTCUTS.SCREENSHOT, async () => {
    logger.debug('Screenshot shortcut triggered');

    // Check if API key exists before allowing screenshot
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      logger.warn('No API key configured, showing onboarding');
      windowManager.createOnboardingWindow();
      return;
    }

    // Initialize AI if not already done
    if (!aiService.isInitialized()) {
      aiService.initialize(apiKey);
    }

    // Capture screenshot
    const result = await screenshotService.captureInteractive();
    if (result.success) {
      windowManager.createFloatingWindow(result.dataUrl);
    } else if (result.error !== 'No image captured') {
      // Don't log if user cancelled
      logger.warn('Screenshot capture failed', result.error);
    }
  });

  if (registered) {
    logger.success(`Global shortcut registered: ${SHORTCUTS.SCREENSHOT}`);
  } else {
    logger.error(`Failed to register global shortcut: ${SHORTCUTS.SCREENSHOT}`);
  }

  // Check if shortcut is registered
  const isRegistered = globalShortcut.isRegistered(SHORTCUTS.SCREENSHOT);
  logger.debug('Shortcut registration status', { isRegistered });

  return registered;
}

/**
 * Unregister all global shortcuts (cleanup)
 */
function unregisterShortcuts() {
  logger.info('Unregistering all global shortcuts');
  globalShortcut.unregisterAll();
}

module.exports = {
  setupShortcuts,
  unregisterShortcuts,
};

