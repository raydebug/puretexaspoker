import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/testApp';
import { tableManager } from '../../services/TableManager';
import { locationManager } from '../../services/LocationManager';
import { setupTestDatabase } from '../helpers/testSetup';

describe('Tables API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Clear table state before each test
    locationManager.clearAllUsers();
  });

  afterEach(async () => {
    // Clean up after each test
    locationManager.clearAllUsers();
  });

  describe('GET /api/tables', () => {
    it('should return all default tables', async () => {
      const response = await request(app)
        .get('/api/tables')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      
      // Check each table has required properties
      response.body.forEach((table: any) => {
        expect(table).toHaveProperty('id');
        expect(table).toHaveProperty('name');
        expect(table).toHaveProperty('gameType');
        expect(table).toHaveProperty('stakes');
        expect(table).toHaveProperty('maxPlayers');
        expect(table).toHaveProperty('minBuyIn');
        expect(table).toHaveProperty('maxBuyIn');
      });

      // Verify table IDs are 1, 2, 3
      const tableIds = response.body.map((table: any) => table.id).sort();
      expect(tableIds).toEqual([1, 2, 3]);
    });

    it('should return consistent table data', async () => {
      const response1 = await request(app)
        .get('/api/tables')
        .expect(200);

      const response2 = await request(app)
        .get('/api/tables')
        .expect(200);

      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('GET /api/tables/:tableId', () => {
    it('should return specific table data for valid table ID', async () => {
      const response = await request(app)
        .get('/api/tables/1')
        .expect(200);

      expect(response.body.id).toBe(1);
      expect(response.body.name).toBeDefined();
      expect(response.body.gameType).toBeDefined();
      expect(response.body.currentGameId).toBe('1');
    });

    it('should return table 2 data', async () => {
      const response = await request(app)
        .get('/api/tables/2')
        .expect(200);

      expect(response.body.id).toBe(2);
      expect(response.body.currentGameId).toBe('2');
    });

    it('should return table 3 data', async () => {
      const response = await request(app)
        .get('/api/tables/3')
        .expect(200);

      expect(response.body.id).toBe(3);
      expect(response.body.currentGameId).toBe('3');
    });

    it('should fail for invalid table ID (too low)', async () => {
      const response = await request(app)
        .get('/api/tables/0')
        .expect(400);

      expect(response.body.error).toBe('Only tables 1, 2, and 3 are available');
    });

    it('should fail for invalid table ID (too high)', async () => {
      const response = await request(app)
        .get('/api/tables/4')
        .expect(400);

      expect(response.body.error).toBe('Only tables 1, 2, and 3 are available');
    });

    it('should fail for non-numeric table ID', async () => {
      const response = await request(app)
        .get('/api/tables/invalid')
        .expect(400);

      expect(response.body.error).toBe('Only tables 1, 2, and 3 are available');
    });
  });

  describe('POST /api/tables/:tableId/join', () => {
    const playerId = 'test-player-1';

    it('should join table successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/tables/1/join')
        .send({
          playerId: playerId,
          buyIn: 1000
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tableId).toBe(1);
    });

    it('should join table with default buy-in when not specified', async () => {
      const response = await request(app)
        .post('/api/tables/1/join')
        .send({
          playerId: playerId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tableId).toBe(1);
    });

    it('should fail for invalid table ID', async () => {
      const response = await request(app)
        .post('/api/tables/4/join')
        .send({
          playerId: playerId,
          buyIn: 1000
        })
        .expect(400);

      expect(response.body.error).toBe('Only tables 1, 2, and 3 are available');
    });

    it('should fail with buy-in below minimum', async () => {
      const table = tableManager.getTable(1);
      const lowBuyIn = table!.minBuyIn - 100;

      const response = await request(app)
        .post('/api/tables/1/join')
        .send({
          playerId: playerId,
          buyIn: lowBuyIn
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid buy-in amount');
    });

    it('should fail with buy-in above maximum', async () => {
      const table = tableManager.getTable(1);
      const highBuyIn = table!.maxBuyIn + 100;

      const response = await request(app)
        .post('/api/tables/1/join')
        .send({
          playerId: playerId,
          buyIn: highBuyIn
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid buy-in amount');
    });
  });

  describe('POST /api/tables/:tableId/spectate', () => {
    const playerId = 'test-spectator-1';

    it('should spectate table successfully', async () => {
      const response = await request(app)
        .post('/api/tables/1/spectate')
        .send({
          playerId: playerId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tableId).toBe(1);
      expect(response.body.message).toBe('Successfully joined as spectator');
    });

    it('should spectate all tables successfully', async () => {
      for (let tableId = 1; tableId <= 3; tableId++) {
        const response = await request(app)
          .post(`/api/tables/${tableId}/spectate`)
          .send({
            playerId: `${playerId}-table${tableId}`
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.tableId).toBe(tableId);
      }
    });

    it('should fail for invalid table ID', async () => {
      const response = await request(app)
        .post('/api/tables/4/spectate')
        .send({
          playerId: playerId
        })
        .expect(400);

      expect(response.body.error).toBe('Only tables 1, 2, and 3 are available');
    });
  });

  describe('GET /api/tables/monitor', () => {
    it('should return monitoring data for all tables', async () => {
      const response = await request(app)
        .get('/api/tables/monitor')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      response.body.forEach((table: any) => {
        expect(table).toHaveProperty('id');
        expect(table).toHaveProperty('name');
        expect(table).toHaveProperty('observers');
        expect(table).toHaveProperty('players');
        expect(table).toHaveProperty('observersCount');
        expect(table).toHaveProperty('playersCount');
        expect(table).toHaveProperty('totalUsers');
        expect(table).toHaveProperty('hasValidCounts');
        expect(table).toHaveProperty('hasOverlaps');
        expect(table).toHaveProperty('hasDuplicateObservers');
        expect(table).toHaveProperty('hasDuplicatePlayers');
        expect(Array.isArray(table.observers)).toBe(true);
        expect(Array.isArray(table.players)).toBe(true);
      });
    });

    it('should show observers after spectating', async () => {
      // Add a spectator to table 1
      await request(app)
        .post('/api/tables/1/spectate')
        .send({ playerId: 'test-spectator' })
        .expect(200);

      // Check monitoring data
      const response = await request(app)
        .get('/api/tables/monitor')
        .expect(200);

      const table1 = response.body.find((table: any) => table.id === 1);
      expect(table1.observersCount).toBeGreaterThan(0);
      expect(table1.totalUsers).toBeGreaterThan(0);
    });

    it('should show players after joining', async () => {
      // Add a player to table 1
      await request(app)
        .post('/api/tables/1/join')
        .send({ playerId: 'test-player' })
        .expect(200);

      // Check monitoring data
      const response = await request(app)
        .get('/api/tables/monitor')
        .expect(200);

      const table1 = response.body.find((table: any) => table.id === 1);
      expect(table1.playersCount).toBeGreaterThan(0);
      expect(table1.totalUsers).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tables/:tableId/game/history', () => {
    it('should return empty game history for valid table', async () => {
      const response = await request(app)
        .get('/api/tables/1/game/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.gameHistory).toEqual([]);
      expect(response.body.tableId).toBe(1);
      expect(response.body.handNumber).toBeNull();
    });

    it('should return game history with hand number query', async () => {
      const response = await request(app)
        .get('/api/tables/1/game/history?handNumber=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.gameHistory).toEqual([]);
      expect(response.body.tableId).toBe(1);
      expect(response.body.handNumber).toBe(5);
    });

    it('should work for all valid tables', async () => {
      for (let tableId = 1; tableId <= 3; tableId++) {
        const response = await request(app)
          .get(`/api/tables/${tableId}/game/history`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.tableId).toBe(tableId);
      }
    });

    it('should fail for invalid table ID', async () => {
      const response = await request(app)
        .get('/api/tables/4/game/history')
        .expect(400);

      expect(response.body.error).toBe('Only tables 1, 2, and 3 are available');
    });
  });
});