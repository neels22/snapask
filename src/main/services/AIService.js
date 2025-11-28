/**
 * AI service for handling multiple AI provider calls using LangChain
 * Manages AI initialization and request processing
 * @class AIService
 */

const Logger = require('../utils/logger');
const { formatUserError } = require('../utils/errorHandler');
const { AI } = require('../config/constants');
const { HumanMessage } = require('@langchain/core/messages');

class AIService {
  constructor() {
    this.model = null;
    this.providerType = null;
    this.selectedModel = null;
    this.logger = new Logger('AIService');
  }

  /**
   * Initialize AI with provider, API key, and model using LangChain
   * @param {string} providerType - Provider type (google, openai, anthropic)
   * @param {string} apiKey - API key for the provider
   * @param {string} [model] - Model name (optional, uses default if not provided)
   * @throws {Error} If API key or provider is invalid
   */
  initialize(providerType, apiKey, model = null) {
    // Backward compatibility: if only one argument is provided, treat it as the old API format
    // Old API: initialize(apiKey) -> should become initialize('google', apiKey, defaultModel)
    if (arguments.length === 1 && typeof providerType === 'string') {
      // Old API: initialize(apiKey)
      apiKey = providerType;
      providerType = AI.DEFAULT_PROVIDER;
      model = AI.DEFAULT_MODEL;
    }

    if (!providerType || typeof providerType !== 'string') {
      throw new Error('Provider type is required');
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('API key is required');
    }

    const providerConfig = AI.PROVIDERS[providerType];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${providerType}`);
    }

    // Use provided model or default for provider
    const selectedModel = model || providerConfig.models[0]?.id;
    if (!selectedModel) {
      throw new Error(`No model available for provider: ${providerType}`);
    }

    try {
      // Dynamically load and initialize the appropriate LangChain model
      this.model = this._createLangChainModel(providerType, apiKey, selectedModel);
      this.providerType = providerType;
      this.selectedModel = selectedModel;
      this.logger.success(`AI service initialized with ${providerType} (${selectedModel})`);
    } catch (error) {
      this.logger.error('Failed to initialize AI provider', error);
      throw error;
    }
  }

  /**
   * Create LangChain model instance based on provider
   * @private
   * @param {string} providerType - Provider type
   * @param {string} apiKey - API key
   * @param {string} modelName - Model name
   * @returns {Object} LangChain model instance
   */
  _createLangChainModel(providerType, apiKey, modelName) {
    switch (providerType) {
      case 'google': {
        // Using @langchain/google-genai
        const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
        
        // Create a custom class that extends ChatGoogleGenerativeAI to support gemini-2.0 models
        class ExtendedChatGoogleGenerativeAI extends ChatGoogleGenerativeAI {
          get _isMultimodalModel() {
            // Original check: includes "vision" or starts with "gemini-1.5"
            // Extended to also support "gemini-2.0" models
            return (
              this.model.includes('vision') ||
              this.model.startsWith('gemini-1.5') ||
              this.model.startsWith('gemini-2.0')
            );
          }
        }
        
        return new ExtendedChatGoogleGenerativeAI({
          model: modelName,
          apiKey,
          temperature: 0.7,
        });
      }
      case 'openai': {
        // Using @langchain/openai
        const { ChatOpenAI } = require('@langchain/openai');
        return new ChatOpenAI({
          modelName: modelName,
          openAIApiKey: apiKey,
          temperature: 0.7,
        });
      }
      case 'anthropic': {
        // Using @langchain/anthropic
        const { ChatAnthropic } = require('@langchain/anthropic');
        return new ChatAnthropic({
          modelName: modelName,
          anthropicApiKey: apiKey,
          temperature: 0.7,
        });
      }
      default:
        throw new Error(`Unsupported provider: ${providerType}`);
    }
  }

  /**
   * Check if AI is initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.model !== null;
  }

  /**
   * Get current provider type
   * @returns {string|null} Provider type or null
   */
  getProviderType() {
    return this.providerType;
  }

  /**
   * Get current model
   * @returns {string|null} Model name or null
   */
  getModel() {
    return this.selectedModel;
  }

  /**
   * Generate AI response for prompt, optionally with image
   * @param {string} prompt - User prompt (required)
   * @param {string} [imageDataUrl] - Image data URL (optional)
   * @returns {Promise<{success: boolean, text?: string, error?: string}>}
   */
  async generateResponse(prompt, imageDataUrl) {
    try {
      if (!this.isInitialized()) {
        throw new Error('AI service not initialized. Please set your API key.');
      }

      if (!prompt) {
        throw new Error('Prompt is required');
      }

      const providerConfig = AI.PROVIDERS[this.providerType];
      const supportsImage = providerConfig?.supportsImage ?? false;

      // Check if image is supported by provider
      if (imageDataUrl && !supportsImage) {
        this.logger.warn('Image provided but current provider does not support images');
        imageDataUrl = null;
      }

      this.logger.info('Processing AI request', {
        provider: this.providerType,
        model: this.selectedModel,
        hasImage: !!imageDataUrl,
      });

      // Prepare messages based on provider
      const messages = this._prepareMessages(prompt, imageDataUrl);

      // Invoke model using LangChain's unified interface
      const response = await this.model.invoke(messages);

      // Extract text from response (LangChain standardizes this)
      const text = response.content || response.text() || String(response);

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
      } else if (error.statusCode) {
        errorCode = error.statusCode;
      }

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
   * Prepare messages in the format expected by LangChain
   * @private
   * @param {string} prompt - User prompt
   * @param {string} [imageDataUrl] - Optional image data URL
   * @returns {Array} Array of message objects
   */
  _prepareMessages(prompt, imageDataUrl) {
    if (!imageDataUrl) {
      // Text-only message - use plain object format (works with all providers)
      return [{ role: 'user', content: prompt }];
    }

    // Multimodal message with image
    const base64Image = this._extractBase64(imageDataUrl);

    // Format varies by provider
    if (this.providerType === 'google') {
      // Google Gemini format - use HumanMessage with image_url
      return [
        new HumanMessage({
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl, // Data URL format: data:image/png;base64,...
              },
            },
          ],
        }),
      ];
    }
    if (this.providerType === 'openai') {
      // OpenAI format - use HumanMessage with image_url
      return [
        new HumanMessage({
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        }),
      ];
    }
    if (this.providerType === 'anthropic') {
      // Anthropic format - use HumanMessage with image source
      return [
        new HumanMessage({
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image,
              },
            },
          ],
        }),
      ];
    }

    // Fallback to text-only
    return [{ role: 'user', content: prompt }];
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
