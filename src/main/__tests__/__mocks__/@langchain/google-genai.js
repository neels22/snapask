/**
 * Mock for @langchain/google-genai
 * Provides mock ChatGoogleGenerativeAI class for testing
 */

const MockChatGoogleGenerativeAI = jest.fn().mockImplementation((config) => {
  return {
    config,
    model: config.model,
    apiKey: config.apiKey,
    invoke: jest.fn().mockResolvedValue({
      content: 'Mock Google Gemini response',
      text: () => 'Mock Google Gemini response',
    }),
  };
});

module.exports = {
  ChatGoogleGenerativeAI: MockChatGoogleGenerativeAI,
};
