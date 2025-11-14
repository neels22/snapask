/**
 * Error handling utilities
 * Provides centralized error formatting and handling
 * @module errorHandler
 */

const Logger = require('./logger');

const logger = new Logger('ErrorHandler');

/**
 * Custom application error class
 * @class AppError
 */
class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {object} [details] - Additional error details
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Format error for user display
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
const formatUserError = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }

  // Handle specific error types
  if (error.message.includes('API key')) {
    return 'Invalid API key. Please check your configuration.';
  }
  if (error.message.includes('rate limit')) {
    return 'Rate limit exceeded. Please try again later.';
  }
  if (error.message.includes('network')) {
    return 'Network error. Please check your connection.';
  }
  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Handle uncaught errors
 * @param {Error} error - Uncaught error
 * @param {string} context - Context where error occurred
 */
const handleUncaughtError = (error, context = 'Unknown') => {
  logger.error(`Uncaught error in ${context}`, error);
  // In production, you might want to send this to an error tracking service
};

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context name for logging
 * @returns {Function} Wrapped function
 */
const asyncErrorHandler = (fn, context) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    logger.error(`Error in ${context}`, error);
    throw error;
  }
};

module.exports = {
  AppError,
  formatUserError,
  handleUncaughtError,
  asyncErrorHandler,
};

