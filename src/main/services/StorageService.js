/**
 * Storage Service
 * Manages persistent storage using electron-store
 * @class StorageService
 */

const Store = require('electron-store');
const Logger = require('../utils/logger');
const { STORAGE_KEYS } = require('../config/constants');

class StorageService {
  constructor() {
    this.store = new Store({
      name: 'snapask-config',
      defaults: {
        [STORAGE_KEYS.API_KEY]: null,
        [STORAGE_KEYS.HAS_COMPLETED_ONBOARDING]: false,
      },
    });
    this.logger = new Logger('StorageService');
  }

  /**
   * Get API key from storage
   * @returns {string|null} API key or null if not set
   */
  getApiKey() {
    return this.store.get(STORAGE_KEYS.API_KEY);
  }

  /**
   * Save API key to storage
   * @param {string} apiKey - API key to save
   * @returns {boolean} Success status
   */
  saveApiKey(apiKey) {
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('Invalid API key');
      }
      this.store.set(STORAGE_KEYS.API_KEY, apiKey);
      this.logger.success('API key saved');
      return true;
    } catch (error) {
      this.logger.error('Failed to save API key', error);
      return false;
    }
  }

  /**
   * Check if onboarding has been completed
   * @returns {boolean} True if completed
   */
  hasCompletedOnboarding() {
    return this.store.get(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING) || false;
  }

  /**
   * Mark onboarding as completed
   */
  setOnboardingCompleted() {
    this.store.set(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, true);
    this.logger.info('Onboarding marked as completed');
  }

  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Stored value or default
   */
  get(key, defaultValue = null) {
    return this.store.get(key, defaultValue);
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  set(key, value) {
    this.store.set(key, value);
  }

  /**
   * Delete a value from storage
   * @param {string} key - Storage key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all storage
   */
  clear() {
    this.store.clear();
    this.logger.warn('Storage cleared');
  }
}

module.exports = StorageService;

