# Race Condition Fix: Floating Window WebContents Access

## Problem Description

A race condition occurred when users captured a screenshot while the floating window (popup) from a previous screenshot was still open on the screen.

### Error Message
```
TypeError: Cannot read properties of null (reading 'webContents')
at WebContents.<anonymous> (/Users/indraneelsarode/Desktop/snapask/main.js:82:20)
```

## Root Cause

When a new screenshot was captured while the floating window was still open:

1. The old window's `close()` method was called
2. A new `BrowserWindow` was immediately created and assigned to `floatingWindow`
3. Event listeners were set up on the new window's `webContents`
4. **Race condition**: The old window's `closed` event handler would fire asynchronously and set `floatingWindow = null`
5. This could happen **after** the new window was created but **before** the `webContents` event listeners were fully set up
6. When the code tried to access `floatingWindow.webContents.send()`, `floatingWindow` could be `null`, causing the error

### Timeline of the Bug
```
Time 1: User captures screenshot #1 → floatingWindow = Window1
Time 2: Window1 loads and displays
Time 3: User captures screenshot #2 (Window1 still open)
Time 4: Window1.close() called
Time 5: Window2 created → floatingWindow = Window2
Time 6: Window2.webContents.once('did-finish-load') set up
Time 7: Window1 'closed' event fires → floatingWindow = null ❌
Time 8: Window2 'did-finish-load' fires → tries to access floatingWindow.webContents
Time 9: ERROR: Cannot read properties of null (reading 'webContents')
```

## Solution

The fix involved several defensive programming techniques:

### 1. Remove Old Event Listeners
```javascript
if (floatingWindow && !floatingWindow.isDestroyed()) {
  floatingWindow.removeAllListeners('closed'); // Prevent old handler from interfering
  floatingWindow.close();
  floatingWindow = null; // Clear reference immediately
}
```

### 2. Use Local Variable During Creation
```javascript
const newWindow = new BrowserWindow({...});
floatingWindow = newWindow; // Assign after creation
```

### 3. Add Safety Checks Before Accessing webContents
```javascript
floatingWindow.webContents.once('did-finish-load', () => {
  if (floatingWindow && !floatingWindow.isDestroyed() && floatingWindow.webContents) {
    floatingWindow.webContents.send('screenshot-captured', dataUrl);
  }
});
```

### 4. Guard the Closed Event Handler
```javascript
floatingWindow.on('closed', () => {
  if (floatingWindow === newWindow) { // Only clear if this is still the current window
    floatingWindow = null;
  }
});
```

## Code Changes

### Before (Buggy Code)
```javascript
function showFloatingWindow(dataUrl) {
  // Close existing window if open
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.close();
  }
  
  floatingWindow = new BrowserWindow({...});
  
  floatingWindow.webContents.once('did-finish-load', () => {
    floatingWindow.webContents.send('screenshot-captured', dataUrl); // ❌ Could be null
  });
  
  floatingWindow.on('closed', () => {
    floatingWindow = null; // ❌ Could clear new window's reference
  });
}
```

### After (Fixed Code)
```javascript
function showFloatingWindow(dataUrl) {
  // Close existing window if open and clear reference immediately
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.removeAllListeners('closed'); // ✅ Remove old listeners
    floatingWindow.close();
    floatingWindow = null; // ✅ Clear immediately
  }
  
  // Create new window
  const newWindow = new BrowserWindow({...});
  floatingWindow = newWindow; // ✅ Assign after creation
  
  floatingWindow.webContents.once('did-finish-load', () => {
    // ✅ Safety checks before access
    if (floatingWindow && !floatingWindow.isDestroyed() && floatingWindow.webContents) {
      floatingWindow.webContents.send('screenshot-captured', dataUrl);
    }
  });
  
  floatingWindow.on('closed', () => {
    // ✅ Only clear if this is still the current window
    if (floatingWindow === newWindow) {
      floatingWindow = null;
    }
  });
}
```

## Prevention Strategies

1. **Always clear references immediately** after closing windows
2. **Remove event listeners** before closing to prevent interference
3. **Use local variables** during window creation to avoid reference issues
4. **Add null checks** before accessing window properties
5. **Guard event handlers** to ensure they only affect the intended window instance

## Testing

To test the fix:
1. Capture a screenshot (floating window appears)
2. While the floating window is still open, capture another screenshot
3. The old window should close and a new one should open without errors
4. No "Cannot read properties of null" error should occur

## Related Issues

- This fix also works in conjunction with the `isCapturing` flag that prevents multiple simultaneous screenshot captures
- The same pattern should be applied to other window management code (mainAppWindow, onboardingWindow) if similar issues arise

## Date Fixed
Fixed on: [Current Date]

## Files Modified
- `main.js` - Updated `showFloatingWindow()` function

