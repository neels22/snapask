/**
 * Centralized logging utility with context support
 * Provides consistent logging format across the application
 * @class Logger
 */
class Logger {
  /**
   * Create a logger instance
   * @param {string} context - Context name for log messages (e.g., 'WindowManager', 'AIService')
   */
  constructor(context = 'App') {
    this.context = context;
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {...*} args - Additional arguments to log
   */
  info(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.context}] ℹ️  ${message}`, ...args);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   */
  error(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${this.context}] ❌ ${message}`);
    if (error) {
      console.error(`[${timestamp}] [${this.context}] Stack:`, error.stack || error);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {...*} args - Additional arguments to log
   */
  warn(message, ...args) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${this.context}] ⚠️  ${message}`, ...args);
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Debug message
   * @param {...*} args - Additional arguments to log
   */
  debug(message, ...args) {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${this.context}] 🔍 ${message}`, ...args);
    }
  }

  /**
   * Log success message
   * @param {string} message - Success message
   * @param {...*} args - Additional arguments to log
   */
  success(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.context}] ✅ ${message}`, ...args);
  }
}

module.exports = Logger;

