/**
 * IPC Handlers
 * Handles all IPC communication between main and renderer processes
 * @module ipcHandlers
 */

const { ipcMain } = require('electron');
const Logger = require('../utils/logger');
const { IPC_CHANNELS } = require('../config/constants');

const logger = new Logger('IPCHandlers');

/**
 * Setup all IPC handlers
 * @param {WindowManager} windowManager - Window manager instance
 * @param {AIService} aiService - AI service instance
 * @param {StorageService} storageService - Storage service instance
 */
function setupIpcHandlers(windowManager, aiService, storageService) {
  logger.info('Setting up IPC handlers');

  /**
   * Handle close window request
   */
  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
    logger.debug('Close window requested');
    if (windowManager.getFloatingWindow()) {
      windowManager.getFloatingWindow().close();
    }
  });

  /**
   * Handle open main app request
   */
  ipcMain.on(IPC_CHANNELS.OPEN_MAIN_APP, (event, conversationData) => {
    logger.info('Open main app requested');
    logger.debug('Conversation data', {
      hasScreenshot: !!conversationData?.screenshot,
      conversationLength: conversationData?.conversation?.length || 0,
    });
    try {
      windowManager.createMainAppWindow(conversationData);
    } catch (error) {
      logger.error('Failed to open main app', error);
    }
  });

  /**
   * Handle close app window request
   */
  ipcMain.on(IPC_CHANNELS.CLOSE_APP_WINDOW, () => {
    logger.debug('Close app window requested');
    windowManager.closeMainAppWindow();
  });

  /**
   * Handle close onboarding window request
   */
  ipcMain.on(IPC_CHANNELS.CLOSE_ONBOARDING, () => {
    logger.debug('Close onboarding requested');
    windowManager.closeOnboardingWindow();
  });

  /**
   * Handle save API key request
   */
  ipcMain.handle(IPC_CHANNELS.SAVE_API_KEY, async (event, apiKey) => {
    logger.info('Save API key requested');
    try {
      const success = storageService.saveApiKey(apiKey);
      if (success) {
        storageService.setOnboardingCompleted();
        // Reinitialize AI with new key
        aiService.initialize(apiKey);
        logger.success('API key saved and AI initialized');
        return { success: true };
      }
      return { success: false, error: 'Failed to save API key' };
    } catch (error) {
      logger.error('Error saving API key', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Handle get API key request
   */
  ipcMain.handle(IPC_CHANNELS.GET_API_KEY, () => {
    const apiKey = storageService.getApiKey();
    logger.debug('API key requested', { exists: !!apiKey });
    return apiKey;
  });

  /**
   * Handle AI query request
   */
  ipcMain.handle(IPC_CHANNELS.ASK_AI, async (event, { prompt, imageDataUrl }) => {
    logger.info('AI query requested');

    // Check if AI is initialized
    if (!aiService.isInitialized()) {
      const apiKey = storageService.getApiKey();
      if (!apiKey) {
        logger.warn('AI query failed: No API key configured');
        return {
          success: false,
          error: 'API key not configured. Please restart the app and enter your API key.',
        };
      }
      aiService.initialize(apiKey);
    }

    // Process AI request
    return aiService.generateResponse(prompt, imageDataUrl);
  });

  logger.success('IPC handlers setup complete');
}

/**
 * Remove all IPC handlers (cleanup)
 */
function removeIpcHandlers() {
  logger.info('Removing IPC handlers');
  Object.values(IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeAllListeners(channel);
  });
}

module.exports = {
  setupIpcHandlers,
  removeIpcHandlers,
};

