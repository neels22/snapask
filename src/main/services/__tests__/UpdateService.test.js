/**
 * Unit tests for UpdateService
 */

jest.mock('electron-updater');
jest.mock('electron');
jest.mock('../../utils/logger', () => require('../../__tests__/__mocks__/logger'));

const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');
const UpdateService = require('../UpdateService');

// Setup mocks - Jest will automatically use __mocks__/electron.js
// But we need to ensure dialog methods are jest.fn() for assertions
if (!jest.isMockFunction(dialog.showMessageBox)) {
  dialog.showMessageBox = jest.fn(dialog.showMessageBox);
}
if (!jest.isMockFunction(dialog.showErrorBox)) {
  dialog.showErrorBox = jest.fn();
}

describe('UpdateService', () => {
  let updateService;
  let Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset app.isPackaged
    app.setPackaged(true);
    
    // Get mocked Logger
    Logger = require('../../utils/logger');
    
    // Reset autoUpdater mock
    if (autoUpdater.reset) {
      autoUpdater.reset();
    }
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on = jest.fn();
    autoUpdater.checkForUpdatesAndNotify = jest.fn(() => Promise.resolve({ updateInfo: null }));
    autoUpdater.quitAndInstall = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (updateService) {
      updateService.stopAutoUpdateCheck();
    }
  });

  describe('Initialization', () => {
    test('should initialize in production mode', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      
      expect(autoUpdater.autoDownload).toBe(true);
      expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
      expect(autoUpdater.on).toHaveBeenCalled();
    });

    test('should skip initialization in development mode', () => {
      app.setPackaged(false);
      updateService = new UpdateService();
      
      // Get the logger instance created by UpdateService
      const loggerInstance = updateService.logger;
      expect(loggerInstance.info).toHaveBeenCalledWith('Skipping update check in development mode');
    });

    test('should set up event handlers in production', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      
      // Verify event handlers are registered
      expect(autoUpdater.on).toHaveBeenCalledWith('checking-for-update', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
    });
  });

  describe('startAutoUpdateCheck', () => {
    test('should start update checking in production mode', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      updateService.checkForUpdates = jest.fn();
      
      updateService.startAutoUpdateCheck();
      
      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);
      
      expect(updateService.checkForUpdates).toHaveBeenCalled();
      expect(updateService.logger.info).toHaveBeenCalledWith('Auto-update check started');
    });

    test('should not start update checking in development mode', () => {
      app.setPackaged(false);
      updateService = new UpdateService();
      updateService.checkForUpdates = jest.fn();
      
      updateService.startAutoUpdateCheck();
      
      jest.advanceTimersByTime(30000);
      
      expect(updateService.checkForUpdates).not.toHaveBeenCalled();
    });

    test('should set up periodic checking every 4 hours', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      updateService.checkForUpdates = jest.fn();
      
      updateService.startAutoUpdateCheck();
      
      // Fast-forward initial 30 seconds
      jest.advanceTimersByTime(30000);
      expect(updateService.checkForUpdates).toHaveBeenCalledTimes(1);
      
      // Fast-forward 4 hours
      jest.advanceTimersByTime(4 * 60 * 60 * 1000);
      expect(updateService.checkForUpdates).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkForUpdates', () => {
    test('should call autoUpdater.checkForUpdatesAndNotify', async () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      autoUpdater.checkForUpdatesAndNotify.mockResolvedValue({ updateInfo: null });
      
      await updateService.checkForUpdates();
      
      expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
    });

    test('should handle errors silently', async () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      const error = new Error('Network error');
      autoUpdater.checkForUpdatesAndNotify.mockRejectedValue(error);
      
      await updateService.checkForUpdates();
      
      expect(updateService.logger.error).toHaveBeenCalledWith('Failed to check for updates:', error);
    });
  });

  describe('stopAutoUpdateCheck', () => {
    test('should clear update check interval', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      updateService.checkForUpdates = jest.fn();
      
      updateService.startAutoUpdateCheck();
      expect(updateService.updateCheckInterval).toBeTruthy();
      
      updateService.stopAutoUpdateCheck();
      expect(updateService.updateCheckInterval).toBeNull();
    });
  });

  describe('Event Handlers', () => {
    let eventHandlers;

    beforeEach(() => {
      app.setPackaged(true);
      updateService = new UpdateService();
      
      // Capture event handlers
      eventHandlers = {};
      autoUpdater.on.mock.calls.forEach(([event, handler]) => {
        eventHandlers[event] = handler;
      });
    });

    test('should log when checking for update', () => {
      eventHandlers['checking-for-update']();
      expect(updateService.logger.info).toHaveBeenCalledWith('Checking for updates...');
    });

    test('should log when update is available', () => {
      const info = { version: '0.4.0' };
      eventHandlers['update-available'](info);
      expect(updateService.logger.info).toHaveBeenCalledWith('Update available:', info.version);
    });

    test('should log when update is not available', () => {
      const info = { version: '0.3.0' };
      eventHandlers['update-not-available'](info);
      expect(updateService.logger.info).toHaveBeenCalledWith('Update not available. Current version is latest.');
    });

    test('should handle errors silently', () => {
      const error = new Error('Update check failed');
      eventHandlers['error'](error);
      expect(updateService.logger.error).toHaveBeenCalledWith('Error in auto-updater:', error);
    });

    test('should log download progress', () => {
      const progressObj = { percent: 50 };
      eventHandlers['download-progress'](progressObj);
      expect(updateService.logger.debug).toHaveBeenCalledWith('Download progress: 50%');
    });

    test('should show dialog when update is downloaded', async () => {
      dialog.showMessageBox.mockResolvedValue({ response: 1 }); // Later
      const info = { version: '0.4.0' };
      
      await eventHandlers['update-downloaded'](info);
      
      expect(updateService.logger.info).toHaveBeenCalledWith('Update downloaded:', info.version);
      expect(dialog.showMessageBox).toHaveBeenCalledWith({
        type: 'info',
        title: 'Update Ready',
        message: 'SnapAsk 0.4.0 has been downloaded.',
        detail: 'The update will be installed when you quit the app, or you can restart now.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 1,
        cancelId: 1
      });
    });

    test('should quit and install when user chooses Restart Now', async () => {
      dialog.showMessageBox.mockResolvedValue({ response: 0 }); // Restart Now
      const info = { version: '0.4.0' };
      
      await eventHandlers['update-downloaded'](info);
      
      expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
    });

    test('should not quit when user chooses Later', async () => {
      dialog.showMessageBox.mockResolvedValue({ response: 1 }); // Later
      const info = { version: '0.4.0' };
      
      await eventHandlers['update-downloaded'](info);
      
      expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });
  });
});

