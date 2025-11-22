/**
 * Mock for electron-updater
 * Provides event emitter functionality for testing update flows
 */

const EventEmitter = require('events');

class MockAutoUpdater extends EventEmitter {
  constructor() {
    super();
    this.autoDownload = true;
    this.autoInstallOnAppQuit = true;
    this.currentVersion = null;
    this.updateInfo = null;
    this.feedURL = null;
  }

  setFeedURL(options) {
    this.feedURL = options;
  }

  checkForUpdatesAndNotify() {
    // Simulate async behavior
    return new Promise((resolve) => {
      setImmediate(() => {
        this.emit('checking-for-update');
        resolve({ updateInfo: this.updateInfo || null });
      });
    });
  }

  checkForUpdates() {
    return this.checkForUpdatesAndNotify();
  }

  quitAndInstall(isSilent, isForceRunAfter) {
    this.emit('quit-and-install', { isSilent, isForceRunAfter });
  }

  // Test helpers
  simulateUpdateAvailable(version = '0.4.0') {
    this.updateInfo = { version };
    this.emit('update-available', { version });
  }

  simulateUpdateNotAvailable() {
    this.emit('update-not-available', { version: '0.3.0' });
  }

  simulateUpdateDownloaded(version = '0.4.0') {
    this.emit('update-downloaded', { version });
  }

  simulateDownloadProgress(percent = 50) {
    this.emit('download-progress', { percent, transferred: 0, total: 100 });
  }

  simulateError(error) {
    this.emit('error', error);
  }

  reset() {
    this.removeAllListeners();
    this.autoDownload = true;
    this.autoInstallOnAppQuit = true;
    this.currentVersion = null;
    this.updateInfo = null;
    this.feedURL = null;
  }
}

const autoUpdater = new MockAutoUpdater();

module.exports = { autoUpdater };

