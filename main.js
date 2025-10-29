const path = require('path');
const { app, BrowserWindow, globalShortcut, screen, clipboard, nativeImage, ipcMain } = require('electron');
const { execFile } = require('child_process');

let floatingWindow = null;

/**
 * Create and show the floating chat window near the cursor
 */
function showFloatingWindow(dataUrl) {
  const { x, y } = screen.getCursorScreenPoint();
  
  // Close existing window if open
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.close();
  }
  
  floatingWindow = new BrowserWindow({
    width: 420,
    height: 380,
    type: 'panel',                  // Makes it behave like macOS NSPanel - prevents Space switching
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    show: false,                    // Don't show immediately - use showInactive() instead
    visibleOnAllWorkspaces: true,   // Appear on current Space/Desktop, not a different one
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  // Position near cursor (12px offset, ensure it stays on screen)
  const windowHeight = 380;
  const yPos = Math.max(40, y - windowHeight - 12);
  floatingWindow.setPosition(x + 12, yPos);
  
  // Explicitly set window level to float above everything on current Space
  floatingWindow.setAlwaysOnTop(true, 'floating', 1);
  
  // Load the UI
  floatingWindow.loadFile('renderer.html');
  
  // Show window without stealing focus
  floatingWindow.once('ready-to-show', () => {
    floatingWindow.showInactive();  // Show without activating - stays on current app
  });
  
  // Send screenshot data once loaded
  floatingWindow.webContents.once('did-finish-load', () => {
    floatingWindow.webContents.send('screenshot-captured', dataUrl);
  });
  
  // Handle close button from renderer
  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });
}

/**
 * Capture screenshot using macOS built-in tool
 */
function takeInteractiveScreenshot() {
  console.log('Taking interactive screenshot...');
  
  // Use macOS screencapture tool: -i for interactive, -c to copy to clipboard
  execFile('/usr/sbin/screencapture', ['-i', '-c'], (err) => {
    if (err) {
      console.error('Screenshot capture error:', err);
      return;
    }
    
    // Read image from clipboard
    const img = clipboard.readImage();
    
    if (img.isEmpty()) {
      console.log('No image captured (user may have cancelled)');
      return;
    }
    
    console.log('Screenshot captured successfully');
    
    // Convert to data URL and show floating window
    const dataUrl = img.toDataURL();
    showFloatingWindow(dataUrl);
  });
}

/**
 * Handle IPC messages from renderer
 */
ipcMain.on('close-window', () => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.close();
  }
});

ipcMain.on('open-main-app', (event, conversationData) => {
  // TODO: Implement full app window with conversation history
  console.log('Open main app requested:', conversationData);
  // For now, just close the floating window
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.close();
  }
});

/**
 * App lifecycle
 */
app.whenReady().then(() => {
  console.log('SnapAsk is ready!');
  
  // Register global shortcut: Control+Option+Command+S
  const registered = globalShortcut.register('Control+Alt+Command+S', takeInteractiveScreenshot);
  
  if (registered) {
    console.log('Global shortcut registered: Control+Alt+Command+S');
  } else {
    console.error('Failed to register global shortcut');
  }
  
  // Check if shortcut is registered
  console.log('Shortcut active:', globalShortcut.isRegistered('Control+Alt+Command+S'));
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  // Don't quit on macOS when all windows are closed
  // This is a menu bar app that should stay running
  e.preventDefault();
});

// Prevent app from quitting when windows close (menu bar app behavior)
app.on('before-quit', () => {
  app.isQuitting = true;
});

