-- SnapAsk Database Schema Reference
-- This file is for reference only - actual schema is created via migrations

-- Conversations Table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,                    -- UUID v4
  screenshot_data_url TEXT,               -- Base64 data URL or file path
  screenshot_hash TEXT,                   -- SHA-256 hash for deduplication
  title TEXT,                             -- Auto-generated or user-set
  created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  message_count INTEGER DEFAULT 0,        -- Cached count
  starred INTEGER DEFAULT 0,              -- 0 = false, 1 = true (for future)
  archived INTEGER DEFAULT 0              -- 0 = false, 1 = true (for future)
);

CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_screenshot_hash ON conversations(screenshot_hash);

-- Messages Table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,                    -- UUID v4
  conversation_id TEXT NOT NULL,          -- Foreign key
  role TEXT NOT NULL,                     -- 'user' or 'assistant'
  content TEXT NOT NULL,                  -- Prompt or answer
  timestamp INTEGER NOT NULL,             -- Unix timestamp (ms)
  error INTEGER DEFAULT 0,                -- 0 = success, 1 = error
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Metadata Table
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER NOT NULL
);

