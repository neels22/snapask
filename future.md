# SnapAsk - Feature Recommendations & Improvements

This document contains practical improvement suggestions for SnapAsk, organized by priority and implementation effort.

---

## 🚀 Quick Wins (High Impact, Low Effort)

### 1. Local Conversation Persistence
**Priority:** ⭐⭐⭐⭐⭐  
**Effort:** Medium  
**Impact:** High

- **What:** Save conversations to SQLite database so they persist after app restart
- **Why:** Users won't lose their conversation history
- **Implementation:**
  - Use `better-sqlite3` or `sql.js` for SQLite
  - Store conversations, screenshots (as base64 or file paths), and metadata
  - Add migration system for schema updates
- **Features:**
  - Auto-save conversations as they happen
  - Load conversation history on app start
  - Persist conversation state when switching between popup and main app

### 2. Copy Answer to Clipboard
**Priority:** ⭐⭐⭐⭐⭐  
**Effort:** Low  
**Impact:** High

- **What:** Add a "Copy" button next to each answer in the conversation
- **Why:** Users often want to use AI answers in other apps
- **Implementation:**
  - Add copy button to each conversation item in `app.js`
  - Use Electron's `clipboard.writeText()` API
  - Show brief "Copied!" toast notification
- **UI:** Small copy icon button next to each answer

### 3. Keyboard Shortcuts in Main App
**Priority:** ⭐⭐⭐⭐  
**Effort:** Low  
**Impact:** Medium

- **What:** Add keyboard shortcuts for common actions
- **Why:** Power users love keyboard shortcuts for faster workflow
- **Shortcuts:**
  - `Cmd+K` or `Cmd+L` - Focus input field
  - `Cmd+W` - Close window
  - `Esc` - Clear input or close window
  - `Cmd+Enter` - Send message (alternative to Enter)
  - `Cmd+/` - Show keyboard shortcuts help
- **Implementation:**
  - Add event listeners in `app.js`
  - Show shortcuts in a help modal or tooltip

### 4. Better Loading Animation
**Priority:** ⭐⭐⭐⭐  
**Effort:** Low  
**Impact:** Medium

- **What:** Replace "Thinking..." text with animated spinner or typing indicator
- **Why:** Better visual feedback during AI processing
- **Implementation:**
  - Add CSS animation for spinner
  - Or use animated typing dots: "Thinking..."
- **UI Options:**
  - Spinner animation
  - Pulsing dots
  - Progress bar (if we can estimate time)

### 5. Improved Error Handling
**Priority:** ⭐⭐⭐⭐  
**Effort:** Medium  
**Impact:** High

- **What:** Better error messages and retry functionality
- **Why:** Users need to understand what went wrong and how to fix it
- **Features:**
  - Specific error messages:
    - "API key invalid" vs "Network error" vs "Rate limit exceeded"
    - "Screenshot too large" vs "Image format not supported"
  - Retry button on failed requests
  - Error recovery suggestions
  - Log errors for debugging (with user consent)
- **Implementation:**
  - Categorize errors in `main.js` AI handler
  - Add retry logic with exponential backoff
  - Show user-friendly messages in UI

---

## 🎯 Medium Effort (High Impact)

### 6. Screenshot Preview Improvements
**Priority:** ⭐⭐⭐⭐  
**Effort:** Medium  
**Impact:** Medium

- **What:** Better screenshot viewing and interaction
- **Why:** Users may want to examine screenshots more closely
- **Features:**
  - Click screenshot to zoom/fullscreen view
  - Drag to reorder screenshots in conversation
  - Right-click context menu: "Copy image", "Save as...", "Delete"
  - Thumbnail view in conversation list
- **Implementation:**
  - Add click handlers to screenshot images
  - Create modal/overlay for fullscreen view
  - Implement drag-and-drop for reordering

### 7. Conversation Search
**Priority:** ⭐⭐⭐⭐  
**Effort:** Medium  
**Impact:** High

- **What:** Search through past conversations
- **Why:** Users need to find specific answers from history
- **Features:**
  - Search bar in main app header
  - Search by:
    - Prompt text
    - Answer text
    - Date range
    - Screenshot content (if we add OCR)
  - Highlight search matches
  - Filter by date, tags (future feature)
- **Implementation:**
  - Add search input to `app.html`
  - Implement search logic in `app.js`
  - Filter conversation list based on search query
  - Use Fuse.js or similar for fuzzy search

### 8. Quick Action Buttons
**Priority:** ⭐⭐⭐⭐⭐  
**Effort:** Medium  
**Impact:** High

- **What:** Preset buttons for common AI queries
- **Why:** Faster access to frequently used prompts
- **Features:**
  - Preset buttons:
    - "Explain" - "Explain what's in this image"
    - "Extract Text" - "Extract all text from this image"
    - "Summarize" - "Summarize the content of this image"
    - "Translate" - "Translate any text in this image to English"
    - "Code" - "Explain the code in this image"
  - Custom prompt templates (user-defined)
  - Quick action bar in both popup and main app
- **Implementation:**
  - Add button row in UI
  - Store custom templates in localStorage or SQLite
  - Map buttons to predefined prompts

### 9. Menu Bar Integration
**Priority:** ⭐⭐⭐  
**Effort:** Medium  
**Impact:** Medium

- **What:** macOS menu bar tray icon
- **Why:** Better macOS integration and quick access
- **Features:**
  - Tray icon in menu bar
  - Right-click menu:
    - "Take Screenshot" (trigger shortcut)
    - "Recent Conversations"
    - "Settings"
    - "Quit"
  - Click icon to show/hide main app window
  - Badge notification for new conversations (optional)
- **Implementation:**
  - Use Electron's `Tray` API
  - Create native menu with `Menu.buildFromTemplate()`
  - Handle click events

### 10. Export Conversations
**Priority:** ⭐⭐⭐  
**Effort:** Medium  
**Impact:** Medium

- **What:** Export conversations to various formats
- **Why:** Users want to save or share their conversations
- **Features:**
  - Export formats:
    - Markdown (.md)
    - Plain text (.txt)
    - PDF (with screenshots)
    - JSON (for backup/import)
  - Export options:
    - Single conversation
    - All conversations
    - Date range
  - Share individual answers
- **Implementation:**
  - Use Electron's `dialog.showSaveDialog()`
  - Generate markdown/text from conversation data
  - Use library like `pdfkit` for PDF generation
  - Add export button in main app

---

## ✨ Nice to Have (Polish)

### 11. Markdown Rendering
**Priority:** ⭐⭐⭐  
**Effort:** Medium  
**Impact:** Medium

- **What:** Render markdown in AI responses
- **Why:** AI often returns formatted text (code blocks, lists, etc.)
- **Features:**
  - Render markdown syntax:
    - Code blocks with syntax highlighting
    - Lists (ordered and unordered)
    - Headers
    - Bold, italic, links
    - Tables
  - Copy code blocks with one click
  - Toggle between markdown and plain text view
- **Implementation:**
  - Use `marked` or `markdown-it` for parsing
  - Use `highlight.js` for syntax highlighting
  - Style with CSS

### 12. Conversation Management
**Priority:** ⭐⭐⭐  
**Effort:** Medium  
**Impact:** Medium

- **What:** Better organization of conversations
- **Why:** Users accumulate many conversations over time
- **Features:**
  - Delete conversations (with confirmation)
  - Star/favorite important conversations
  - Archive old conversations
  - Tags/labels for conversations
  - Conversation folders/categories
  - Sort by: date, title, favorites
- **Implementation:**
  - Add action buttons to conversation items
  - Update SQLite schema to include metadata (starred, archived, tags)
  - Add filtering UI in main app

### 13. Settings Window
**Priority:** ⭐⭐⭐  
**Effort:** Medium  
**Impact:** Medium

- **What:** Dedicated settings window
- **Why:** Users need to configure the app
- **Features:**
  - API key management:
    - View current key (masked)
    - Update API key
    - Test API key connection
    - Support multiple AI providers
  - Shortcut customization:
    - Change global screenshot shortcut
    - Customize other shortcuts
    - Conflict detection
  - UI preferences:
    - Theme (dark/light/auto)
    - Font size
    - Window behavior
  - Storage settings:
    - Clear conversation history
    - Export/import data
    - Storage usage
- **Implementation:**
  - Create `settings.html` and `settings.js`
  - Use Electron's `nativeTheme` for theme
  - Store settings in `localStorage` or JSON file
  - Add settings button in menu bar or main app

### 14. Image Annotations
**Priority:** ⭐⭐  
**Effort:** High  
**Impact:** Medium

- **What:** Draw on screenshots before asking questions
- **Why:** Users may want to highlight specific areas
- **Features:**
  - Drawing tools:
    - Arrow tool
    - Rectangle/circle highlight
    - Freehand drawing
    - Text annotations
  - Color picker for annotations
  - Undo/redo
  - Crop/zoom before sending
  - Clear annotations
- **Implementation:**
  - Use HTML5 Canvas for drawing
  - Add annotation toolbar
  - Save annotated image before sending to AI
  - Consider using a library like `fabric.js` or `konva.js`

---

## 📊 Priority Summary

### Top 3 Must-Have Features:
1. **Local Conversation Persistence** - Foundation for everything else
2. **Copy to Clipboard** - Quick usability win
3. **Quick Action Buttons** - Major UX improvement

### Implementation Order Suggestion:

**Week 1:**
- Copy to Clipboard (#2)
- Better Loading Animation (#4)
- Keyboard Shortcuts (#3)

**Week 2:**
- Local Conversation Persistence (#1)
- Improved Error Handling (#5)

**Week 3:**
- Quick Action Buttons (#8)
- Conversation Search (#7)

**Week 4:**
- Screenshot Preview Improvements (#6)
- Menu Bar Integration (#9)

**Future:**
- Export Conversations (#10)
- Markdown Rendering (#11)
- Conversation Management (#12)
- Settings Window (#13)
- Image Annotations (#14)

---

## 🛠️ Technical Notes

### Dependencies to Add:
```json
{
  "better-sqlite3": "^9.0.0",  // For local database
  "marked": "^11.0.0",         // For markdown rendering
  "highlight.js": "^11.9.0",   // For code syntax highlighting
  "fuse.js": "^7.0.0"          // For fuzzy search (optional)
}
```

### Database Schema (SQLite):
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  screenshot_data_url TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  prompt TEXT,
  answer TEXT,
  timestamp INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

---

## 📝 Notes

- All features should maintain the current clean, minimal UI aesthetic
- Consider accessibility (keyboard navigation, screen readers)
- Test on different macOS versions
- Keep performance in mind (especially with large conversation histories)
- Consider privacy implications (local storage vs cloud sync)

---

*Last Updated: November 2024*

