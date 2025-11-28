/**
 * Mock for @langchain/openai
 * Provides mock ChatOpenAI class for testing
 */

const MockChatOpenAI = jest.fn().mockImplementation((config) => {
  return {
    config,
    modelName: config.modelName,
    openAIApiKey: config.openAIApiKey,
    invoke: jest.fn().mockResolvedValue({
      content: 'Mock OpenAI response',
      text: () => 'Mock OpenAI response',
    }),
  };
});

module.exports = {
  ChatOpenAI: MockChatOpenAI,
};
