/**
 * Integration tests for IPC handlers with provider/model support
 */

jest.mock('electron');
jest.mock('electron-store');
jest.mock('@langchain/google-genai');
jest.mock('@langchain/openai');
jest.mock('@langchain/anthropic');
jest.mock('../utils/logger', () => require('../__tests__/__mocks__/logger'));

const Store = require('electron-store');
const { ipcMain } = require('electron');
const { setupIpcHandlers } = require('../handlers/ipcHandlers');
const AIService = require('../services/AIService');
const StorageService = require('../services/StorageService');
const WindowManager = require('../services/WindowManager');
const ConversationService = require('../services/ConversationService');
const { AI, IPC_CHANNELS } = require('../config/constants');

describe('IPC Handlers Integration - Provider/Model Support', () => {
  let aiService;
  let storageService;
  let windowManager;
  let conversationService;
  let handlers;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock electron-store
    const mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };
    Store.mockImplementation(() => mockStore);

    aiService = new AIService();
    storageService = new StorageService();
    windowManager = new WindowManager();
    
    // Mock databaseService for ConversationService
    const mockDatabaseService = {
      getDb: jest.fn().mockReturnValue({
        prepare: jest.fn().mockReturnValue({
          run: jest.fn(),
          get: jest.fn(),
          all: jest.fn(),
        }),
      }),
    };
    conversationService = new ConversationService(mockDatabaseService);

    // Mock IPC handlers
    ipcMain.handle = jest.fn();
    ipcMain.on = jest.fn();

    setupIpcHandlers(windowManager, aiService, storageService, conversationService);

    // Capture handlers
    handlers = {};
    ipcMain.handle.mock.calls.forEach(([channel, handler]) => {
      handlers[channel] = handler;
    });
  });

  describe('SAVE_API_KEY Handler', () => {
    test('should save API key with provider and model', async () => {
      storageService.saveApiKey = jest.fn().mockReturnValue(true);
      storageService.saveAiProvider = jest.fn();
      storageService.saveAiModel = jest.fn();
      storageService.getAiProvider = jest.fn().mockReturnValue(null);
      storageService.getAiModel = jest.fn().mockReturnValue(null);
      storageService.setOnboardingCompleted = jest.fn();
      aiService.initialize = jest.fn();

      const result = await handlers[IPC_CHANNELS.SAVE_API_KEY](null, {
        apiKey: 'test-api-key',
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(result.success).toBe(true);
      expect(storageService.saveApiKey).toHaveBeenCalledWith('test-api-key');
      expect(storageService.saveAiProvider).toHaveBeenCalledWith('openai');
      expect(storageService.saveAiModel).toHaveBeenCalledWith('gpt-4o');
      expect(aiService.initialize).toHaveBeenCalledWith('openai', 'test-api-key', 'gpt-4o');
    });

    test('should use stored provider/model if not provided', async () => {
      storageService.saveApiKey = jest.fn().mockReturnValue(true);
      storageService.saveAiProvider = jest.fn();
      storageService.saveAiModel = jest.fn();
      storageService.getAiProvider = jest.fn().mockReturnValue('anthropic');
      storageService.getAiModel = jest.fn().mockReturnValue('claude-3-5-sonnet-20241022');
      storageService.setOnboardingCompleted = jest.fn();
      aiService.initialize = jest.fn();

      const result = await handlers[IPC_CHANNELS.SAVE_API_KEY](null, {
        apiKey: 'test-api-key',
      });

      expect(result.success).toBe(true);
      expect(aiService.initialize).toHaveBeenCalledWith(
        'anthropic',
        'test-api-key',
        'claude-3-5-sonnet-20241022'
      );
    });

    test('should use defaults if no provider/model stored', async () => {
      storageService.saveApiKey = jest.fn().mockReturnValue(true);
      storageService.getAiProvider = jest.fn().mockReturnValue(null);
      storageService.getAiModel = jest.fn().mockReturnValue(null);
      storageService.setOnboardingCompleted = jest.fn();
      aiService.initialize = jest.fn();

      const result = await handlers[IPC_CHANNELS.SAVE_API_KEY](null, {
        apiKey: 'test-api-key',
      });

      expect(result.success).toBe(true);
      expect(aiService.initialize).toHaveBeenCalledWith(
        AI.DEFAULT_PROVIDER,
        'test-api-key',
        AI.DEFAULT_MODEL
      );
    });

    test('should support backward compatibility with string API key', async () => {
      storageService.saveApiKey = jest.fn().mockReturnValue(true);
      storageService.getAiProvider = jest.fn().mockReturnValue(null);
      storageService.getAiModel = jest.fn().mockReturnValue(null);
      storageService.setOnboardingCompleted = jest.fn();
      aiService.initialize = jest.fn();

      const result = await handlers[IPC_CHANNELS.SAVE_API_KEY](null, 'test-api-key');

      expect(result.success).toBe(true);
      expect(storageService.saveApiKey).toHaveBeenCalledWith('test-api-key');
      expect(aiService.initialize).toHaveBeenCalledWith(
        AI.DEFAULT_PROVIDER,
        'test-api-key',
        AI.DEFAULT_MODEL
      );
    });
  });

  describe('GET_API_KEY Handler', () => {
    test('should return API key with provider and model', () => {
      storageService.getApiKey = jest.fn().mockReturnValue('test-api-key');
      storageService.getAiProvider = jest.fn().mockReturnValue('openai');
      storageService.getAiModel = jest.fn().mockReturnValue('gpt-4o');

      const result = handlers[IPC_CHANNELS.GET_API_KEY]();

      expect(result).toEqual({
        apiKey: 'test-api-key',
        provider: 'openai',
        model: 'gpt-4o',
      });
    });

    test('should return string for backward compatibility when only API key exists', () => {
      storageService.getApiKey = jest.fn().mockReturnValue('test-api-key');
      storageService.getAiProvider = jest.fn().mockReturnValue(null);
      storageService.getAiModel = jest.fn().mockReturnValue(null);

      const result = handlers[IPC_CHANNELS.GET_API_KEY]();

      expect(result).toBe('test-api-key');
    });
  });

  describe('ASK_AI Handler', () => {
    test('should initialize AI with stored provider/model if not initialized', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      const mockModel = {
        invoke: jest.fn().mockResolvedValue({
          content: 'Test response',
          text: () => 'Test response',
        }),
      };
      ChatGoogleGenerativeAI.mockImplementation(() => mockModel);

      storageService.getApiKey = jest.fn().mockReturnValue('test-api-key');
      storageService.getAiProvider = jest.fn().mockReturnValue('google');
      storageService.getAiModel = jest.fn().mockReturnValue('gemini-2.0-flash');

      await handlers[IPC_CHANNELS.ASK_AI](null, {
        prompt: 'Test prompt',
      });

      expect(aiService.isInitialized()).toBe(true);
      expect(mockModel.invoke).toHaveBeenCalled();
    });

    test('should use defaults if provider/model not stored', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      const mockModel = {
        invoke: jest.fn().mockResolvedValue({
          content: 'Test response',
          text: () => 'Test response',
        }),
      };
      ChatGoogleGenerativeAI.mockImplementation(() => mockModel);

      storageService.getApiKey = jest.fn().mockReturnValue('test-api-key');
      storageService.getAiProvider = jest.fn().mockReturnValue(null);
      storageService.getAiModel = jest.fn().mockReturnValue(null);

      await handlers[IPC_CHANNELS.ASK_AI](null, {
        prompt: 'Test prompt',
      });

      expect(aiService.getProviderType()).toBe(AI.DEFAULT_PROVIDER);
      expect(aiService.getModel()).toBe(AI.DEFAULT_MODEL);
    });
  });

  describe('get-ai-providers Handler', () => {
    test('should return available providers and default provider', () => {
      const handler = handlers['get-ai-providers'];
      const result = handler();

      expect(result.success).toBe(true);
      expect(result.providers).toEqual(AI.PROVIDERS);
      expect(result.defaultProvider).toBe(AI.DEFAULT_PROVIDER);
    });
  });

  describe('Backward Compatibility', () => {
    test('should default to Google Gemini when provider/model not stored', async () => {
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      const mockModel = {
        invoke: jest.fn().mockResolvedValue({
          content: 'Test response',
          text: () => 'Test response',
        }),
      };
      ChatGoogleGenerativeAI.mockImplementation(() => mockModel);

      storageService.getApiKey = jest.fn().mockReturnValue('test-api-key');
      storageService.getAiProvider = jest.fn().mockReturnValue(null);
      storageService.getAiModel = jest.fn().mockReturnValue(null);

      await handlers[IPC_CHANNELS.ASK_AI](null, {
        prompt: 'Test prompt',
      });

      expect(aiService.getProviderType()).toBe(AI.DEFAULT_PROVIDER);
      expect(aiService.getModel()).toBe(AI.DEFAULT_MODEL);
    });

    test('should handle old API key format (string only)', async () => {
      storageService.saveApiKey = jest.fn().mockReturnValue(true);
      storageService.getAiProvider = jest.fn().mockReturnValue(null);
      storageService.getAiModel = jest.fn().mockReturnValue(null);
      storageService.setOnboardingCompleted = jest.fn();
      aiService.initialize = jest.fn();

      const result = await handlers[IPC_CHANNELS.SAVE_API_KEY](null, 'old-format-api-key');

      expect(result.success).toBe(true);
      expect(aiService.initialize).toHaveBeenCalledWith(
        AI.DEFAULT_PROVIDER,
        'old-format-api-key',
        AI.DEFAULT_MODEL
      );
    });
  });
});

