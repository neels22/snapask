# IPC Communication: Renderer → Preload → Main Process

This document explains how Inter-Process Communication (IPC) works in this Electron application, covering the flow from the renderer process (UI) through the preload script to the main process.

## Table of Contents
- [What is IPC?](#what-is-ipc)
- [Architecture Overview](#architecture-overview)
- [Two Types of IPC Communication](#two-types-of-ipc-communication)
- [How UI Connects to IPC](#how-ui-connects-to-ipc)
- [Real Examples from Codebase](#real-examples-from-codebase)
- [Key Concepts](#key-concepts)
- [Summary](#summary)

---

## What is IPC?

**IPC (Inter-Process Communication)** is the mechanism that allows the renderer process (your UI) and main process to communicate with each other. In Electron:

- **Main Process**: Runs Node.js, has full system access, handles OS APIs, file system, window management
- **Renderer Process**: Runs Chromium, executes your React UI, has limited system access for security

Since these run in separate processes, they need IPC to communicate.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN PROCESS                         │
│  (Node.js - Full System Access)                        │
│                                                         │
│  ┌──────────────────────────────────────┐             │
│  │     ipcHandlers.js                   │             │
│  │  - ipcMain.on()                      │             │
│  │  - ipcMain.handle()                  │             │
│  └──────────────────────────────────────┘             │
│           ▲                    │                       │
│           │                    │                       │
│           │ IPC Messages       │ IPC Messages          │
│           │                    │                       │
└───────────┼────────────────────┼───────────────────────┘
            │                    │
            │                    │
            │                    │
┌───────────┼────────────────────┼───────────────────────┐
│           │                    │                       │
│           │                    ▼                       │
│  ┌────────┴──────────────────────────┐               │
│  │      preload.js                    │               │
│  │  - contextBridge.exposeInMainWorld │               │
│  │  - ipcRenderer.send()              │               │
│  │  - ipcRenderer.invoke()            │               │
│  └────────────────────────────────────┘               │
│           ▲                    │                       │
│           │                    │                       │
│           │ window.snapask     │                       │
│           │                    │                       │
│  ┌────────┴────────────────────┴──────┐               │
│  │      RENDERER PROCESS              │               │
│  │  (React UI - Browser Environment)  │               │
│  │                                    │               │
│  │  App.jsx, popup/App.jsx           │               │
│  └────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## Two Types of IPC Communication

### 1. One-Way: `send` / `on` (Fire and Forget)

**Main Process listens:**
```javascript
// In ipcHandlers.js
ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
  windowManager.getFloatingWindow().close();
});
```

**UI sends:**
```javascript
// In preload.js
closeWindow: () => {
  ipcRenderer.send('close-window');
}

// In UI (App.jsx)
window.snapask.closeWindow();
```

**Use for:** Simple actions that don't need a response (close window, open window)

---

### 2. Two-Way: `invoke` / `handle` (Request/Response)

**Main Process handles:**
```javascript
// In ipcHandlers.js
ipcMain.handle(IPC_CHANNELS.ASK_AI, async (event, { prompt, imageDataUrl }) => {
  return aiService.generateResponse(prompt, imageDataUrl);
});
```

**UI invokes and waits:**
```javascript
// In preload.js
askAI: async (prompt, imageDataUrl) => {
  return await ipcRenderer.invoke('ask-ai', { prompt, imageDataUrl });
}

// In UI (popup/App.jsx)
const result = await window.snapask.askAI(prompt, currentScreenshotDataUrl);
if (result.success) {
  setAnswerText(result.text);
}
```

**Use for:** Operations that need a response (API calls, database queries, file operations)

---

## How UI Connects to IPC

### Step 1: Preload Script Exposes API

The `preload.js` file uses `contextBridge` to safely expose IPC methods to the renderer:

```javascript
contextBridge.exposeInMainWorld('snapask', {
  askAI: async (prompt, imageDataUrl) => {
    return await ipcRenderer.invoke('ask-ai', { prompt, imageDataUrl });
  },
  closeWindow: () => {
    ipcRenderer.send('close-window');
  },
  // ... more methods
});
```

This creates `window.snapask` object in the renderer process.

---

### Step 2: UI Calls the Exposed Methods

In React components, you simply call methods on `window.snapask`:

```javascript
// Example from popup/App.jsx
const handleAsk = async () => {
  const result = await window.snapask.askAI(prompt, currentScreenshotDataUrl);
  // Handle result...
};

const handleClose = () => {
  window.snapask.closeWindow();
};
```

---

### Step 3: Main Process Handles the Request

The `ipcHandlers.js` file registers handlers that process requests:

```javascript
function setupIpcHandlers(windowManager, aiService, storageService, conversationService) {
  // Register all handlers
  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => { /* ... */ });
  ipcMain.handle(IPC_CHANNELS.ASK_AI, async (event, data) => { /* ... */ });
  // ... more handlers
}
```

---

## Real Examples from Codebase

### Example 1: Asking AI (Two-Way Communication)

**Flow:**
1. User clicks "Ask" button → `handleAsk()` function in `popup/App.jsx`
2. UI calls → `window.snapask.askAI(prompt, imageDataUrl)`
3. Preload → `ipcRenderer.invoke('ask-ai', ...)` sends request
4. Main process → `ipcMain.handle('ask-ai', ...)` processes request
5. Main process → Returns result `{ success: true, text: "..." }`
6. UI receives → Updates state with answer

**Code Flow:**
```javascript
// UI: popup/App.jsx line 55
const result = await window.snapask.askAI(prompt, currentScreenshotDataUrl);

// Preload: preload.js line 26-28
askAI: async (prompt, imageDataUrl) => {
  return await ipcRenderer.invoke('ask-ai', { prompt, imageDataUrl });
}

// Handler: ipcHandlers.js line 98-116
ipcMain.handle(IPC_CHANNELS.ASK_AI, async (event, { prompt, imageDataUrl }) => {
  return aiService.generateResponse(prompt, imageDataUrl);
});
```

---

### Example 2: Closing Window (One-Way Communication)

**Flow:**
1. User clicks close button → `handleClose()` function in `popup/App.jsx`
2. UI calls → `window.snapask.closeWindow()`
3. Preload → `ipcRenderer.send('close-window')` sends message
4. Main process → `ipcMain.on('close-window', ...)` receives and closes window

**Code Flow:**
```javascript
// UI: popup/App.jsx line 44
const handleClose = () => {
  window.snapask.closeWindow();
};

// Preload: preload.js line 16-18
closeWindow: () => {
  ipcRenderer.send('close-window');
}

// Handler: ipcHandlers.js line 26-31
ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
  if (windowManager.getFloatingWindow()) {
    windowManager.getFloatingWindow().close();
  }
});
```

---

### Example 3: Listening for Events (One-Way, Main → Renderer)

**Main process sends data to UI:**

```javascript
// Main process sends: WindowManager.js line 103
this.floatingWindow.webContents.send(IPC_CHANNELS.SCREENSHOT_CAPTURED, dataUrl);

// Preload listens: preload.js line 9-13
onScreenshot: (callback) => {
  ipcRenderer.on('screenshot-captured', (event, dataUrl) => {
    callback(dataUrl);
  });
}

// UI subscribes: popup/App.jsx line 21-23
window.snapask.onScreenshot((dataUrl) => {
  setCurrentScreenshotDataUrl(dataUrl);
});
```

---

## Key Concepts

1. **Security**: Preload script uses `contextBridge` to expose only safe methods, preventing direct Node.js access from renderer
2. **Channel Names**: Defined in `constants.js` (`IPC_CHANNELS`) to avoid typos
3. **Async Operations**: Use `invoke`/`handle` for async work; `send`/`on` for simple notifications
4. **Error Handling**: Handlers return `{ success: true/false, error: ... }` for consistent responses

---

## Summary

- **Main Process**: Registers handlers with `ipcMain.on()` or `ipcMain.handle()`
- **Preload**: Bridges IPC using `contextBridge.exposeInMainWorld()`
- **UI**: Calls `window.snapask.methodName()` to communicate
- **Flow**: UI → Preload → IPC → Main Process → Response (if needed)

This pattern keeps your UI isolated while allowing safe access to system features!

---

## File Locations

- **IPC Handlers**: `src/main/handlers/ipcHandlers.js`
- **Preload Script**: `src/renderer/shared/preload/preload.js`
- **Constants**: `src/main/config/constants.js`
- **UI Components**: 
  - `src/renderer/popup/App.jsx`
  - `src/renderer/app/App.jsx`
  - `src/renderer/onboarding/App.jsx`

