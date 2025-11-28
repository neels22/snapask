/**
 * IPC Handlers
 * Handles all IPC communication between main and renderer processes
 * @module ipcHandlers
 */

const { ipcMain, clipboard } = require('electron');
const Logger = require('../utils/logger');
const { IPC_CHANNELS, AI } = require('../config/constants');

const logger = new Logger('IPCHandlers');

/**
 * Setup all IPC handlers
 * @param {WindowManager} windowManager - Window manager instance
 * @param {AIService} aiService - AI service instance
 * @param {StorageService} storageService - Storage service instance
 * @param {ConversationService} conversationService - Conversation service instance
 */
function setupIpcHandlers(windowManager, aiService, storageService, conversationService) {
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
   * Accepts either old format (apiKey string) or new format ({ apiKey, provider, model })
   */
  ipcMain.handle(IPC_CHANNELS.SAVE_API_KEY, async (event, data) => {
    logger.info('Save API key requested');
    try {
      // Backward compatibility: handle old format (just apiKey string)
      let apiKey, provider, model;
      if (typeof data === 'string') {
        apiKey = data;
        provider = null;
        model = null;
      } else {
        apiKey = data?.apiKey;
        provider = data?.provider;
        model = data?.model;
      }

      const success = storageService.saveApiKey(apiKey);
      if (success) {
        // Save provider and model if provided
        if (provider) {
          storageService.saveAiProvider(provider);
        }
        if (model) {
          storageService.saveAiModel(model);
        }

        storageService.setOnboardingCompleted();

        // Reinitialize AI with new key, provider, and model
        const providerType = provider || storageService.getAiProvider() || AI.DEFAULT_PROVIDER;
        const selectedModel = model || storageService.getAiModel() || AI.DEFAULT_MODEL;
        aiService.initialize(providerType, apiKey, selectedModel);

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
   * Returns { apiKey, provider, model } object
   */
  ipcMain.handle(IPC_CHANNELS.GET_API_KEY, () => {
    const apiKey = storageService.getApiKey();
    const provider = storageService.getAiProvider();
    const model = storageService.getAiModel();
    logger.debug('API key requested', { exists: !!apiKey, provider, model });
    
    // Backward compatibility: if only apiKey exists, return just the string
    // Otherwise return object
    if (apiKey && !provider && !model) {
      return apiKey;
    }
    
    return { apiKey, provider, model };
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
      const provider = storageService.getAiProvider() || AI.DEFAULT_PROVIDER;
      const model = storageService.getAiModel() || AI.DEFAULT_MODEL;
      aiService.initialize(provider, apiKey, model);
    }

    // Process AI request
    return aiService.generateResponse(prompt, imageDataUrl);
  });

  /**
   * Handle copy to clipboard request
   */
  ipcMain.handle(IPC_CHANNELS.COPY_TO_CLIPBOARD, (event, text) => {
    logger.debug('Copy to clipboard requested');
    try {
      clipboard.writeText(text);
      logger.success('Text copied to clipboard');
      return { success: true };
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // CONVERSATION MANAGEMENT HANDLERS
  // ============================================

  /**
   * Save entire conversation (from popup to database)
   */
  ipcMain.handle(IPC_CHANNELS.SAVE_CONVERSATION, async (event, conversationData) => {
    logger.info('Save conversation requested');
    try {
      const { screenshot, conversation } = conversationData;

      // Only require conversation array, screenshot is optional
      if (!conversation || conversation.length === 0) {
        return { success: false, error: 'Invalid conversation data' };
      }

      const result = conversationService.saveCompleteConversation(screenshot || null, conversation);

      logger.success(`Conversation saved: ${result.id}`);
      return {
        success: true,
        conversationId: result.id,
        created_at: result.created_at
      };
    } catch (error) {
      logger.error('Failed to save conversation', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Load all conversations (for list view)
   */
  ipcMain.handle(IPC_CHANNELS.LOAD_CONVERSATIONS, async (event, { limit, offset, filters }) => {
    logger.debug('Load conversations requested', { limit, offset, filters });
    try {
      const conversations = conversationService.getAllConversations(limit || 100, offset || 0, filters || {});
      return {
        success: true,
        conversations
      };
    } catch (error) {
      logger.error('Failed to load conversations', error);
      return { success: false, error: error.message, conversations: [] };
    }
  });

  /**
   * Load single conversation with all messages
   */
  ipcMain.handle(IPC_CHANNELS.LOAD_CONVERSATION, async (event, conversationId) => {
    logger.info(`Load conversation requested: ${conversationId}`);
    try {
      const conversation = conversationService.getConversationWithMessages(conversationId);

      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }

      return {
        success: true,
        conversation
      };
    } catch (error) {
      logger.error('Failed to load conversation', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Save individual message to existing conversation
   */
  ipcMain.handle(IPC_CHANNELS.SAVE_MESSAGE, async (event, { conversationId, role, content, error }) => {
    logger.debug(`Save message requested for conversation: ${conversationId}`);
    try {
      const result = conversationService.saveMessage(conversationId, role, content, error || false);
      return {
        success: true,
        messageId: result.id,
        timestamp: result.timestamp
      };
    } catch (err) {
      logger.error('Failed to save message', err);
      return { success: false, error: err.message };
    }
  });

  /**
   * Delete conversation
   */
  ipcMain.handle(IPC_CHANNELS.DELETE_CONVERSATION, async (event, conversationId) => {
    logger.info(`Delete conversation requested: ${conversationId}`);
    try {
      conversationService.deleteConversation(conversationId);
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete conversation', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update conversation properties
   */
  ipcMain.handle(IPC_CHANNELS.UPDATE_CONVERSATION, async (event, { conversationId, updates }) => {
    logger.debug(`Update conversation requested: ${conversationId}`);
    try {
      conversationService.updateConversation(conversationId, updates);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update conversation', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get available AI providers and models
   */
  ipcMain.handle('get-ai-providers', () => {
    logger.debug('Get AI providers requested');
    return {
      success: true,
      providers: AI.PROVIDERS,
      defaultProvider: AI.DEFAULT_PROVIDER,
    };
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

