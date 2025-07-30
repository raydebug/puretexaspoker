import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/testSetup';
import { memoryCache } from '../../services/MemoryCache';
import { tableManager } from '../../services/TableManager';

// Mock dependencies
jest.mock('../../services/MemoryCache');
jest.mock('../../services/TableManager');
jest.mock('../../testDb', () => ({
  testPrisma: {
    user: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    table: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn()
    },
    playerTable: {
      deleteMany: jest.fn()
    }
  },
  initializeTestDatabase: jest.fn(),
  createTestTables: jest.fn(),
  createTestPlayers: jest.fn()
}));

const mockMemoryCache = memoryCache as jest.Mocked<typeof memoryCache>;
const mockTableManager = tableManager as jest.Mocked<typeof tableManager>;

describe('Test Routes API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup handled by setupTestDatabase
  });

  describe('Mock Table Management', () => {
    describe('POST /api/test/test_create_mock_table', () => {
      it('should create a mock table successfully', async () => {
        const mockTableData = {
          tableId: 1,
          players: [
            { id: 'player1', nickname: 'Player1', seatNumber: 1, chips: 1000 },
            { id: 'player2', nickname: 'Player2', seatNumber: 2, chips: 1000 }
          ],
          tableConfig: {
            dealerPosition: 1,
            smallBlindPosition: 2,
            bigBlindPosition: 3,
            minBet: 10,
            smallBlind: 5,
            bigBlind: 10
          }
        };

        mockMemoryCache.updateTable.mockImplementation(() => {});

        const response = await request(app)
          .post('/api/test/test_create_mock_table')
          .send(mockTableData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.tableId).toBe(1);
        expect(response.body.tableState.players).toHaveLength(2);
        expect(response.body.tableState.status).toBe('playing');
        expect(response.body.message).toBe('Mock table created for testing');
        expect(mockMemoryCache.updateTable).toHaveBeenCalled();
      });

      it('should handle mock table creation with minimal data', async () => {
        const mockTableData = {
          tableId: 2,
          players: [],
          tableConfig: {}
        };

        mockMemoryCache.updateTable.mockImplementation(() => {});

        const response = await request(app)
          .post('/api/test/test_create_mock_table')
          .send(mockTableData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.tableId).toBe(2);
        expect(response.body.tableState.players).toHaveLength(0);
        expect(response.body.tableState.currentPlayerId).toBeNull();
      });

      it('should handle mock table creation errors', async () => {
        mockMemoryCache.updateTable.mockImplementation(() => {
          throw new Error('Cache update failed');
        });

        const response = await request(app)
          .post('/api/test/test_create_mock_table')
          .send({ tableId: 1, players: [], tableConfig: {} })
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to create mock table');
      });
    });

    describe('GET /api/test/test_get_mock_table/:tableId', () => {
      it('should get mock table successfully', async () => {
        const mockTableState = {
          tableId: 1,
          status: 'playing',
          players: [{ id: 'player1', name: 'Player1' }]
        };

        mockMemoryCache.getTable.mockReturnValue(mockTableState);

        const response = await request(app)
          .get('/api/test/test_get_mock_table/1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.tableState).toEqual(mockTableState);
        expect(mockMemoryCache.getTable).toHaveBeenCalledWith('1');
      });

      it('should handle table not found', async () => {
        mockMemoryCache.getTable.mockReturnValue(null);

        const response = await request(app)
          .get('/api/test/test_get_mock_table/999')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Table not found');
      });
    });

    describe('PUT /api/test/test_update_mock_table/:tableId', () => {
      it('should update mock table successfully', async () => {
        const existingTable = {
          tableId: 1,
          status: 'waiting',
          players: []
        };

        const updateData = {
          status: 'playing',
          pot: 100
        };

        mockMemoryCache.getTable.mockReturnValue(existingTable);
        mockMemoryCache.updateTable.mockImplementation(() => {});

        const response = await request(app)
          .put('/api/test/test_update_mock_table/1')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Mock table updated');
        expect(mockMemoryCache.updateTable).toHaveBeenCalled();
      });

      it('should handle update of non-existent table', async () => {
        mockMemoryCache.getTable.mockReturnValue(null);

        const response = await request(app)
          .put('/api/test/test_update_mock_table/999')
          .send({ status: 'playing' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Table not found');
      });
    });
  });

  describe('Game State Management', () => {
    describe('POST /api/test/get_game_state', () => {
      it('should get game state successfully', async () => {
        const mockTableState = {
          tableId: 1,
          status: 'playing',
          phase: 'flop',
          players: [{ id: 'player1', name: 'Player1', chips: 1000 }],
          pot: 50,
          communityCards: ['A♠', 'K♥']
        };

        mockMemoryCache.getTable.mockReturnValue(mockTableState);

        const response = await request(app)
          .post('/api/test/get_game_state')
          .send({ tableId: 1 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.gameState).toEqual(mockTableState);
        expect(mockMemoryCache.getTable).toHaveBeenCalledWith('1');
      });

      it('should handle missing tableId', async () => {
        const response = await request(app)
          .post('/api/test/get_game_state')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Table ID is required');
      });

      it('should handle table not found', async () => {
        mockMemoryCache.getTable.mockReturnValue(null);

        const response = await request(app)
          .post('/api/test/get_game_state')
          .send({ tableId: 999 })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Table not found');
      });
    });

    describe('POST /api/test/emit_game_state', () => {
      it('should emit game state successfully', async () => {
        const mockTableState = {
          tableId: 1,
          status: 'playing',
          players: [{ id: 'player1', name: 'Player1' }]
        };

        mockMemoryCache.getTable.mockReturnValue(mockTableState);

        // Mock global socketIO
        const mockSocketIO = {
          to: jest.fn().mockReturnThis(),
          emit: jest.fn()
        };
        (global as any).socketIO = mockSocketIO;

        const response = await request(app)
          .post('/api/test/emit_game_state')
          .send({ tableId: 1 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Game state emitted to WebSocket clients');
        expect(mockSocketIO.to).toHaveBeenCalledWith('table:1');
        expect(mockSocketIO.emit).toHaveBeenCalled();

        // Cleanup
        delete (global as any).socketIO;
      });

      it('should handle emit without socket connection', async () => {
        const mockTableState = {
          tableId: 1,
          status: 'playing',
          players: []
        };

        mockMemoryCache.getTable.mockReturnValue(mockTableState);
        delete (global as any).socketIO;

        const response = await request(app)
          .post('/api/test/emit_game_state')
          .send({ tableId: 1 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Socket.IO not available');
      });
    });
  });

  describe('Database Management', () => {
    describe('POST /api/test/reset-database', () => {
      it('should reset database successfully', async () => {
        const mockTables = [
          { id: 1, name: 'Table 1', maxPlayers: 6 },
          { id: 2, name: 'Table 2', maxPlayers: 9 }
        ];

        // Mock testPrisma operations
        const { testPrisma } = require('../../testDb');
        testPrisma.user.deleteMany.mockResolvedValue({ count: 5 });
        testPrisma.table.deleteMany.mockResolvedValue({ count: 2 });
        testPrisma.playerTable.deleteMany.mockResolvedValue({ count: 10 });
        testPrisma.table.createMany.mockResolvedValue({ count: 2 });
        testPrisma.user.createMany.mockResolvedValue({ count: 5 });
        testPrisma.table.findMany.mockResolvedValue(mockTables);

        const response = await request(app)
          .post('/api/test/reset-database')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Database reset successfully');
        expect(response.body.tables).toEqual(mockTables);
        expect(testPrisma.user.deleteMany).toHaveBeenCalled();
        expect(testPrisma.table.deleteMany).toHaveBeenCalled();
        expect(testPrisma.playerTable.deleteMany).toHaveBeenCalled();
      });

      it('should handle database reset errors', async () => {
        const { testPrisma } = require('../../testDb');
        testPrisma.user.deleteMany.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/api/test/reset-database')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to reset database');
      });
    });

    describe('POST /api/test/init-memory-db', () => {
      it('should initialize memory database successfully', async () => {
        const { initializeTestDatabase } = require('../../testDb');
        initializeTestDatabase.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/test/init-memory-db')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Memory database initialized');
        expect(initializeTestDatabase).toHaveBeenCalled();
      });

      it('should handle memory database initialization errors', async () => {
        const { initializeTestDatabase } = require('../../testDb');
        initializeTestDatabase.mockRejectedValue(new Error('Initialization failed'));

        const response = await request(app)
          .post('/api/test/init-memory-db')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to initialize memory database');
      });
    });
  });

  describe('Game Actions', () => {
    describe('POST /api/test/start-game', () => {
      it('should start game successfully', async () => {
        const mockTable = {
          tableId: 1,
          status: 'waiting',
          players: [
            { id: 'player1', chips: 1000 },
            { id: 'player2', chips: 1000 }
          ]
        };

        mockTableManager.getTable.mockReturnValue(mockTable);
        mockTableManager.startGame.mockResolvedValue(true);

        const response = await request(app)
          .post('/api/test/start-game')
          .send({ tableId: 1 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Game started successfully');
        expect(mockTableManager.startGame).toHaveBeenCalledWith(1);
      });

      it('should handle missing tableId', async () => {
        const response = await request(app)
          .post('/api/test/start-game')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Table ID is required');
      });

      it('should handle table not found', async () => {
        mockTableManager.getTable.mockReturnValue(null);

        const response = await request(app)
          .post('/api/test/start-game')
          .send({ tableId: 999 })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Table not found');
      });
    });

    describe('POST /api/test/advance-phase', () => {
      it('should advance game phase successfully', async () => {
        const mockTable = {
          tableId: 1,
          phase: 'preflop',
          communityCards: []
        };

        mockTableManager.getTable.mockReturnValue(mockTable);
        mockTableManager.advanceToPhase.mockResolvedValue(true);

        const response = await request(app)
          .post('/api/test/advance-phase')
          .send({
            tableId: 1,
            phase: 'flop',
            communityCards: [
              { rank: 'A', suit: '♠' },
              { rank: 'K', suit: '♥' },
              { rank: 'Q', suit: '♦' }
            ]
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Phase advanced successfully');
        expect(mockTableManager.advanceToPhase).toHaveBeenCalled();
      });

      it('should handle invalid phase advancement', async () => {
        mockTableManager.getTable.mockReturnValue({ tableId: 1, phase: 'preflop' });
        mockTableManager.advanceToPhase.mockRejectedValue(new Error('Invalid phase transition'));

        const response = await request(app)
          .post('/api/test/advance-phase')
          .send({ tableId: 1, phase: 'invalid' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to advance phase');
      });
    });

    describe('POST /api/test/raise', () => {
      it('should handle raise action successfully', async () => {
        const mockTable = {
          tableId: 1,
          currentPlayerId: 'player1',
          players: [{ id: 'player1', chips: 1000 }]
        };

        mockTableManager.getTable.mockReturnValue(mockTable);
        mockTableManager.handlePlayerAction.mockResolvedValue({ success: true });

        const response = await request(app)
          .post('/api/test/raise')
          .send({
            tableId: 1,
            playerId: 'player1',
            amount: 100
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Raise action completed');
        expect(mockTableManager.handlePlayerAction).toHaveBeenCalledWith(
          1,
          'player1',
          'raise',
          100
        );
      });

      it('should handle invalid raise amount', async () => {
        const response = await request(app)
          .post('/api/test/raise')
          .send({
            tableId: 1,
            playerId: 'player1',
            amount: -10
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid raise amount');
      });
    });

    describe('POST /api/test/call', () => {
      it('should handle call action successfully', async () => {
        const mockTable = {
          tableId: 1,
          currentPlayerId: 'player1',
          players: [{ id: 'player1', chips: 1000 }]
        };

        mockTableManager.getTable.mockReturnValue(mockTable);
        mockTableManager.handlePlayerAction.mockResolvedValue({ success: true });

        const response = await request(app)
          .post('/api/test/call')
          .send({
            tableId: 1,
            playerId: 'player1'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Call action completed');
        expect(mockTableManager.handlePlayerAction).toHaveBeenCalledWith(
          1,
          'player1',
          'call',
          undefined
        );
      });
    });

    describe('POST /api/test/fold', () => {
      it('should handle fold action successfully', async () => {
        const mockTable = {
          tableId: 1,
          currentPlayerId: 'player1',
          players: [{ id: 'player1', chips: 1000 }]
        };

        mockTableManager.getTable.mockReturnValue(mockTable);
        mockTableManager.handlePlayerAction.mockResolvedValue({ success: true });

        const response = await request(app)
          .post('/api/test/fold')
          .send({
            tableId: 1,
            playerId: 'player1'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Fold action completed');
        expect(mockTableManager.handlePlayerAction).toHaveBeenCalledWith(
          1,
          'player1',
          'fold',
          undefined
        );
      });
    });
  });

  describe('Test Data Management', () => {
    describe('GET /api/test/test_data', () => {
      it('should get test data successfully', async () => {
        const mockData = {
          tables: [{ id: 1, name: 'Test Table' }],
          players: [{ id: 'player1', name: 'Test Player' }]
        };

        mockTableManager.getAllTables.mockReturnValue([mockData.tables[0]]);

        const response = await request(app)
          .get('/api/test/test_data')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });
    });

    describe('DELETE /api/test/test_data', () => {
      it('should cleanup test data successfully', async () => {
        const { cleanupTestData } = require('../../services/testService');
        // Mock the cleanupTestData function
        jest.doMock('../../services/testService', () => ({
          cleanupTestData: jest.fn().mockResolvedValue(undefined)
        }));

        const response = await request(app)
          .delete('/api/test/test_data')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Test data cleaned up');
      });
    });

    describe('GET /api/test/test-route', () => {
      it('should return test route confirmation', async () => {
        const response = await request(app)
          .get('/api/test/test-route')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Test route is working');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle general server errors gracefully', async () => {
      mockMemoryCache.getTable.mockImplementation(() => {
        throw new Error('Unexpected server error');
      });

      const response = await request(app)
        .get('/api/test/test_get_mock_table/1')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get mock table');
    });

    it('should handle missing required parameters', async () => {
      const response = await request(app)
        .post('/api/test/test_create_mock_table')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/test/start-game')
        .send('invalid json')
        .expect(400);

      // Express should handle malformed JSON automatically
    });
  });
});