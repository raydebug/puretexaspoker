import { authService } from '../../services/authService';
import { prisma } from '../../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock external dependencies
jest.mock('../../db');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService - TDD Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register() - TDD Red-Green-Refactor', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'securePassword123',
      displayName: 'Test User'
    };

    // RED: Test should fail initially
    describe('RED Phase - Failing Tests', () => {
      it('should fail when user already exists', async () => {
        // Arrange - Setup existing user
        mockPrisma.user.findFirst.mockResolvedValue({
          id: '1',
          username: 'testuser',
          email: 'test@example.com'
        } as any);

        // Act & Assert
        await expect(authService.register(validUserData))
          .rejects
          .toThrow('Username or email already exists');
      });

      it('should fail with invalid email format', async () => {
        // Arrange
        const invalidData = { ...validUserData, email: 'invalid-email' };
        mockPrisma.user.findFirst.mockResolvedValue(null);

        // Act & Assert
        await expect(authService.register(invalidData))
          .rejects
          .toThrow('Invalid email format');
      });

      it('should fail with weak password', async () => {
        // Arrange
        const weakPasswordData = { ...validUserData, password: '123' };
        mockPrisma.user.findFirst.mockResolvedValue(null);

        // Act & Assert
        await expect(authService.register(weakPasswordData))
          .rejects
          .toThrow('Password must be at least 8 characters');
      });
    });

    // GREEN: Make tests pass with minimal implementation
    describe('GREEN Phase - Passing Tests', () => {
      it('should successfully register new user', async () => {
        // Arrange
        mockPrisma.user.findFirst.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashedPassword');
        mockPrisma.user.create.mockResolvedValue({
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'hashedPassword',
          chips: 10000,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);

        mockJwt.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        // Act
        const result = await authService.register(validUserData);

        // Assert
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('tokens');
        expect(result.user.username).toBe('testuser');
        expect(result.tokens.accessToken).toBe('access-token');
        expect(result.tokens.refreshToken).toBe('refresh-token');
      });

      it('should hash password before storing', async () => {
        // Arrange
        mockPrisma.user.findFirst.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashedPassword');
        mockPrisma.user.create.mockResolvedValue({} as any);
        mockJwt.sign.mockReturnValue('token');

        // Act
        await authService.register(validUserData);

        // Assert
        expect(mockBcrypt.hash).toHaveBeenCalledWith('securePassword123', 12);
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            password: 'hashedPassword'
          })
        });
      });
    });

    // REFACTOR: Improve code quality while keeping tests green
    describe('REFACTOR Phase - Quality Improvements', () => {
      it('should sanitize input data', async () => {
        // Arrange
        const dataWithWhitespace = {
          username: '  testuser  ',
          email: '  TEST@EXAMPLE.COM  ',
          password: 'securePassword123',
          displayName: '  Test User  '
        };

        mockPrisma.user.findFirst.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashedPassword');
        mockPrisma.user.create.mockResolvedValue({} as any);
        mockJwt.sign.mockReturnValue('token');

        // Act
        await authService.register(dataWithWhitespace);

        // Assert
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com',
            displayName: 'Test User'
          })
        });
      });

      it('should set default user properties', async () => {
        // Arrange
        mockPrisma.user.findFirst.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue('hashedPassword');
        mockPrisma.user.create.mockResolvedValue({} as any);
        mockJwt.sign.mockReturnValue('token');

        // Act
        await authService.register(validUserData);

        // Assert
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            chips: 10000,
            roleId: 'player',
            isActive: true,
            isBanned: false
          })
        });
      });
    });
  });

  describe('login() - Security-First TDD', () => {
    describe('RED Phase - Security Tests', () => {
      it('should fail with non-existent user', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);

        await expect(authService.login({
          username: 'nonexistent',
          password: 'password'
        })).rejects.toThrow('Invalid credentials');
      });

      it('should fail with incorrect password', async () => {
        mockPrisma.user.findFirst.mockResolvedValue({
          id: '1',
          password: 'hashedPassword'
        } as any);
        mockBcrypt.compare.mockResolvedValue(false);

        await expect(authService.login({
          username: 'testuser',
          password: 'wrongpassword'
        })).rejects.toThrow('Invalid credentials');
      });

      it('should fail with banned user', async () => {
        mockPrisma.user.findFirst.mockResolvedValue({
          id: '1',
          isBanned: true,
          banReason: 'Policy violation'
        } as any);

        await expect(authService.login({
          username: 'banneduser',
          password: 'password'
        })).rejects.toThrow('Account is banned: Policy violation');
      });
    });

    describe('GREEN Phase - Successful Authentication', () => {
      it('should login with valid credentials', async () => {
        // Arrange
        const user = {
          id: '1',
          username: 'testuser',
          password: 'hashedPassword',
          isBanned: false,
          isActive: true
        };

        mockPrisma.user.findFirst.mockResolvedValue(user as any);
        mockBcrypt.compare.mockResolvedValue(true);
        mockJwt.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        // Act
        const result = await authService.login({
          username: 'testuser',
          password: 'password'
        });

        // Assert
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('tokens');
        expect(result.tokens.accessToken).toBe('access-token');
      });

      it('should update last login timestamp', async () => {
        // Arrange
        const user = { id: '1', isBanned: false, isActive: true };
        mockPrisma.user.findFirst.mockResolvedValue(user as any);
        mockBcrypt.compare.mockResolvedValue(true);
        mockJwt.sign.mockReturnValue('token');
        mockPrisma.user.update.mockResolvedValue({} as any);

        // Act
        await authService.login({ username: 'testuser', password: 'password' });

        // Assert
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: '1' },
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
            lastActiveAt: expect.any(Date)
          })
        });
      });
    });
  });

  describe('Token Management - TDD', () => {
    describe('verifyToken()', () => {
      it('should verify valid access token', () => {
        const payload = { userId: '1', type: 'access' };
        mockJwt.verify.mockReturnValue(payload as any);

        const result = authService.verifyToken('valid-token');

        expect(result).toEqual(payload);
        expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      });

      it('should reject expired token', () => {
        mockJwt.verify.mockImplementation(() => {
          throw new Error('Token expired');
        });

        const result = authService.verifyToken('expired-token');

        expect(result).toBeNull();
      });

      it('should reject malformed token', () => {
        mockJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const result = authService.verifyToken('invalid-token');

        expect(result).toBeNull();
      });
    });

    describe('refreshToken()', () => {
      it('should generate new access token with valid refresh token', async () => {
        const payload = { userId: '1', type: 'refresh' };
        mockJwt.verify.mockReturnValue(payload as any);
        mockPrisma.user.findUnique.mockResolvedValue({
          id: '1',
          isActive: true,
          isBanned: false
        } as any);
        mockJwt.sign.mockReturnValue('new-access-token');

        const result = await authService.refreshToken('valid-refresh-token');

        expect(result.accessToken).toBe('new-access-token');
      });

      it('should fail with invalid refresh token type', async () => {
        const payload = { userId: '1', type: 'access' }; // Wrong type
        mockJwt.verify.mockReturnValue(payload as any);

        await expect(authService.refreshToken('wrong-type-token'))
          .rejects
          .toThrow('Invalid refresh token');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      await expect(authService.register({
        username: 'test',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test'
      })).rejects.toThrow('Registration failed');
    });

    it('should handle bcrypt hashing errors', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockBcrypt.hash.mockRejectedValue(new Error('Hashing failed'));

      await expect(authService.register({
        username: 'test',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test'
      })).rejects.toThrow('Password processing failed');
    });
  });
});