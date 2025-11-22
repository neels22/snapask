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
  askAI: async (prompt, imageDataUrl) => ipcRenderer.invoke('ask-ai', { prompt, imageDataUrl }),

  // Receive app data from main process (for main app window)
  onAppData: (callback) => {
    ipcRenderer.on('app-data', (event, data) => {
      callback(data);
    });
  },

  // Close app window
  closeAppWindow: () => {
    ipcRenderer.send('close-app-window');
  },

  // Save API key
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),

  // Get API key
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  // Close onboarding window
  closeOnboarding: () => {
    ipcRenderer.send('close-onboarding');
  },

  // Copy text to clipboard
  copyToClipboard: async (text) => ipcRenderer.invoke('copy-to-clipboard', text),

  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================

  // Save entire conversation to database
  saveConversation: async (conversationData) => ipcRenderer.invoke('save-conversation', conversationData),

  // Load all conversations
  loadConversations: async (limit = 100, offset = 0, filters = {}) => ipcRenderer.invoke('load-conversations', { limit, offset, filters }),

  // Load single conversation with messages
  loadConversation: async (conversationId) => ipcRenderer.invoke('load-conversation', conversationId),

  // Save individual message
  saveMessage: async (conversationId, role, content, error = false) => ipcRenderer.invoke('save-message', { conversationId, role, content, error }),

  // Delete conversation
  deleteConversation: async (conversationId) => ipcRenderer.invoke('delete-conversation', conversationId),

  // Update conversation properties
  updateConversation: async (conversationId, updates) => ipcRenderer.invoke('update-conversation', { conversationId, updates })
});

