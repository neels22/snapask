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
  },
  
  // Ask AI about the image
  askAI: async (prompt, imageDataUrl) => {
    return await ipcRenderer.invoke('ask-ai', { prompt, imageDataUrl });
  },
  
  // Receive app data from main process (for main app window)
  onAppData: (callback) => {
    ipcRenderer.on('app-data', (event, data) => {
      callback(data);
    });
  },
  
  // Close app window
  closeAppWindow: () => {
    ipcRenderer.send('close-app-window');
  }
});

