/**
 * Conversation Service
 * Handles conversation and message CRUD operations
 */

const { randomUUID, createHash } = require('crypto');
const Logger = require('../utils/logger');

class ConversationService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.db = databaseService.getDb();
    this.logger = new Logger('ConversationService');
  }

  // CREATE

  /**
   * Create a new conversation
   * @param {string|null} [screenshotDataUrl] - Base64 data URL of the screenshot (optional)
   * @returns {Object} Created conversation with id and created_at
   */
  createConversation(screenshotDataUrl) {
    const id = randomUUID();
    const now = Date.now();

    // Only calculate hash if screenshot is provided
    const hash = screenshotDataUrl ? this.calculateHash(screenshotDataUrl) : null;

    const stmt = this.db.prepare(`
      INSERT INTO conversations 
      (id, screenshot_data_url, screenshot_hash, created_at, updated_at, message_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `);

    stmt.run(id, screenshotDataUrl || null, hash, now, now);

    this.logger.info(`Created conversation: ${id}`, { hasScreenshot: !!screenshotDataUrl });
    return { id, created_at: now };
  }

  /**
   * Save a message to a conversation
   * @param {string} conversationId - ID of the conversation
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {boolean} error - Whether this message is an error
   * @returns {Object} Saved message with id and timestamp
   */
  saveMessage(conversationId, role, content, error = false) {
    const id = randomUUID();
    const timestamp = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp, error)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, conversationId, role, content, timestamp, error ? 1 : 0);

    // Update conversation
    this.updateConversationTimestamp(conversationId);
    this.incrementMessageCount(conversationId);

    this.logger.debug(`Saved message: ${id} to conversation: ${conversationId}`);
    return { id, timestamp };
  }

  // READ

  /**
   * Get all conversations (most recent first)
   * @param {number} limit - Maximum number of conversations to return
   * @param {number} offset - Number of conversations to skip
   * @returns {Array} Array of conversations with metadata
   */
  getAllConversations(limit = 100, offset = 0, filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Handle archived filter
    if (filters.archived === true) {
      whereClause += ' AND c.archived = 1';
    } else if (filters.archived === false) {
      whereClause += ' AND c.archived = 0';
    }
    // If filters.archived is undefined/null, we don't filter by archived status (show all)
    // But for backward compatibility/default behavior, we usually want to hide archived unless explicitly asked
    else {
      whereClause += ' AND c.archived = 0';
    }

    // Handle starred filter
    if (filters.starred === true) {
      whereClause += ' AND c.starred = 1';
    }

    const stmt = this.db.prepare(`
      SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        c.message_count,
        c.starred,
        c.archived,
        (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY timestamp ASC LIMIT 1) as first_prompt,
        (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'assistant' ORDER BY timestamp ASC LIMIT 1) as first_answer
      FROM conversations c
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `);

    params.push(limit, offset);
    const conversations = stmt.all(...params);

    // Generate titles
    return conversations.map(c => {
      const conversation = { ...c };
      conversation.title = this.generateTitle(c.first_prompt || 'Untitled');
      conversation.preview = c.first_answer ? c.first_answer.substring(0, 100) : '';
      delete conversation.first_prompt;
      delete conversation.first_answer;
      return conversation;
    });
  }

  /**
   * Get a single conversation by ID (without messages)
   * @param {string} conversationId - ID of the conversation
   * @returns {Object|null} Conversation object or null if not found
   */
  getConversation(conversationId) {
    const stmt = this.db.prepare(`
      SELECT * FROM conversations WHERE id = ?
    `);

    return stmt.get(conversationId);
  }

  /**
   * Get a conversation with all its messages
   * @param {string} conversationId - ID of the conversation
   * @returns {Object|null} Conversation with messages array or null if not found
   */
  getConversationWithMessages(conversationId) {
    const conversation = this.getConversation(conversationId);

    if (!conversation) {
      return null;
    }

    const messagesStmt = this.db.prepare(`
      SELECT id, role, content, timestamp, error
      FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `);

    conversation.messages = messagesStmt.all(conversationId);

    // Convert messages to the format expected by the UI
    conversation.messages = conversation.messages.map(msg => ({
      id: msg.id,
      prompt: msg.role === 'user' ? msg.content : undefined,
      answer: msg.role === 'assistant' ? msg.content : undefined,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      error: msg.error === 1
    }));

    return conversation;
  }

  // UPDATE

  /**
   * Update conversation's updated_at timestamp
   * @param {string} conversationId - ID of the conversation
   */
  updateConversationTimestamp(conversationId) {
    const stmt = this.db.prepare(`
      UPDATE conversations SET updated_at = ? WHERE id = ?
    `);
    stmt.run(Date.now(), conversationId);
  }

  /**
   * Increment the message count for a conversation
   * @param {string} conversationId - ID of the conversation
   */
  incrementMessageCount(conversationId) {
    const stmt = this.db.prepare(`
      UPDATE conversations SET message_count = message_count + 1 WHERE id = ?
    `);
    stmt.run(conversationId);
  }

  /**
   * Update conversation properties
   * @param {string} conversationId - ID of the conversation
   * @param {Object} updates - Object with properties to update
   */
  updateConversation(conversationId, updates) {
    const allowed = ['title', 'starred', 'archived'];
    const sets = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowed.includes(key)) {
        sets.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (sets.length === 0) return;

    sets.push('updated_at = ?');
    values.push(Date.now(), conversationId);

    const stmt = this.db.prepare(`
      UPDATE conversations SET ${sets.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  // DELETE

  /**
   * Delete a conversation and all its messages
   * @param {string} conversationId - ID of the conversation
   */
  deleteConversation(conversationId) {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
    stmt.run(conversationId);
    this.logger.info(`Deleted conversation: ${conversationId}`);
  }

  // UTILITY

  /**
   * Generate a title from the first prompt
   * @param {string} firstPrompt - The first prompt in the conversation
   * @returns {string} Generated title
   */
  generateTitle(firstPrompt) {
    if (!firstPrompt) return 'Untitled Conversation';

    // Truncate to first 50 chars
    const title = firstPrompt.trim().substring(0, 50);
    return title.length < firstPrompt.trim().length ? `${title}...` : title;
  }

  /**
   * Calculate SHA-256 hash of a data URL
   * @param {string} dataUrl - Data URL to hash
   * @returns {string} Hex-encoded hash
   */
  calculateHash(dataUrl) {
    return createHash('sha256').update(dataUrl).digest('hex');
  }

  /**
   * Save a complete conversation (used when migrating from popup to main app)
   * @param {string|null} [screenshotDataUrl] - Screenshot data URL (optional)
   * @param {Array} conversation - Array of {prompt, answer} objects
   * @returns {Object} Created conversation with id
   */
  saveCompleteConversation(screenshotDataUrl, conversation) {
    const conversationData = this.createConversation(screenshotDataUrl || null);

    // Save all messages
    conversation.forEach(item => {
      this.saveMessage(conversationData.id, 'user', item.prompt, false);
      this.saveMessage(conversationData.id, 'assistant', item.answer, item.error || false);
    });

    return conversationData;
  }
}

module.exports = ConversationService;

