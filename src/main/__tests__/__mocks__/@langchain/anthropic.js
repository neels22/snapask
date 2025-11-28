/**
 * Mock for @langchain/anthropic
 * Provides mock ChatAnthropic class for testing
 */

const MockChatAnthropic = jest.fn().mockImplementation((config) => {
  return {
    config,
    modelName: config.modelName,
    anthropicApiKey: config.anthropicApiKey,
    invoke: jest.fn().mockResolvedValue({
      content: 'Mock Anthropic Claude response',
      text: () => 'Mock Anthropic Claude response',
    }),
  };
});

module.exports = {
  ChatAnthropic: MockChatAnthropic,
};
