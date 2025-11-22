/**
 * Integration tests for UpdateService with main process
 */

jest.mock('electron-updater');
jest.mock('electron');

const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');
const UpdateService = require('../services/UpdateService');

// Ensure dialog methods are jest.fn() for assertions
if (!jest.isMockFunction(dialog.showMessageBox)) {
  dialog.showMessageBox = jest.fn(dialog.showMessageBox);
}

describe('UpdateService Integration', () => {
  let updateService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    app.setPackaged(true);
    
    // Reset autoUpdater
    if (autoUpdater.reset) {
      autoUpdater.reset();
    }
    autoUpdater.on = jest.fn();
    autoUpdater.checkForUpdatesAndNotify = jest.fn(() => Promise.resolve({ updateInfo: null }));
  });

  afterEach(() => {
    jest.useRealTimers();
    if (updateService) {
      updateService.stopAutoUpdateCheck();
      updateService = null;
    }
  });

  describe('Main Process Integration', () => {
    test('should initialize UpdateService in production mode', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      
      expect(updateService).toBeDefined();
      expect(updateService.logger).toBeDefined();
      expect(autoUpdater.autoDownload).toBe(true);
      expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
    });

    test('should not initialize update checking in development mode', () => {
      app.setPackaged(false);
      updateService = new UpdateService();
      
      // Should not set up event handlers
      expect(autoUpdater.on).not.toHaveBeenCalled();
    });

    test('should start auto-update check when called', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      updateService.checkForUpdates = jest.fn();
      
      updateService.startAutoUpdateCheck();
      
      // Fast-forward past initial delay
      jest.advanceTimersByTime(30000);
      
      expect(updateService.checkForUpdates).toHaveBeenCalled();
    });

    test('should handle update service lifecycle', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      updateService.checkForUpdates = jest.fn();
      
      // Start
      updateService.startAutoUpdateCheck();
      expect(updateService.updateCheckInterval).toBeTruthy();
      
      // Stop
      updateService.stopAutoUpdateCheck();
      expect(updateService.updateCheckInterval).toBeNull();
    });
  });

  describe('Update Flow End-to-End', () => {
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

    test('should handle complete update flow', async () => {
      // Simulate checking for update
      eventHandlers['checking-for-update']();
      
      // Simulate update available
      eventHandlers['update-available']({ version: '0.4.0' });
      
      // Simulate download progress
      eventHandlers['download-progress']({ percent: 50 });
      eventHandlers['download-progress']({ percent: 100 });
      
      // Simulate update downloaded
      const { dialog: electronDialog } = require('electron');
      electronDialog.showMessageBox.mockResolvedValue({ response: 1 }); // Later
      
      await eventHandlers['update-downloaded']({ version: '0.4.0' });
      
      expect(electronDialog.showMessageBox).toHaveBeenCalled();
    });

    test('should handle update not available flow', () => {
      eventHandlers['checking-for-update']();
      eventHandlers['update-not-available']({ version: '0.3.0' });
      
      // Should not show any dialogs
      const { dialog: electronDialog } = require('electron');
      expect(electronDialog.showMessageBox).not.toHaveBeenCalled();
    });

    test('should handle error flow gracefully', () => {
      const error = new Error('Network error');
      eventHandlers.error(error);
      
      // Should not crash or show error to user
      const { dialog: electronDialog } = require('electron');
      expect(electronDialog.showMessageBox).not.toHaveBeenCalled();
    });
  });

  describe('Production vs Development Mode', () => {
    test('should behave differently in development mode', () => {
      app.setPackaged(false);
      updateService = new UpdateService();
      
      // Should not set up event handlers
      expect(autoUpdater.on).not.toHaveBeenCalled();
      
      // Should not start checking
      updateService.startAutoUpdateCheck();
      expect(updateService.updateCheckInterval).toBeFalsy();
    });

    test('should behave correctly in production mode', () => {
      app.setPackaged(true);
      updateService = new UpdateService();
      
      // Should set up event handlers
      expect(autoUpdater.on).toHaveBeenCalled();
      
      // Should start checking
      updateService.checkForUpdates = jest.fn();
      updateService.startAutoUpdateCheck();
      expect(updateService.updateCheckInterval).toBeTruthy();
    });
  });

  describe('Update Service with Mocked App', () => {
    test('should integrate with app.isPackaged check', () => {
      // Test production mode
      app.setPackaged(true);
      updateService = new UpdateService();
      expect(autoUpdater.on).toHaveBeenCalled();
      
      // Test development mode
      app.setPackaged(false);
      const devUpdateService = new UpdateService();
      // In dev mode, constructor returns early, so we need to check differently
      expect(devUpdateService).toBeDefined();
    });
  });
});

