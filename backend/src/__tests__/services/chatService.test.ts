import { chatService } from '../../services/chatService';

describe('ChatService - Iteration 1: Timestamp Display', () => {
  describe('formatRelativeTime() - Pure Function Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "just now" for recent dates', () => {
      // Arrange
      const currentTime = new Date('2023-01-01T12:00:00Z');
      const recentDate = new Date('2023-01-01T11:59:30Z');
      jest.setSystemTime(currentTime);

      // Act
      const result = chatService.formatRelativeTime(recentDate);

      // Assert
      expect(result).toBe('just now');
    });

    it('should return correct minute formatting', () => {
      // Arrange
      const currentTime = new Date('2023-01-01T12:00:00Z');
      jest.setSystemTime(currentTime);

      const testCases = [
        { date: new Date('2023-01-01T11:58:00Z'), expected: '2 minutes ago' },
        { date: new Date('2023-01-01T11:55:00Z'), expected: '5 minutes ago' },
      ];

      testCases.forEach(({ date, expected }) => {
        // Act
        const result = chatService.formatRelativeTime(date);

        // Assert
        expect(result).toBe(expected);
      });
    });

    it('should return correct hour formatting', () => {
      // Arrange
      const currentTime = new Date('2023-01-01T12:00:00Z');
      const oneHourAgo = new Date('2023-01-01T11:00:00Z');
      jest.setSystemTime(currentTime);

      // Act
      const result = chatService.formatRelativeTime(oneHourAgo);

      // Assert
      expect(result).toBe('1 hour ago');
    });

    it('should return correct day formatting', () => {
      // Arrange
      const currentTime = new Date('2023-01-01T12:00:00Z');
      const oneDayAgo = new Date('2022-12-31T12:00:00Z');
      jest.setSystemTime(currentTime);

      // Act
      const result = chatService.formatRelativeTime(oneDayAgo);

      // Assert
      expect(result).toBe('1 day ago');
    });

    it('should handle future dates gracefully', () => {
      // Arrange
      const currentTime = new Date('2023-01-01T12:00:00Z');
      const futureDate = new Date('2023-01-01T13:00:00Z');
      jest.setSystemTime(currentTime);

      // Act
      const result = chatService.formatRelativeTime(futureDate);

      // Assert
      expect(result).toBe('just now');
    });

    it('should handle very old dates', () => {
      // Arrange
      const currentTime = new Date('2023-01-01T12:00:00Z');
      const veryOldDate = new Date('2020-01-01T12:00:00Z');
      jest.setSystemTime(currentTime);

      // Act
      const result = chatService.formatRelativeTime(veryOldDate);

      // Assert
      expect(result).toBe('3 years ago');
    });
  });

  describe('sanitizeContent() - Security Tests', () => {
    it('should remove script tags', () => {
      // Use reflection to access private method for testing
      const sanitizeContent = (chatService as any).sanitizeContent.bind(chatService);
      
      // Arrange
      const maliciousContent = '<script>alert("xss")</script>Hello world';

      // Act
      const result = sanitizeContent(maliciousContent);

      // Assert
      expect(result).toBe('Hello world');
      expect(result).not.toContain('<script>');
    });

    it('should remove HTML tags', () => {
      // Use reflection to access private method for testing
      const sanitizeContent = (chatService as any).sanitizeContent.bind(chatService);
      
      // Arrange
      const htmlContent = '<div><p>Hello <b>world</b></p></div>';

      // Act
      const result = sanitizeContent(htmlContent);

      // Assert
      expect(result).toBe('Hello world');
    });

    it('should trim whitespace', () => {
      // Use reflection to access private method for testing
      const sanitizeContent = (chatService as any).sanitizeContent.bind(chatService);
      
      // Arrange
      const contentWithWhitespace = '   Hello world   ';

      // Act
      const result = sanitizeContent(contentWithWhitespace);

      // Assert
      expect(result).toBe('Hello world');
    });
  });
});