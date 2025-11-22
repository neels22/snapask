/**
 * Mock for Electron modules (app, dialog)
 * Provides mock implementations for testing
 * This file is used by Jest's automatic mocking via __mocks__ directory
 */

const EventEmitter = require('events');

class MockApp extends EventEmitter {
  constructor() {
    super();
    this.isPackaged = false;
    this.isQuitting = false;
    this.dock = {
      setIcon: function mockSetIcon() {},
    };
  }

  whenReady() {
    return Promise.resolve();
  }

  quit() {
    this.isQuitting = true;
    this.emit('will-quit');
  }

  // Test helpers
  setPackaged(value) {
    this.isPackaged = value;
  }
}

const mockApp = new MockApp();

// These will be replaced with jest.fn() in tests
const mockDialog = {
  showMessageBox: function mockShowMessageBox(options) {
    // Default to "Later" (index 1) if no response specified
    return Promise.resolve({
      response: options.defaultId !== undefined ? options.defaultId : 1,
      checkboxChecked: false,
    });
  },
  showErrorBox: function mockShowErrorBox() {},
  showOpenDialog: function mockShowOpenDialog() {},
  showSaveDialog: function mockShowSaveDialog() {},
};

const mockNativeImage = {
  createFromPath: function mockCreateFromPath() {
    return {
      isEmpty: function mockIsEmpty() {
        return false;
      },
    };
  },
};

module.exports = {
  app: mockApp,
  dialog: mockDialog,
  nativeImage: mockNativeImage,
};
