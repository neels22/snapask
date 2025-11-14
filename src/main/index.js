/**
 * SnapAsk - Main Process Entry Point
 * AI-powered screenshot assistant for macOS
 * @module main
 */

require('dotenv').config();
const { app } = require('electron');
const Logger = require('./utils/logger');
const { handleUncaughtError } = require('./utils/errorHandler');

// Services
const AIService = require('./services/AIService');
const WindowManager = require('./services/WindowManager');
const ScreenshotService = require('./services/ScreenshotService');
const StorageService = require('./services/StorageService');

// Handlers
const { setupIpcHandlers, removeIpcHandlers } = require('./handlers/ipcHandlers');
const { setupShortcuts, unregisterShortcuts } = require('./handlers/shortcutHandlers');

// Initialize logger
const logger = new Logger('Main');

// Initialize services
const aiService = new AIService();
const windowManager = new WindowManager();
const screenshotService = new ScreenshotService();
const storageService = new StorageService();

/**
 * Initialize application on ready
 */
app.whenReady().then(() => {
  try {
    logger.success('SnapAsk is ready!');

    // Check if user has completed onboarding
    const hasCompletedOnboarding = storageService.hasCompletedOnboarding();
    const apiKey = storageService.getApiKey();

    if (!hasCompletedOnboarding || !apiKey) {
      logger.info('First run detected, showing onboarding');
      windowManager.createOnboardingWindow();
    } else {
      // Initialize AI with stored key
      aiService.initialize(apiKey);
    }

    // Setup IPC handlers
    setupIpcHandlers(windowManager, aiService, storageService);

    // Setup global shortcuts
    setupShortcuts(screenshotService, windowManager, storageService, aiService);

    logger.success('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error);
    handleUncaughtError(error, 'App Initialization');
  }
});

/**
 * Handle app quit
 */
app.on('will-quit', () => {
  logger.info('Application quitting');
  unregisterShortcuts();
  removeIpcHandlers();
});

/**
 * Handle all windows closed
 * Don't quit on macOS when all windows are closed
 */
app.on('window-all-closed', (e) => {
  logger.debug('All windows closed');
  e.preventDefault();
  // Don't quit - this is a menu bar app that should stay running
});

/**
 * Handle before quit
 */
app.on('before-quit', () => {
  logger.debug('Before quit event');
  app.isQuitting = true;
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  handleUncaughtError(error, 'Uncaught Exception');
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason);
  handleUncaughtError(reason, 'Unhandled Rejection');
});

logger.info('Main process started');

