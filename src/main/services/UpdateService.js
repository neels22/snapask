/**
 * Update Service
 * Handles automatic updates using electron-updater
 * Works seamlessly like Chrome/Notion updates
 * @class UpdateService
 */

const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');
const Logger = require('../utils/logger');

class UpdateService {
  constructor() {
    this.logger = new Logger('UpdateService');
    this.updateCheckInterval = null;
    
    // Configure auto-updater
    autoUpdater.autoDownload = true; // Automatically download updates
    autoUpdater.autoInstallOnAppQuit = true; // Install on app quit
    
    // Only check for updates in production
    if (!app.isPackaged) {
      this.logger.info('Skipping update check in development mode');
      return;
    }
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      this.logger.info('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      this.logger.info('Update available:', info.version);
      // Don't show dialog - download silently in background
    });

    autoUpdater.on('update-not-available', () => {
      this.logger.info('Update not available. Current version is latest.');
    });

    autoUpdater.on('error', (err) => {
      this.logger.error('Error in auto-updater:', err);
      // Silently fail - don't bother user with update errors
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      this.logger.debug(`Download progress: ${percent}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info('Update downloaded:', info.version);
      
      // Show notification that update is ready
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: `SnapAsk ${info.version} has been downloaded.`,
        detail: 'The update will be installed when you quit the app, or you can restart now.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 1, // Default to "Later" so it doesn't interrupt user
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // User chose "Restart Now"
          autoUpdater.quitAndInstall(false, true); // isSilent, isForceRunAfter
        }
        // If "Later", update will install on next app quit
      });
    });
  }

  /**
   * Start checking for updates periodically
   * Checks on startup (after delay) and then every 4 hours
   */
  startAutoUpdateCheck() {
    if (!app.isPackaged) {
      return;
    }

    // Check for updates 30 seconds after app starts
    setTimeout(() => {
      this.checkForUpdates();
    }, 30000);

    // Then check every 4 hours
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, 4 * 60 * 60 * 1000);

    this.logger.info('Auto-update check started');
  }

  /**
   * Manually check for updates (can be called from UI)
   */
  async checkForUpdates() {
    try {
      await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      this.logger.error('Failed to check for updates:', error);
    }
  }

  /**
   * Stop automatic update checks
   */
  stopAutoUpdateCheck() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

module.exports = UpdateService;

