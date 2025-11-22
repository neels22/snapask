/**
 * SnapAsk - Main Process Entry Point
 * AI-powered screenshot assistant for macOS
 * @module main
 */

require('dotenv').config();
const path = require('path');
const { app, nativeImage } = require('electron');
const Logger = require('./utils/logger');
const { handleUncaughtError } = require('./utils/errorHandler');

// Services
const AIService = require('./services/AIService');
const WindowManager = require('./services/WindowManager');
const ScreenshotService = require('./services/ScreenshotService');
const StorageService = require('./services/StorageService');
const DatabaseService = require('./services/DatabaseService');
const ConversationService = require('./services/ConversationService');
const UpdateService = require('./services/UpdateService');

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
const databaseService = new DatabaseService();
const updateService = new UpdateService();
let conversationService = null; // Initialized after database is ready

/**
 * Resolve icon path for dev & packaged builds
 * @param {string} fileName
 * @returns {string}
 */
const getIconPath = (...segments) => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments);
  }

  return path.join(__dirname, '..', '..', ...segments);
};

/**
 * Create a native image from disk (with optional fallback)
 * @param {string} iconFile - relative path under resources/icons
 * @param {string} [fallbackFile] - optional fallback icon file
 * @returns {{ image: Electron.NativeImage, resolvedPath: string }}
 */
const createNativeIcon = (iconFile, fallbackFile) => {
  const tryCreate = (file) => {
    if (!file) {
      return { image: null, path: null };
    }
    const resolvedPath = getIconPath('resources', 'icons', file);
    const image = nativeImage.createFromPath(resolvedPath);
    if (!image || image.isEmpty()) {
      return { image: null, path: resolvedPath };
    }
    return { image, path: resolvedPath };
  };

  let attempt = tryCreate(iconFile);
  if (!attempt.image && fallbackFile) {
    attempt = tryCreate(fallbackFile);
  }

  if (!attempt.image) {
    const attemptedPaths = [iconFile ? getIconPath('resources', 'icons', iconFile) : null]
      .concat(fallbackFile ? getIconPath('resources', 'icons', fallbackFile) : null)
      .filter(Boolean)
      .join(', ');
    throw new Error(`Icon files not found or invalid: ${attemptedPaths}`);
  }

  return { image: attempt.image, resolvedPath: attempt.path };
};

/**
 * Initialize application on ready
 */
app.whenReady().then(() => {
  try {
    logger.success('SnapAsk is ready!');

    if (process.platform === 'darwin') {
      try {
        const { image: dockIcon, resolvedPath } = createNativeIcon('image4.icns', 'image6.png');
        app.dock.setIcon(dockIcon);
        logger.debug(`Dock icon set from ${resolvedPath}`);
      } catch (dockError) {
        logger.warn('Failed to set dock icon', dockError);
      }
    }

    // Initialize database
    try {
      databaseService.initialize();
      conversationService = new ConversationService(databaseService);
      logger.success('Database services initialized');
    } catch (dbError) {
      logger.error('Failed to initialize database (non-critical)', dbError);
      // App can continue without database, but conversations won't be saved
    }

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

    // Setup IPC handlers (pass conversationService)
    setupIpcHandlers(windowManager, aiService, storageService, conversationService);

    // Setup global shortcuts
    setupShortcuts(screenshotService, windowManager, storageService, aiService);

    // Start auto-update checking (only in production)
    updateService.startAutoUpdateCheck();

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
  
  // Close database connection
  if (databaseService) {
    try {
      databaseService.close();
    } catch (error) {
      logger.error('Error closing database', error);
    }
  }
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
 * Handle app activation (dock click on macOS)
 * Opens the main window when user clicks dock icon
 */
app.on('activate', () => {
  logger.info('App activated (dock click)');
  
  // Check if any window is already open
  const hasMainWindow = windowManager.getMainAppWindow() && !windowManager.getMainAppWindow().isDestroyed();
  const hasOnboardingWindow = windowManager.getOnboardingWindow() && !windowManager.getOnboardingWindow().isDestroyed();
  const hasFloatingWindow = windowManager.getFloatingWindow() && !windowManager.getFloatingWindow().isDestroyed();
  
  if (hasMainWindow || hasOnboardingWindow || hasFloatingWindow) {
    // Focus existing window (prioritize main app window)
    if (hasMainWindow) {
      logger.debug('Focusing existing main app window');
      windowManager.getMainAppWindow().focus();
      windowManager.getMainAppWindow().moveTop();
    } else if (hasOnboardingWindow) {
      logger.debug('Focusing existing onboarding window');
      windowManager.getOnboardingWindow().focus();
    } else if (hasFloatingWindow) {
      logger.debug('Focusing existing floating window');
      windowManager.getFloatingWindow().focus();
    }
    return;
  }
  
  // No windows open, check if we should show onboarding or main window
  const hasCompletedOnboarding = storageService.hasCompletedOnboarding();
  const apiKey = storageService.getApiKey();
  
  if (!hasCompletedOnboarding || !apiKey) {
    logger.info('Onboarding not complete, showing onboarding window');
    windowManager.createOnboardingWindow();
  } else {
    logger.info('Opening main app window from dock click');
    // Open main window with no conversation data
    windowManager.createMainAppWindow(null);
  }
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
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
  handleUncaughtError(reason, 'Unhandled Rejection');
});

logger.info('Main process started');

