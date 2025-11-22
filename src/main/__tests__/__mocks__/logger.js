/**
 * Mock Logger for testing
 */

class MockLogger {
  constructor(context) {
    this.context = context;
    this.info = jest.fn();
    this.error = jest.fn();
    this.warn = jest.fn();
    this.debug = jest.fn();
    this.success = jest.fn();
  }
}

module.exports = MockLogger;

