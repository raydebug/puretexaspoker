/**
 * Comprehensive Test Suite for Nakama Backend
 * Tests all migrated functionality including authentication, user management, and game logic
 */

import { UserManagementService } from '../src/auth/user_management';

// Mock Nakama runtime interfaces
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockNakama = {
  storageWrite: jest.fn(),
  storageRead: jest.fn(),
  storageList: jest.fn(),
  storageDelete: jest.fn(),
  matchCreate: jest.fn(),
  authenticateEmail: jest.fn(),
  sessionAuth: jest.fn()
};

const mockContext = {
  userId: 'test-user-123',
  username: 'testuser',
  sessionId: 'test-session-123'
};

describe('Nakama Backend Tests', () => {
  
  describe('User Management Service', () => {
    let userService: UserManagementService;

    beforeEach(() => {
      jest.clearAllMocks();
      userService = new UserManagementService(mockNakama as any, mockLogger as any);
    });

    describe('Role Management', () => {
      test('should initialize default roles and permissions', async () => {
        mockNakama.storageWrite.mockResolvedValue(undefined);

        await userService.initializeDefaultRoles();

        // Verify permissions were created
        expect(mockNakama.storageWrite).toHaveBeenCalledWith([
          expect.objectContaining({
            collection: "permissions",
            key: "join_game",
            value: expect.objectContaining({
              name: "join_game",
              category: "gameplay"
            })
          })
        ]);

        // Verify roles were created  
        expect(mockNakama.storageWrite).toHaveBeenCalledWith([
          expect.objectContaining({
            collection: "roles",
            key: "player",
            value: expect.objectContaining({
              name: "player",
              level: 0
            })
          })
        ]);

        expect(mockLogger.info).toHaveBeenCalledWith('✅ Default roles and permissions initialized');
      });

      test('should get role by name', async () => {
        const mockRole = {
          id: 'player',
          name: 'player',
          displayName: 'Player',
          level: 0,
          permissions: []
        };

        mockNakama.storageRead.mockResolvedValue([{ value: mockRole }]);

        const role = await userService.getRole('player');

        expect(role).toEqual(mockRole);
        expect(mockNakama.storageRead).toHaveBeenCalledWith([{
          collection: "roles",
          key: "player",
          userId: ""
        }]);
      });

      test('should return null for non-existent role', async () => {
        mockNakama.storageRead.mockResolvedValue([]);

        const role = await userService.getRole('nonexistent');

        expect(role).toBeNull();
      });
    });

    describe('User Profile Management', () => {
      test('should create new user profile', async () => {
        const mockSession = {
          user_id: 'user123',
          username: 'testuser'
        };

        const mockRole = {
          id: 'player',
          name: 'player',
          displayName: 'Player',
          level: 0,
          permissions: []
        };

        // Mock no existing profile
        mockNakama.storageRead.mockResolvedValueOnce([]);
        // Mock role lookup
        mockNakama.storageRead.mockResolvedValueOnce([{ value: mockRole }]);
        // Mock profile creation
        mockNakama.storageWrite.mockResolvedValue(undefined);

        const profile = await userService.createOrUpdateUserProfile(mockSession as any, {
          email: 'test@example.com',
          displayName: 'Test User'
        });

        expect(profile.id).toBe('user123');
        expect(profile.username).toBe('testuser');
        expect(profile.email).toBe('test@example.com');
        expect(profile.role).toEqual(mockRole);
        expect(profile.chips).toBe(10000);

        expect(mockNakama.storageWrite).toHaveBeenCalledWith([
          expect.objectContaining({
            collection: "user_profiles",
            key: "profile",
            userId: "user123",
            value: expect.objectContaining({
              id: "user123",
              username: "testuser",
              email: "test@example.com"
            })
          })
        ]);
      });

      test('should update existing user profile', async () => {
        const mockSession = {
          user_id: 'user123',
          username: 'testuser'
        };

        const existingProfile = {
          id: 'user123',
          username: 'testuser',
          chips: 5000,
          tablesPlayed: 10,
          role: { name: 'player' }
        };

        mockNakama.storageRead.mockResolvedValue([{ value: existingProfile }]);
        mockNakama.storageWrite.mockResolvedValue(undefined);

        const profile = await userService.createOrUpdateUserProfile(mockSession as any);

        expect(profile.lastLoginAt).toBeDefined();
        expect(profile.lastActiveAt).toBeDefined();
        expect(mockNakama.storageWrite).toHaveBeenCalled();
      });

      test('should check user permissions', async () => {
        const mockProfile = {
          id: 'user123',
          isActive: true,
          isBanned: false,
          role: {
            permissions: [
              { name: 'join_game' },
              { name: 'place_bet' }
            ]
          }
        };

        mockNakama.storageRead.mockResolvedValue([{ value: mockProfile }]);

        const hasPermission = await userService.hasPermission('user123', 'join_game');
        const noPermission = await userService.hasPermission('user123', 'ban_user');

        expect(hasPermission).toBe(true);
        expect(noPermission).toBe(false);
      });

      test('should deny permissions for banned users', async () => {
        const mockProfile = {
          id: 'user123',
          isActive: true,
          isBanned: true,
          role: {
            permissions: [{ name: 'join_game' }]
          }
        };

        mockNakama.storageRead.mockResolvedValue([{ value: mockProfile }]);

        const hasPermission = await userService.hasPermission('user123', 'join_game');

        expect(hasPermission).toBe(false);
      });
    });

    describe('User Moderation', () => {
      test('should ban user successfully', async () => {
        const mockProfile = {
          id: 'user123',
          username: 'testuser',
          isBanned: false
        };

        mockNakama.storageRead.mockResolvedValue([{ value: mockProfile }]);
        mockNakama.storageWrite.mockResolvedValue(undefined);

        const result = await userService.banUser('user123', 'moderator123', 'Spamming', 60);

        expect(result).toBe(true);
        expect(mockProfile.isBanned).toBe(true);
        expect(mockProfile.banInfo).toEqual({
          bannedBy: 'moderator123',
          bannedAt: expect.any(String),
          reason: 'Spamming',
          expiresAt: expect.any(String)
        });

        // Verify moderation action was logged
        expect(mockNakama.storageWrite).toHaveBeenCalledWith([
          expect.objectContaining({
            collection: "moderation_actions",
            value: expect.objectContaining({
              type: 'ban',
              targetUserId: 'user123',
              moderatorId: 'moderator123'
            })
          })
        ]);
      });

      test('should unban user successfully', async () => {
        const mockProfile = {
          id: 'user123',
          username: 'testuser',
          isBanned: true,
          banInfo: { bannedBy: 'moderator123' }
        };

        mockNakama.storageRead.mockResolvedValue([{ value: mockProfile }]);
        mockNakama.storageWrite.mockResolvedValue(undefined);

        const result = await userService.unbanUser('user123', 'moderator123');

        expect(result).toBe(true);
        expect(mockProfile.isBanned).toBe(false);
        expect(mockProfile.banInfo).toBeUndefined();
      });

      test('should check ban expiration', async () => {
        const expiredBan = {
          id: 'user123',
          isBanned: true,
          banInfo: {
            bannedBy: 'moderator123',
            expiresAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          }
        };

        mockNakama.storageRead.mockResolvedValue([{ value: expiredBan }]);
        mockNakama.storageWrite.mockResolvedValue(undefined);

        const expired = await userService.checkBanExpiration('user123');

        expect(expired).toBe(true);
        // Should have triggered automatic unban
        expect(mockNakama.storageWrite).toHaveBeenCalled();
      });
    });

    describe('User Statistics', () => {
      test('should update user stats', async () => {
        const mockProfile = {
          id: 'user123',
          chips: 1000,
          tablesPlayed: 5
        };

        mockNakama.storageRead.mockResolvedValue([{ value: mockProfile }]);
        mockNakama.storageWrite.mockResolvedValue(undefined);

        const result = await userService.updateUserStats('user123', {
          chips: 1500,
          tablesPlayed: 6,
          tablesWon: 1
        });

        expect(result).toBe(true);
        expect(mockProfile.chips).toBe(1500);
        expect(mockProfile.tablesPlayed).toBe(6);
        expect(mockProfile.lastActiveAt).toBeDefined();
      });
    });
  });

  describe('Test RPC Functions', () => {
    const testModule = require('../src/rpc_handlers/test_rpcs');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should create mock game', () => {
      mockNakama.matchCreate.mockReturnValue('match123');
      mockNakama.storageWrite.mockResolvedValue(undefined);

      const payload = JSON.stringify({
        tableId: 'test-table-1',
        players: [
          { id: 'player1', name: 'Alice', chips: 1000, seat: 1 }
        ]
      });

      const result = testModule.testCreateMockGameRpc(
        mockContext,
        mockLogger,
        mockNakama,
        payload
      );

      const response = JSON.parse(result);
      
      expect(response.success).toBe(true);
      expect(response.data.tableId).toBe('test-table-1');
      expect(response.data.matchId).toBe('match123');
      expect(mockNakama.matchCreate).toHaveBeenCalledWith("poker_table", expect.any(Object));
    });

    test('should handle test player action', () => {
      const mockGameState = {
        tableId: 'test-table-1',
        players: [
          { id: 'player1', name: 'Alice', chips: 1000, currentBet: 0 }
        ],
        pot: 100,
        currentBet: 50,
        actions: []
      };

      mockNakama.storageRead.mockResolvedValue([{ value: mockGameState }]);
      mockNakama.storageWrite.mockResolvedValue(undefined);

      const payload = JSON.stringify({
        tableId: 'test-table-1',
        playerId: 'player1',
        action: 'call'
      });

      const result = testModule.testPlayerActionRpc(
        mockContext,
        mockLogger,
        mockNakama,
        payload
      );

      const response = JSON.parse(result);
      
      expect(response.success).toBe(true);
      expect(response.data.action.action).toBe('call');
      expect(mockGameState.actions).toHaveLength(1);
    });

    test('should advance game phase', () => {
      const mockGameState = {
        tableId: 'test-table-1',
        phase: 'preflop',
        communityCards: []
      };

      mockNakama.storageRead.mockResolvedValue([{ value: mockGameState }]);
      mockNakama.storageWrite.mockResolvedValue(undefined);

      const payload = JSON.stringify({
        tableId: 'test-table-1',
        targetPhase: 'flop'
      });

      const result = testModule.testAdvancePhaseRpc(
        mockContext,
        mockLogger,
        mockNakama,
        payload
      );

      const response = JSON.parse(result);
      
      expect(response.success).toBe(true);
      expect(response.data.phase).toBe('flop');
      expect(mockGameState.communityCards).toHaveLength(3);
    });

    test('should cleanup test games', () => {
      const mockTestGames = {
        objects: [
          { key: 'test-table-1' },
          { key: 'test-table-2' }
        ]
      };

      mockNakama.storageList.mockReturnValue(mockTestGames);
      mockNakama.storageDelete.mockResolvedValue(undefined);

      const result = testModule.testCleanupGamesRpc(
        mockContext,
        mockLogger,
        mockNakama,
        '{}'
      );

      const response = JSON.parse(result);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('Cleaned up 2 test games');
      expect(mockNakama.storageDelete).toHaveBeenCalledWith([
        { collection: "test_games", key: "test-table-1", userId: mockContext.userId },
        { collection: "test_games", key: "test-table-2", userId: mockContext.userId }
      ]);
    });
  });

  describe('Authentication RPC Functions', () => {
    const authModule = require('../src/rpc_handlers/auth_rpcs');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should register new user', () => {
      mockNakama.authenticateEmail.mockReturnValue('new-user-123');
      mockNakama.sessionAuth.mockReturnValue({
        user_id: 'new-user-123',
        username: 'newuser'
      });

      const payload = JSON.stringify({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User'
      });

      const result = authModule.registerUserRpc(
        mockContext,
        mockLogger,
        mockNakama,
        payload
      );

      const response = JSON.parse(result);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('User registered successfully');
      expect(response.userId).toBe('new-user-123');
    });

    test('should handle registration validation errors', () => {
      const payload = JSON.stringify({
        username: 'x', // Too short
        email: 'invalid-email',
        password: '123', // Too short
        displayName: 'Test'
      });

      const result = authModule.registerUserRpc(
        mockContext,
        mockLogger,
        mockNakama,
        payload
      );

      const response = JSON.parse(result);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Username must be at least 3 characters');
    });
  });

  describe('Error Handling', () => {
    let userService: UserManagementService;

    beforeEach(() => {
      jest.clearAllMocks();
      userService = new UserManagementService(mockNakama as any, mockLogger as any);
    });

    test('should handle storage errors gracefully', async () => {
      mockNakama.storageRead.mockRejectedValue(new Error('Storage error'));

      const profile = await userService.getUserProfile('user123');

      expect(profile).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get user profile for user123:',
        expect.any(Error)
      );
    });

    test('should handle ban operation errors', async () => {
      mockNakama.storageRead.mockRejectedValue(new Error('Database error'));

      const result = await userService.banUser('user123', 'mod123', 'reason');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full user lifecycle', async () => {
      const userService = new UserManagementService(mockNakama as any, mockLogger as any);
      
      // Mock storage for role lookup
      mockNakama.storageRead
        .mockResolvedValueOnce([]) // No existing profile
        .mockResolvedValueOnce([{ value: { id: 'player', name: 'player', permissions: [] } }]); // Role lookup
      
      mockNakama.storageWrite.mockResolvedValue(undefined);

      // Create user profile
      const profile = await userService.createOrUpdateUserProfile({
        user_id: 'user123',
        username: 'testuser'
      } as any, {
        email: 'test@example.com'
      });

      expect(profile.id).toBe('user123');
      expect(profile.chips).toBe(10000);
      
      // Mock profile for permission check
      mockNakama.storageRead.mockResolvedValueOnce([{ value: profile }]);
      
      // Check permissions
      const hasJoinPermission = await userService.hasPermission('user123', 'join_game');
      
      // Should initially be false since no permissions were set in mock
      expect(hasJoinPermission).toBe(false);
    });
  });
});

describe('Performance Tests', () => {
  test('should handle multiple concurrent operations', async () => {
    const userService = new UserManagementService(mockNakama as any, mockLogger as any);
    
    mockNakama.storageRead.mockResolvedValue([{ value: { id: 'user', isActive: true, isBanned: false, role: { permissions: [] } } }]);
    
    const promises = Array.from({ length: 100 }, (_, i) => 
      userService.hasPermission(`user${i}`, 'join_game')
    );
    
    const start = Date.now();
    const results = await Promise.all(promises);
    const end = Date.now();
    
    expect(results).toHaveLength(100);
    expect(end - start).toBeLessThan(1000); // Should complete within 1 second
  });
});

describe('Data Validation Tests', () => {
  test('should validate user profile data integrity', async () => {
    const userService = new UserManagementService(mockNakama as any, mockLogger as any);
    
    mockNakama.storageRead.mockResolvedValueOnce([]);
    mockNakama.storageRead.mockResolvedValueOnce([{ value: { id: 'player', permissions: [] } }]);
    mockNakama.storageWrite.mockResolvedValue(undefined);
    
    const profile = await userService.createOrUpdateUserProfile({
      user_id: 'user123',
      username: 'testuser'
    } as any);
    
    // Verify required fields
    expect(profile.id).toBeDefined();
    expect(profile.username).toBeDefined();
    expect(profile.chips).toBeGreaterThan(0);
    expect(profile.isActive).toBe(true);
    expect(profile.isBanned).toBe(false);
    expect(profile.createdAt).toBeDefined();
    expect(profile.role).toBeDefined();
  });
});
