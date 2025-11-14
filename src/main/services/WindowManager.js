/**
 * Window Manager Service
 * Manages all Electron windows (floating, main app, onboarding)
 * @class WindowManager
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');
const Logger = require('../utils/logger');
const {
  getFloatingWindowConfig,
  getMainAppWindowConfig,
  getOnboardingWindowConfig,
} = require('../config/window.config');
const { IPC_CHANNELS, WINDOW_OFFSETS } = require('../config/constants');

class WindowManager {
  constructor() {
    this.floatingWindow = null;
    this.mainAppWindow = null;
    this.onboardingWindow = null;
    this.logger = new Logger('WindowManager');
  }

  /**
   * Create and show floating window near cursor
   * @param {string} dataUrl - Screenshot data URL
   */
  createFloatingWindow(dataUrl) {
    try {
      this.logger.info('Creating floating window');

      // Close existing floating window
      this._closeFloatingWindow();

      const cursorPoint = screen.getCursorScreenPoint();

      // Get preload path
      const preloadPath = path.join(__dirname, '../../renderer/shared/preload/preload.js');

      const config = getFloatingWindowConfig(preloadPath);
      const newWindow = new BrowserWindow(config);

      // Update global reference
      this.floatingWindow = newWindow;

      // Position window near cursor
      this._positionFloatingWindow(cursorPoint, config.height);

      // Set window level to float above everything on current Space
      this.floatingWindow.setAlwaysOnTop(true, 'floating', 1);

      // Load the UI
      const htmlPath = path.join(__dirname, '../../renderer/popup/popup.html');
      this.floatingWindow.loadFile(htmlPath);

      // Show window without stealing focus
      this.floatingWindow.once('ready-to-show', () => {
        if (this.floatingWindow && !this.floatingWindow.isDestroyed()) {
          this.floatingWindow.showInactive();
          this.logger.success('Floating window shown');
        }
      });

      // Send screenshot data once loaded
      this.floatingWindow.webContents.once('did-finish-load', () => {
        if (this.floatingWindow && !this.floatingWindow.isDestroyed()) {
          this.floatingWindow.webContents.send(IPC_CHANNELS.SCREENSHOT_CAPTURED, dataUrl);
        }
      });

      // Handle close button from renderer
      this.floatingWindow.on('closed', () => {
        if (this.floatingWindow === newWindow) {
          this.floatingWindow = null;
          this.logger.info('Floating window closed');
        }
      });
    } catch (error) {
      this.logger.error('Failed to create floating window', error);
      throw error;
    }
  }

  /**
   * Create and show main app window
   * @param {object} conversationData - Conversation data to load
   */
  createMainAppWindow(conversationData) {
    try {
      this.logger.info('Creating main app window');

      // Reuse existing window if available
      if (this.mainAppWindow && !this.mainAppWindow.isDestroyed()) {
        this.logger.info('Reusing existing main app window');
        this.mainAppWindow.focus();
        this.mainAppWindow.moveTop();
        this.mainAppWindow.webContents.send(IPC_CHANNELS.APP_DATA, conversationData);
        return;
      }

      // Close floating window
      this._closeFloatingWindow();

      // Get preload path
      const preloadPath = path.join(__dirname, '../../renderer/shared/preload/preload.js');

      const config = getMainAppWindowConfig(preloadPath);
      this.mainAppWindow = new BrowserWindow(config);

      // Center window
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      const x = Math.floor((screenWidth - config.width) / 2);
      const y = Math.floor((screenHeight - config.height) / 2);
      this.mainAppWindow.setPosition(x, y);

      // Load the UI
      const htmlPath = path.join(__dirname, '../../renderer/app/app.html');
      this.mainAppWindow.loadFile(htmlPath);

      // Show when ready
      this.mainAppWindow.once('ready-to-show', () => {
        this.mainAppWindow.show();
        this.mainAppWindow.focus();
        this.mainAppWindow.moveTop();

        // Force show and bring to front (for macOS)
        if (!this.mainAppWindow.isVisible()) {
          this.mainAppWindow.showInactive();
          this.mainAppWindow.show();
        }

        // Ensure window is on top temporarily
        this.mainAppWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          this.mainAppWindow.setAlwaysOnTop(false);
        }, 100);

        this.logger.success('Main app window shown');
      });

      // Send conversation data once loaded
      this.mainAppWindow.webContents.once('did-finish-load', () => {
        this.mainAppWindow.webContents.send(IPC_CHANNELS.APP_DATA, conversationData);
      });

      // Handle window close
      this.mainAppWindow.on('closed', () => {
        this.mainAppWindow = null;
        this.logger.info('Main app window closed');
      });
    } catch (error) {
      this.logger.error('Failed to create main app window', error);
      throw error;
    }
  }

  /**
   * Create and show onboarding window
   */
  createOnboardingWindow() {
    try {
      if (this.onboardingWindow && !this.onboardingWindow.isDestroyed()) {
        this.onboardingWindow.focus();
        return;
      }

      this.logger.info('Creating onboarding window');

      // Get preload path
      const preloadPath = path.join(__dirname, '../../renderer/shared/preload/preload.js');

      const config = getOnboardingWindowConfig(preloadPath);
      this.onboardingWindow = new BrowserWindow(config);

      // Load the UI
      const htmlPath = path.join(__dirname, '../../renderer/onboarding/onboarding.html');
      this.onboardingWindow.loadFile(htmlPath);

      this.onboardingWindow.once('ready-to-show', () => {
        this.onboardingWindow.show();
        this.onboardingWindow.center();
        this.logger.success('Onboarding window shown');
      });

      this.onboardingWindow.on('closed', () => {
        this.onboardingWindow = null;
        this.logger.info('Onboarding window closed');
      });
    } catch (error) {
      this.logger.error('Failed to create onboarding window', error);
      throw error;
    }
  }

  /**
   * Close floating window
   * @private
   */
  _closeFloatingWindow() {
    if (this.floatingWindow && !this.floatingWindow.isDestroyed()) {
      this.floatingWindow.removeAllListeners('closed');
      this.floatingWindow.close();
      this.floatingWindow = null;
      this.logger.debug('Floating window closed');
    }
  }

  /**
   * Position floating window near cursor
   * @private
   * @param {object} cursorPoint - Cursor position {x, y}
   * @param {number} windowHeight - Window height
   */
  _positionFloatingWindow(cursorPoint, windowHeight) {
    const yPos = Math.max(WINDOW_OFFSETS.MIN_Y, cursorPoint.y - windowHeight - WINDOW_OFFSETS.CURSOR_Y);
    this.floatingWindow.setPosition(
      cursorPoint.x + WINDOW_OFFSETS.CURSOR_X,
      yPos
    );
  }

  /**
   * Close main app window
   */
  closeMainAppWindow() {
    if (this.mainAppWindow && !this.mainAppWindow.isDestroyed()) {
      this.mainAppWindow.close();
    }
  }

  /**
   * Close onboarding window
   */
  closeOnboardingWindow() {
    if (this.onboardingWindow && !this.onboardingWindow.isDestroyed()) {
      this.onboardingWindow.close();
    }
  }

  /**
   * Close all windows
   */
  closeAllWindows() {
    this._closeFloatingWindow();
    this.closeMainAppWindow();
    this.closeOnboardingWindow();
  }

  /**
   * Get floating window instance
   * @returns {BrowserWindow|null}
   */
  getFloatingWindow() {
    return this.floatingWindow;
  }

  /**
   * Get main app window instance
   * @returns {BrowserWindow|null}
   */
  getMainAppWindow() {
    return this.mainAppWindow;
  }

  /**
   * Get onboarding window instance
   * @returns {BrowserWindow|null}
   */
  getOnboardingWindow() {
    return this.onboardingWindow;
  }
}

module.exports = WindowManager;

