const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose safe IPC methods to the renderer process
 * This bridges the main process and renderer while maintaining security
 */
contextBridge.exposeInMainWorld('snapask', {
  // Receive screenshot data from main process
  onScreenshot: (callback) => {
    ipcRenderer.on('screenshot-captured', (event, dataUrl) => {
      callback(dataUrl);
    });
  },
  
  // Send close request to main process
  closeWindow: () => {
    ipcRenderer.send('close-window');
  },
  
  // Open main app window with conversation data
  openMainApp: (conversationData) => {
    ipcRenderer.send('open-main-app', conversationData);
  }
});

