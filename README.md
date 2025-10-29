# SnapAsk

An AI-powered screenshot assistant for macOS. Capture any part of your screen with a global shortcut, then ask questions about it using multimodal AI.

## Features

✨ **Global Shortcut** - Press `⌃⌥⌘S` (Control+Option+Command+S) from anywhere  
📸 **Screenshot Capture** - Uses macOS native region selector  
💬 **Floating Chat** - Beautiful chat window appears near your cursor  
🤖 **AI-Ready** - Ready to integrate with OpenAI, Anthropic, Google, or any multimodal LLM  
🎨 **Native macOS UI** - Blur effects, smooth animations, dark theme  

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the App

```bash
npm start
```

### 3. Grant Screen Recording Permission

The first time you take a screenshot, macOS will prompt you to grant Screen Recording permission:

1. Go to **System Settings** → **Privacy & Security** → **Screen Recording**
2. Enable the checkbox for **Electron** (or **SnapAsk** if packaged)
3. Restart the app

### 4. Take Your First Screenshot

1. Press `⌃⌥⌘S` (Control+Option+Command+S)
2. Drag to select a region of your screen
3. A floating chat window appears near your cursor
4. Type your question and press Enter or click "Ask"

## How It Works

```
User presses hotkey
      ↓
macOS screencapture tool (-i for interactive region select)
      ↓
Screenshot copied to clipboard
      ↓
Electron reads clipboard image
      ↓
Floating window shows near cursor with screenshot preview
      ↓
User asks a question
      ↓
Send image + prompt to AI API
      ↓
Display response in floating window
```

## Project Structure

```
snapask/
├── main.js           # Electron main process (global shortcut, screenshot capture)
├── preload.js        # IPC bridge (security layer between main & renderer)
├── renderer.html     # Floating chat UI
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Connecting to an AI API

The app currently shows a **mock response**. To connect a real AI:

### Option 1: OpenAI GPT-4 Vision

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Install the OpenAI SDK: `npm install openai`
3. Replace the `mockAICall` function in `renderer.html`:

```javascript
async function callOpenAI(prompt, imageDataUrl) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_API_KEY`
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ],
      max_tokens: 500
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Option 2: Anthropic Claude

```bash
npm install @anthropic-ai/sdk
```

### Option 3: Google Gemini

```bash
npm install @google/generative-ai
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌃⌥⌘S` | Capture screenshot (customizable in `main.js`) |
| `Enter` | Ask question |
| `Esc` | Close floating window |

## Development

### Run with Logging

```bash
npm run dev
```

This enables Electron's logging to help debug issues.

### Changing the Global Shortcut

Edit `main.js` line ~81:

```javascript
globalShortcut.register('Control+Alt+Command+S', takeInteractiveScreenshot);
```

Replace with your preferred combo (e.g., `'CommandOrControl+Shift+X'`).

## Roadmap

- [ ] **AI Integration** - OpenAI, Anthropic, or Google API
- [ ] **On-device OCR** - Extract text before sending to save tokens
- [ ] **Conversation History** - Persistent SQLite storage
- [ ] **Full App Window** - "Continue in App" feature
- [ ] **Menu Bar Icon** - Tray icon with settings
- [ ] **Custom Shortcuts** - User-configurable hotkey
- [ ] **Annotations** - Draw arrows, highlights before asking
- [ ] **Privacy Mode** - Blur sensitive info before upload
- [ ] **Clipboard Mode** - Auto-detect copied images

## Troubleshooting

### "Screenshot not capturing"
- Grant **Screen Recording** permission in System Settings
- Restart the app after granting permission

### "Global shortcut not working"
- Check if another app is using the same shortcut
- Try a different key combination
- Check Console.app for Electron errors

### "Window appears off-screen"
- This can happen on multi-monitor setups
- The app tries to keep windows on-screen; please report if you encounter this

## Building for Distribution

To create a distributable `.app`:

```bash
npm install electron-builder --save-dev
```

Add to `package.json`:

```json
"build": {
  "appId": "com.snapask.app",
  "mac": {
    "category": "public.app-category.productivity",
    "hardenedRuntime": true,
    "entitlements": "entitlements.mac.plist"
  }
}
```

Then build:

```bash
npx electron-builder --mac
```

## Privacy & Security

- Screenshots are **never saved** to disk (clipboard only)
- Images are sent to your chosen AI provider (not stored elsewhere)
- All processing happens locally until you click "Ask"
- No telemetry or analytics

## License

MIT

## Credits

Built with [Electron](https://www.electronjs.org/)
