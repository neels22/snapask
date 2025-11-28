/**
 * Unit tests for StorageService
 */

jest.mock('electron-store');
jest.mock('../../utils/logger', () => require('../../__tests__/__mocks__/logger'));

const Store = require('electron-store');
const StorageService = require('../StorageService');
const { STORAGE_KEYS } = require('../../config/constants');

describe('StorageService', () => {
  let storageService;
  let mockStore;

  beforeEach(() => {
    mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };
    Store.mockImplementation(() => mockStore);
    storageService = new StorageService();
    jest.clearAllMocks();
  });

  describe('AI Provider Storage', () => {
    test('should save AI provider', () => {
      storageService.saveAiProvider('google');
      expect(mockStore.set).toHaveBeenCalledWith(STORAGE_KEYS.AI_PROVIDER, 'google');
    });

    test('should retrieve AI provider', () => {
      mockStore.get.mockReturnValue('openai');
      const provider = storageService.getAiProvider();
      expect(provider).toBe('openai');
      expect(mockStore.get).toHaveBeenCalledWith(STORAGE_KEYS.AI_PROVIDER);
    });

    test('should return null for unset provider', () => {
      mockStore.get.mockReturnValue(null);
      const provider = storageService.getAiProvider();
      expect(provider).toBeNull();
    });
  });

  describe('AI Model Storage', () => {
    test('should save AI model', () => {
      storageService.saveAiModel('gpt-4o');
      expect(mockStore.set).toHaveBeenCalledWith(STORAGE_KEYS.AI_MODEL, 'gpt-4o');
    });

    test('should retrieve AI model', () => {
      mockStore.get.mockReturnValue('gemini-2.0-flash');
      const model = storageService.getAiModel();
      expect(model).toBe('gemini-2.0-flash');
      expect(mockStore.get).toHaveBeenCalledWith(STORAGE_KEYS.AI_MODEL);
    });

    test('should return null for unset model', () => {
      mockStore.get.mockReturnValue(null);
      const model = storageService.getAiModel();
      expect(model).toBeNull();
    });
  });

  describe('Persistence', () => {
    test('should persist provider across instances', () => {
      storageService.saveAiProvider('anthropic');
      const newStorageService = new StorageService();
      mockStore.get.mockReturnValue('anthropic');
      expect(newStorageService.getAiProvider()).toBe('anthropic');
    });

    test('should persist model across instances', () => {
      storageService.saveAiModel('claude-3-5-sonnet-20241022');
      const newStorageService = new StorageService();
      mockStore.get.mockReturnValue('claude-3-5-sonnet-20241022');
      expect(newStorageService.getAiModel()).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('Default Values', () => {
    test('should initialize with null provider and model in defaults', () => {
      // Create a new instance to trigger Store constructor
      const newService = new StorageService();
      expect(Store).toHaveBeenCalledWith({
        name: 'snapask-config',
        defaults: {
          [STORAGE_KEYS.API_KEY]: null,
          [STORAGE_KEYS.AI_PROVIDER]: null,
          [STORAGE_KEYS.AI_MODEL]: null,
          [STORAGE_KEYS.HAS_COMPLETED_ONBOARDING]: false,
        },
      });
    });
  });
});

