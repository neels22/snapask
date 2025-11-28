/**
 * Unit tests for AIService with LangChain multi-provider support
 */

jest.mock('@langchain/google-genai');
jest.mock('@langchain/openai');
jest.mock('@langchain/anthropic');
jest.mock('../../utils/logger', () => require('../../__tests__/__mocks__/logger'));

const AIService = require('../AIService');
const { AI } = require('../../config/constants');

describe('AIService', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AIService();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with Google provider', () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      aiService.initialize('google', 'test-api-key', 'gemini-2.0-flash');

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash',
        apiKey: 'test-api-key',
        temperature: 0.7,
      });
      expect(aiService.isInitialized()).toBe(true);
      expect(aiService.getProviderType()).toBe('google');
      expect(aiService.getModel()).toBe('gemini-2.0-flash');
    });

    test('should initialize with OpenAI provider', () => {
      const { ChatOpenAI } = require('@langchain/openai');
      aiService.initialize('openai', 'test-api-key', 'gpt-4o');

      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'gpt-4o',
        openAIApiKey: 'test-api-key',
        temperature: 0.7,
      });
      expect(aiService.isInitialized()).toBe(true);
      expect(aiService.getProviderType()).toBe('openai');
      expect(aiService.getModel()).toBe('gpt-4o');
    });

    test('should initialize with Anthropic provider', () => {
      const { ChatAnthropic } = require('@langchain/anthropic');
      aiService.initialize('anthropic', 'test-api-key', 'claude-3-5-sonnet-20241022');

      expect(ChatAnthropic).toHaveBeenCalledWith({
        modelName: 'claude-3-5-sonnet-20241022',
        anthropicApiKey: 'test-api-key',
        temperature: 0.7,
      });
      expect(aiService.isInitialized()).toBe(true);
      expect(aiService.getProviderType()).toBe('anthropic');
      expect(aiService.getModel()).toBe('claude-3-5-sonnet-20241022');
    });

    test('should throw error for invalid provider', () => {
      expect(() => {
        aiService.initialize('invalid-provider', 'test-api-key');
      }).toThrow('Unknown provider: invalid-provider');
      expect(aiService.isInitialized()).toBe(false);
    });

    test('should throw error for missing API key', () => {
      expect(() => {
        aiService.initialize('google', '');
      }).toThrow('API key is required');

      expect(() => {
        aiService.initialize('google', null);
      }).toThrow('API key is required');

      expect(() => {
        aiService.initialize('google', undefined);
      }).toThrow('API key is required');
    });

    test('should use default model if not specified', () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      aiService.initialize('google', 'test-api-key');

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        model: AI.PROVIDERS.google.models[0].id,
        apiKey: 'test-api-key',
        temperature: 0.7,
      });
      expect(aiService.getModel()).toBe(AI.PROVIDERS.google.models[0].id);
    });

    test('should use provided model if specified', () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      aiService.initialize('google', 'test-api-key', 'gemini-1.5-pro');

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        apiKey: 'test-api-key',
        temperature: 0.7,
      });
      expect(aiService.getModel()).toBe('gemini-1.5-pro');
    });

    test('should support backward compatibility with old API (apiKey only)', () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      aiService.initialize('test-api-key');

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        model: AI.DEFAULT_MODEL,
        apiKey: 'test-api-key',
        temperature: 0.7,
      });
      expect(aiService.getProviderType()).toBe(AI.DEFAULT_PROVIDER);
    });
  });

  describe('State Management', () => {
    test('should return correct provider type', () => {
      aiService.initialize('openai', 'test-api-key', 'gpt-4o');
      expect(aiService.getProviderType()).toBe('openai');
    });

    test('should return correct model name', () => {
      aiService.initialize('anthropic', 'test-api-key', 'claude-3-5-sonnet-20241022');
      expect(aiService.getModel()).toBe('claude-3-5-sonnet-20241022');
    });

    test('should correctly report initialization status', () => {
      expect(aiService.isInitialized()).toBe(false);
      aiService.initialize('google', 'test-api-key');
      expect(aiService.isInitialized()).toBe(true);
    });

    test('should return null for provider type when not initialized', () => {
      expect(aiService.getProviderType()).toBeNull();
    });

    test('should return null for model when not initialized', () => {
      expect(aiService.getModel()).toBeNull();
    });
  });

  describe('generateResponse - Text Only', () => {
    test('should generate text-only response for Google', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      
      aiService.initialize('google', 'test-api-key', 'gemini-2.0-flash');
      const result = await aiService.generateResponse('Test prompt');

      expect(result.success).toBe(true);
      expect(result.text).toBe('Mock Google Gemini response');
      // Get the instance that was created
      const mockInstance = ChatGoogleGenerativeAI.mock.results[ChatGoogleGenerativeAI.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([{ role: 'user', content: 'Test prompt' }]);
    });

    test('should generate text-only response for OpenAI', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      
      aiService.initialize('openai', 'test-api-key', 'gpt-4o');
      const result = await aiService.generateResponse('Test prompt');

      expect(result.success).toBe(true);
      expect(result.text).toBe('Mock OpenAI response');
      const mockInstance = ChatOpenAI.mock.results[ChatOpenAI.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([{ role: 'user', content: 'Test prompt' }]);
    });

    test('should generate text-only response for Anthropic', async () => {
      const { ChatAnthropic } = require('@langchain/anthropic');
      
      aiService.initialize('anthropic', 'test-api-key', 'claude-3-5-sonnet-20241022');
      const result = await aiService.generateResponse('Test prompt');

      expect(result.success).toBe(true);
      expect(result.text).toBe('Mock Anthropic Claude response');
      const mockInstance = ChatAnthropic.mock.results[ChatAnthropic.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([{ role: 'user', content: 'Test prompt' }]);
    });
  });

  describe('generateResponse - Multimodal with Image', () => {
    const testImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    test('should generate multimodal response with image for Google', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      
      aiService.initialize('google', 'test-api-key', 'gemini-2.0-flash');
      const result = await aiService.generateResponse('What is in this image?', testImageDataUrl);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Mock Google Gemini response');
      const mockInstance = ChatGoogleGenerativeAI.mock.results[ChatGoogleGenerativeAI.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image_url',
              image_url: {
                url: testImageDataUrl,
              },
            },
          ],
        },
      ]);
    });

    test('should generate multimodal response with image for OpenAI', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      
      aiService.initialize('openai', 'test-api-key', 'gpt-4o');
      const result = await aiService.generateResponse('What is in this image?', testImageDataUrl);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Mock OpenAI response');
      const mockInstance = ChatOpenAI.mock.results[ChatOpenAI.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image_url',
              image_url: {
                url: testImageDataUrl,
              },
            },
          ],
        },
      ]);
    });

    test('should generate multimodal response with image for Anthropic', async () => {
      const { ChatAnthropic } = require('@langchain/anthropic');
      
      aiService.initialize('anthropic', 'test-api-key', 'claude-3-5-sonnet-20241022');
      const result = await aiService.generateResponse('What is in this image?', testImageDataUrl);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Mock Anthropic Claude response');
      const mockInstance = ChatAnthropic.mock.results[ChatAnthropic.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              },
            },
          ],
        },
      ]);
    });
  });

  describe('generateResponse - Error Handling', () => {
    test('should handle missing prompt error', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      aiService.initialize('google', 'test-api-key');
      const result = await aiService.generateResponse('');

      expect(result.success).toBe(false);
      // Error gets formatted by errorHandler, so check for the actual error message
      expect(result.error).toContain('required');
    });

    test('should handle uninitialized service error', async () => {
      const result = await aiService.generateResponse('Test prompt');

      expect(result.success).toBe(false);
      // Error gets formatted by errorHandler, check for any error message
      expect(result.error).toBeTruthy();
    });

    test('should handle provider-specific errors (quota exceeded)', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      
      // Override the mock to return a rejected promise
      const mockInstance = {
        invoke: jest.fn().mockRejectedValue({
          status: 429,
          message: 'Quota exceeded',
        }),
      };
      ChatGoogleGenerativeAI.mockReturnValueOnce(mockInstance);

      aiService.initialize('google', 'test-api-key');
      const result = await aiService.generateResponse('Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API_QUOTA_EXCEEDED');
      expect(result.errorType).toBe('QUOTA_EXCEEDED');
    });

    test('should handle network errors', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      
      const mockInstance = {
        invoke: jest.fn().mockRejectedValue({
          statusCode: 500,
          message: 'Network error',
        }),
      };
      ChatOpenAI.mockReturnValueOnce(mockInstance);

      aiService.initialize('openai', 'test-api-key');
      const result = await aiService.generateResponse('Test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('GENERAL');
    });

    test('should gracefully handle image when provider does not support it', async () => {
      // Note: All current providers support images, but test the logic
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      
      // Temporarily modify provider config to not support images
      const originalSupportsImage = AI.PROVIDERS.google.supportsImage;
      AI.PROVIDERS.google.supportsImage = false;

      aiService.initialize('google', 'test-api-key');
      const result = await aiService.generateResponse('Test prompt', 'data:image/png;base64,test');

      // Should still work, but without image
      expect(result.success).toBe(true);
      const mockInstance = ChatGoogleGenerativeAI.mock.results[ChatGoogleGenerativeAI.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([{ role: 'user', content: 'Test prompt' }]);

      // Restore original value
      AI.PROVIDERS.google.supportsImage = originalSupportsImage;
    });
  });

  describe('Message Formatting', () => {
    test('should format text-only messages correctly', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      
      aiService.initialize('google', 'test-api-key');
      await aiService.generateResponse('Test prompt');

      const mockInstance = ChatGoogleGenerativeAI.mock.results[ChatGoogleGenerativeAI.mock.results.length - 1].value;
      expect(mockInstance.invoke).toHaveBeenCalledWith([{ role: 'user', content: 'Test prompt' }]);
    });

    test('should extract base64 from data URL correctly', () => {
      const dataUrl = 'data:image/png;base64,dGVzdA==';
      aiService.initialize('google', 'test-api-key');
      const base64 = aiService._extractBase64(dataUrl);
      expect(base64).toBe('dGVzdA==');
    });

    test('should handle invalid data URL', () => {
      aiService.initialize('google', 'test-api-key');
      expect(() => {
        aiService._extractBase64('invalid-url');
      }).toThrow('Invalid image data URL');
    });
  });
});

