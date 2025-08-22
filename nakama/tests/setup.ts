// Test setup for Nakama Pure Texas Poker backend tests

// Global test configuration
global.console = {
  ...console,
  // Suppress console logs during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock global timers for consistent testing
jest.useFakeTimers();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
}); 