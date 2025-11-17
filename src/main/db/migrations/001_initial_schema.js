/**
 * Migration 001: Initial Schema
 * Creates conversations, messages, and metadata tables
 */

module.exports = {
  version: 1,
  
  up: (db) => {
    // Create conversations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        screenshot_data_url TEXT,
        screenshot_hash TEXT,
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        starred INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conversations_screenshot_hash ON conversations(screenshot_hash);
    `);

    // Create messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        error INTEGER DEFAULT 0,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);

    // Create metadata table
    db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER NOT NULL
      );
    `);

    // Insert initial schema version
    db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value, updated_at) 
      VALUES ('schema_version', '1', ?)
    `).run(Date.now());
  },

  down: (db) => {
    db.exec(`
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS conversations;
      DROP TABLE IF EXISTS metadata;
    `);
  }
};

