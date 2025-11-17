/**
 * AI service for handling Google Gemini API calls
 * Manages AI initialization and request processing
 * @class AIService
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Logger = require('../utils/logger');
const { formatUserError } = require('../utils/errorHandler');
const { AI } = require('../config/constants');

class AIService {
  constructor() {
    this.genAI = null;
    this.logger = new Logger('AIService');
  }

  /**
   * Initialize AI with API key
   * @param {string} apiKey - Gemini API key
   * @throws {Error} If API key is invalid
   */
  initialize(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger.success('AI service initialized');
  }

  /**
   * Check if AI is initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.genAI !== null;
  }

  /**
   * Generate AI response for image and prompt
   * @param {string} prompt - User prompt
   * @param {string} imageDataUrl - Image data URL
   * @returns {Promise<{success: boolean, text?: string, error?: string}>}
   */
  async generateResponse(prompt, imageDataUrl) {
    try {
      if (!this.isInitialized()) {
        throw new Error('AI service not initialized. Please set your API key.');
      }

      if (!prompt || !imageDataUrl) {
        throw new Error('Prompt and image are required');
      }

      this.logger.info('Processing AI request');

      const model = this.genAI.getGenerativeModel({ model: AI.MODEL });

      // Convert data URL to base64
      const base64Image = this._extractBase64(imageDataUrl);

      // Prepare image part
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/png',
        },
      };

      // Generate content
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      this.logger.success('AI response received');
      return { success: true, text };
    } catch (error) {
      this.logger.error('AI request failed', error);
      
      // Extract error code if available
      let errorCode = null;
      if (error.status) {
        errorCode = error.status;
      } else if (error.response?.status) {
        errorCode = error.response.status;
      }
      
      // Add error code to error object for better detection
      if (errorCode) {
        error.code = errorCode;
      }
      
      const formattedError = formatUserError(error);
      
      return {
        success: false,
        error: formattedError,
        errorType: formattedError === 'API_QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED' : 'GENERAL',
      };
    }
  }

  /**
   * Extract base64 data from data URL
   * @private
   * @param {string} dataUrl - Data URL
   * @returns {string} Base64 encoded data
   */
  _extractBase64(dataUrl) {
    const parts = dataUrl.split(',');
    if (parts.length < 2) {
      throw new Error('Invalid image data URL');
    }
    return parts[1];
  }
}

module.exports = AIService;

