require('dotenv').config();
const path = require('path');
const { app, BrowserWindow, globalShortcut, screen, clipboard, nativeImage, ipcMain } = require('electron');
const { execFile } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Store = require('electron-store');

// Initialize electron-store for persistent storage
const store = new Store({
  name: 'snapask-config',
  defaults: {
    apiKey: null,
    hasCompletedOnboarding: false
  }
});

let floatingWindow = null;
let mainAppWindow = null;
let onboardingWindow = null;
let genAI = null;
let isCapturing = false; // Flag to prevent multiple simultaneous captures

// Initialize Gemini AI with stored API key
function initializeAI() {
  const apiKey = store.get('apiKey');
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('API Key loaded from storage: Yes ✓');
    return true;
  }
  console.log('API Key not found in storage');
  return false;
}
/**
 * Create and show the floating chat window near the cursor
 */
function showFloatingWindow(dataUrl) {
  const { x, y } = screen.getCursorScreenPoint();
  
  // Close existing window if open and clear reference immediately
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.removeAllListeners('closed'); // Remove old event listeners
    floatingWindow.close();
    floatingWindow = null; // Clear reference immediately
  }
  
  // Create new window
  const newWindow = new BrowserWindow({
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
  
  // Update global reference
  floatingWindow = newWindow;
  
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
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.showInactive();  // Show without activating - stays on current app
    }
  });
  
  // Send screenshot data once loaded
  floatingWindow.webContents.once('did-finish-load', () => {
    if (floatingWindow && !floatingWindow.isDestroyed() && floatingWindow.webContents) {
      floatingWindow.webContents.send('screenshot-captured', dataUrl);
    }
  });
  
  // Handle close button from renderer
  floatingWindow.on('closed', () => {
    if (floatingWindow === newWindow) { // Only clear if this is still the current window
      floatingWindow = null;
    }
  });
}

/**
 * Show onboarding window on first run
 */
function showOnboardingWindow() {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.focus();
    return;
  }
  
  onboardingWindow = new BrowserWindow({
    width: 600,
    height: 600,
    frame: true,
    backgroundColor: '#ffffff',
    show: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  onboardingWindow.loadFile('onboarding.html');
  
  onboardingWindow.once('ready-to-show', () => {
    onboardingWindow.show();
    onboardingWindow.center();
  });
  
  onboardingWindow.on('closed', () => {
    onboardingWindow = null;
  });
}

/**
 * Capture screenshot using macOS built-in tool
 */
function takeInteractiveScreenshot() {
  // Prevent multiple simultaneous captures
  if (isCapturing) {
    console.log('Screenshot capture already in progress, ignoring...');
    return;
  }
  
  isCapturing = true;
  console.log('Taking interactive screenshot...');
  
  // Use macOS screencapture tool: -i for interactive, -c to copy to clipboard
  execFile('/usr/sbin/screencapture', ['-i', '-c'], (err) => {
    // Always reset the flag when done (success or error)
    isCapturing = false;
    
    if (err) {
      // Only log if it's not the "already running" error
      if (!err.message.includes('cannot run two interactive')) {
        console.error('Screenshot capture error:', err);
      } else {
        console.log('Screenshot capture already in progress');
      }
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
 * Create and show the main app window
 */
function showMainAppWindow(conversationData) {
  console.log('>>> showMainAppWindow called');
  
  // Close floating window if open
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    console.log('Closing floating window');
    floatingWindow.close();
  }
  
  // Reuse existing window if open
  if (mainAppWindow && !mainAppWindow.isDestroyed()) {
    console.log('>>> Reusing existing main app window');
    mainAppWindow.focus();
    mainAppWindow.moveTop();
    // Send updated data
    mainAppWindow.webContents.send('app-data', conversationData);
    return;
  }
  
  console.log('>>> Creating new main app window...');
  
  try {
    // Center the window on screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowWidth = 900;
    const windowHeight = 700;
    
    console.log(`>>> Screen size: ${screenWidth}x${screenHeight}`);
    console.log(`>>> Window will be at: ${Math.floor((screenWidth - windowWidth) / 2)}, ${Math.floor((screenHeight - windowHeight) / 2)}`);
    
    // Create new main app window
    mainAppWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: 600,
      minHeight: 500,
      frame: true,
      backgroundColor: '#1a1a1a',
      show: false,
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: Math.floor((screenHeight - windowHeight) / 2),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    console.log('>>> BrowserWindow created successfully');
    
    // Add error handling
    mainAppWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('>>> FAILED to load app.html:', errorCode, errorDescription, validatedURL);
    });
    
    mainAppWindow.webContents.on('crashed', () => {
      console.error('>>> WebContents crashed!');
    });
    
    // Load the app HTML
    const loadPromise = mainAppWindow.loadFile('app.html');
    console.log('>>> loadFile called, waiting for promise...');
    
    loadPromise.then(() => {
      console.log('>>> loadFile promise resolved');
    }).catch((err) => {
      console.error('>>> Error loading app.html:', err);
      console.error('>>> Error stack:', err.stack);
    });
    
    // Show window when ready
    mainAppWindow.once('ready-to-show', () => {
      console.log('>>> Main app window ready to show - calling show()');
      mainAppWindow.show();
      console.log('>>> show() called');
      mainAppWindow.focus();
      console.log('>>> focus() called');
      mainAppWindow.moveTop();
      console.log('>>> moveTop() called');
      
      // Force show and bring to front
      if (!mainAppWindow.isVisible()) {
        console.log('>>> Window not visible, forcing show...');
        mainAppWindow.showInactive();
        mainAppWindow.show();
      }
      
      // Ensure window is on top
      mainAppWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        mainAppWindow.setAlwaysOnTop(false);
      }, 100);
      
      console.log('>>> Window should now be visible');
      console.log('>>> Window isVisible:', mainAppWindow.isVisible());
      console.log('>>> Window bounds:', mainAppWindow.getBounds());
    });
    
    // Send conversation data once loaded
    mainAppWindow.webContents.once('did-finish-load', () => {
      console.log('>>> Main app window finished loading, sending data');
      mainAppWindow.webContents.send('app-data', conversationData);
    });
    
    // Handle window close
    mainAppWindow.on('closed', () => {
      console.log('>>> Main app window closed');
      mainAppWindow = null;
    });
    
    // Debug: Check if window is actually created
    console.log('>>> Window created, isDestroyed:', mainAppWindow.isDestroyed());
    console.log('>>> Window visible:', mainAppWindow.isVisible());
    
  } catch (error) {
    console.error('>>> ERROR in showMainAppWindow:', error);
    console.error('>>> Error stack:', error.stack);
  }
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
  console.log('=== IPC: open-main-app received ===');
  console.log('Conversation data:', {
    hasScreenshot: !!conversationData?.screenshot,
    conversationLength: conversationData?.conversation?.length || 0
  });
  try {
    showMainAppWindow(conversationData);
  } catch (error) {
    console.error('Error in showMainAppWindow:', error);
  }
});

ipcMain.on('close-app-window', () => {
  if (mainAppWindow && !mainAppWindow.isDestroyed()) {
    mainAppWindow.close();
  }
});

/**
 * Handle API key storage
 */
ipcMain.handle('save-api-key', async (event, apiKey) => {
  try {
    store.set('apiKey', apiKey);
    store.set('hasCompletedOnboarding', true);
    // Reinitialize AI with new key
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('API Key saved and AI initialized');
    return { success: true };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-api-key', () => {
  return store.get('apiKey');
});

ipcMain.on('close-onboarding', () => {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.close();
  }
});

/**
 * Handle AI query requests from renderer
 */
ipcMain.handle('ask-ai', async (event, { prompt, imageDataUrl }) => {
  try {
    // Check if AI is initialized
    if (!genAI) {
      const apiKey = store.get('apiKey');
      if (!apiKey) {
        return { 
          success: false, 
          error: 'API key not configured. Please restart the app and enter your API key.' 
        };
      }
      genAI = new GoogleGenerativeAI(apiKey);
    }
    
    console.log('Processing AI request...');
    
    // Use Gemini 1.5 Flash for speed (or use 'gemini-1.5-pro' for better quality)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Convert data URL to base64 (remove the data:image/png;base64, prefix)
    const base64Image = imageDataUrl.split(',')[1];
    
    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/png'
      }
    };
    
    // Generate content with both text and image
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    console.log('AI response received');
    return { success: true, text };
    
  } catch (error) {
    console.error('AI request failed:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get AI response' 
    };
  }
});

/**
 * App lifecycle
 */
app.whenReady().then(() => {
  console.log('SnapAsk is ready!');
  
  // Check if user has completed onboarding
  const hasCompletedOnboarding = store.get('hasCompletedOnboarding');
  const apiKey = store.get('apiKey');
  
  if (!hasCompletedOnboarding || !apiKey) {
    // Show onboarding window
    showOnboardingWindow();
  } else {
    // Initialize AI with stored key
    initializeAI();
  }
  
  // Register global shortcut: Control+Option+Command+S
  const registered = globalShortcut.register('Control+Alt+Command+S', () => {
    // Check if API key exists before allowing screenshot
    const currentApiKey = store.get('apiKey');
    if (!currentApiKey) {
      // Show onboarding if no API key
      showOnboardingWindow();
      return;
    }
    // Initialize AI if not already done
    if (!genAI) {
      initializeAI();
    }
    takeInteractiveScreenshot();
  });
  
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

