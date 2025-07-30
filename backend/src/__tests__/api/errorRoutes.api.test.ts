import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/testSetup';
import { errorTrackingService } from '../../services/errorTrackingService';

// Mock the errorTrackingService
jest.mock('../../services/errorTrackingService', () => ({
  errorTrackingService: {
    trackError: jest.fn(),
    getRecentErrors: jest.fn(),
    clearOldLogs: jest.fn()
  }
}));

const mockErrorTrackingService = errorTrackingService as jest.Mocked<typeof errorTrackingService>;

describe('Error Routes API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup handled by setupTestDatabase
  });

  describe('POST /api/errors', () => {
    it('should log a new error successfully', async () => {
      const errorData = {
        message: 'Test error message',
        stack: 'Error stack trace',
        context: 'test-context'
      };

      const mockTrackedError = {
        message: 'Test error message',
        context: 'test-context',
        timestamp: new Date().toISOString(),
        severity: 'error' as const,
        stack: 'Error stack trace'
      };

      mockErrorTrackingService.trackError.mockReturnValue(mockTrackedError);

      const response = await request(app)
        .post('/api/errors')
        .send(errorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.error).toEqual(mockTrackedError);
      expect(mockErrorTrackingService.trackError).toHaveBeenCalledWith(errorData);
    });

    it('should handle error tracking service failure gracefully', async () => {
      const errorData = {
        message: 'Test error message',
        stack: 'Error stack trace'
      };

      mockErrorTrackingService.trackError.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .post('/api/errors')
        .send(errorData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to track error');
      expect(mockErrorTrackingService.trackError).toHaveBeenCalledWith(errorData);
    });

    it('should accept empty error data', async () => {
      const mockTrackedError = {
        message: '',
        context: 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'error' as const
      };

      mockErrorTrackingService.trackError.mockReturnValue(mockTrackedError);

      const response = await request(app)
        .post('/api/errors')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.error).toEqual(mockTrackedError);
    });

    it('should handle complex error objects', async () => {
      const complexErrorData = {
        message: 'Database connection failed',
        stack: 'Error at DatabaseConnection.connect',
        type: 'DatabaseError',
        code: 'CONN_FAILED',
        context: 'database-connection'
      };

      const mockTrackedError = {
        message: 'Database connection failed',
        context: 'database-connection',
        timestamp: new Date().toISOString(),
        severity: 'critical' as const,
        stack: 'Error at DatabaseConnection.connect'
      };

      mockErrorTrackingService.trackError.mockReturnValue(mockTrackedError);

      const response = await request(app)
        .post('/api/errors')
        .send(complexErrorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.error).toEqual(mockTrackedError);
      expect(mockErrorTrackingService.trackError).toHaveBeenCalledWith(complexErrorData);
    });
  });

  describe('GET /api/errors', () => {
    it('should get recent errors with default limit', async () => {
      const mockErrors = [
        {
          message: 'First error',
          context: 'test-context-1',
          timestamp: new Date().toISOString(),
          severity: 'error' as const
        },
        {
          message: 'Second error',
          context: 'test-context-2',
          timestamp: new Date().toISOString(),
          severity: 'warning' as const
        }
      ];

      mockErrorTrackingService.getRecentErrors.mockReturnValue(mockErrors);

      const response = await request(app)
        .get('/api/errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.errors).toEqual(mockErrors);
      expect(mockErrorTrackingService.getRecentErrors).toHaveBeenCalledWith(100);
    });

    it('should get recent errors with custom limit', async () => {
      const mockErrors = [
        {
          message: 'First error',
          context: 'test-context',
          timestamp: new Date().toISOString(),
          severity: 'error' as const
        }
      ];

      mockErrorTrackingService.getRecentErrors.mockReturnValue(mockErrors);

      const response = await request(app)
        .get('/api/errors?limit=50')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.errors).toEqual(mockErrors);
      expect(mockErrorTrackingService.getRecentErrors).toHaveBeenCalledWith(50);
    });

    it('should handle invalid limit parameter gracefully', async () => {
      const mockErrors: any[] = [];
      mockErrorTrackingService.getRecentErrors.mockReturnValue(mockErrors);

      const response = await request(app)
        .get('/api/errors?limit=invalid')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.errors).toEqual(mockErrors);
      // Should use default limit when invalid
      expect(mockErrorTrackingService.getRecentErrors).toHaveBeenCalledWith(100);
    });

    it('should handle zero limit parameter', async () => {
      const mockErrors: any[] = [];
      mockErrorTrackingService.getRecentErrors.mockReturnValue(mockErrors);

      const response = await request(app)
        .get('/api/errors?limit=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.errors).toEqual(mockErrors);
      expect(mockErrorTrackingService.getRecentErrors).toHaveBeenCalledWith(0);
    });

    it('should handle service error when getting errors', async () => {
      mockErrorTrackingService.getRecentErrors.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/errors')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get errors');
    });

    it('should return empty array when no errors exist', async () => {
      const mockErrors: any[] = [];
      mockErrorTrackingService.getRecentErrors.mockReturnValue(mockErrors);

      const response = await request(app)
        .get('/api/errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.errors).toEqual([]);
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('DELETE /api/errors', () => {
    it('should clear old logs with default maxAge', async () => {
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {
        // Mock successful cleanup
      });

      const response = await request(app)
        .delete('/api/errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockErrorTrackingService.clearOldLogs).toHaveBeenCalledWith(30);
    });

    it('should clear old logs with custom maxAge', async () => {
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {
        // Mock successful cleanup
      });

      const response = await request(app)
        .delete('/api/errors?maxAge=7')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockErrorTrackingService.clearOldLogs).toHaveBeenCalledWith(7);
    });

    it('should handle invalid maxAge parameter', async () => {
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {
        // Mock successful cleanup
      });

      const response = await request(app)
        .delete('/api/errors?maxAge=invalid')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should use default maxAge when invalid
      expect(mockErrorTrackingService.clearOldLogs).toHaveBeenCalledWith(30);
    });

    it('should handle zero maxAge parameter', async () => {
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {
        // Mock successful cleanup
      });

      const response = await request(app)
        .delete('/api/errors?maxAge=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockErrorTrackingService.clearOldLogs).toHaveBeenCalledWith(0);
    });

    it('should handle service error during cleanup', async () => {
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {
        throw new Error('Cleanup operation failed');
      });

      const response = await request(app)
        .delete('/api/errors')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to clear old logs');
    });

    it('should handle negative maxAge parameter', async () => {
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {
        // Mock successful cleanup
      });

      const response = await request(app)
        .delete('/api/errors?maxAge=-5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockErrorTrackingService.clearOldLogs).toHaveBeenCalledWith(-5);
    });

    it('should handle large maxAge parameter', async () => {
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {
        // Mock successful cleanup
      });

      const response = await request(app)
        .delete('/api/errors?maxAge=365')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockErrorTrackingService.clearOldLogs).toHaveBeenCalledWith(365);
    });
  });

  describe('Error Route Integration', () => {
    it('should track and retrieve errors in sequence', async () => {
      // Track an error
      const errorData = {
        message: 'Integration test error',
        context: 'integration-test'
      };

      const mockTrackedError = {
        message: 'Integration test error',
        context: 'integration-test',
        timestamp: new Date().toISOString(),
        severity: 'error' as const
      };

      mockErrorTrackingService.trackError.mockReturnValue(mockTrackedError);
      mockErrorTrackingService.getRecentErrors.mockReturnValue([mockTrackedError]);

      // Track the error
      await request(app)
        .post('/api/errors')
        .send(errorData)
        .expect(200);

      // Retrieve the error
      const response = await request(app)
        .get('/api/errors?limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].message).toBe('Integration test error');
    });

    it('should track error, then clear logs', async () => {
      // Track an error
      const errorData = { message: 'Error to be cleared' };
      const mockTrackedError = {
        message: 'Error to be cleared',
        context: 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'error' as const
      };

      mockErrorTrackingService.trackError.mockReturnValue(mockTrackedError);
      mockErrorTrackingService.clearOldLogs.mockImplementation(() => {});

      // Track the error
      await request(app)
        .post('/api/errors')
        .send(errorData)
        .expect(200);

      // Clear logs
      await request(app)
        .delete('/api/errors?maxAge=0')
        .expect(200);

      expect(mockErrorTrackingService.trackError).toHaveBeenCalled();
      expect(mockErrorTrackingService.clearOldLogs).toHaveBeenCalledWith(0);
    });
  });
});