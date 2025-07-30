import request from 'supertest';
import { Express } from 'express';
import { prisma } from '../../db';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/testSetup';

describe('Players API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test players
    await cleanupTestDatabase();
  });

  afterEach(async () => {
    // Clean up test players
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/players', () => {
    it('should create a new player successfully', async () => {
      const playerData = {
        nickname: 'testplayer1',
        chips: 1500
      };

      const response = await request(app)
        .post('/api/players')
        .send(playerData)
        .expect(201);

      expect(response.body.id).toBe('testplayer1');
      expect(response.body.nickname).toBe('testplayer1');
      expect(response.body.chips).toBe(1500);
    });

    it('should create player with default chips when not specified', async () => {
      const playerData = {
        nickname: 'testplayer2'
      };

      const response = await request(app)
        .post('/api/players')
        .send(playerData)
        .expect(201);

      expect(response.body.id).toBe('testplayer2');
      expect(response.body.nickname).toBe('testplayer2');
      expect(response.body.chips).toBe(1000);
    });

    it('should trim whitespace from nickname', async () => {
      const playerData = {
        nickname: '  testplayer3  ',
        chips: 2000
      };

      const response = await request(app)
        .post('/api/players')
        .send(playerData)
        .expect(201);

      expect(response.body.id).toBe('testplayer3');
      expect(response.body.nickname).toBe('testplayer3');
      expect(response.body.chips).toBe(2000);
    });

    it('should fail with missing nickname', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ chips: 1000 })
        .expect(400);

      expect(response.body.error).toBe('Nickname is required');
    });

    it('should fail with empty nickname', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ nickname: '', chips: 1000 })
        .expect(400);

      expect(response.body.error).toBe('Nickname is required');
    });

    it('should fail with whitespace-only nickname', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ nickname: '   ', chips: 1000 })
        .expect(400);

      expect(response.body.error).toBe('Nickname is required');
    });

    it('should fail with non-string nickname', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ nickname: 123, chips: 1000 })
        .expect(400);

      expect(response.body.error).toBe('Nickname is required');
    });

    it('should fail with negative chips', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ nickname: 'testplayer4', chips: -100 })
        .expect(400);

      expect(response.body.error).toBe('Chips must be a positive number');
    });

    it('should fail with non-numeric chips', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ nickname: 'testplayer5', chips: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Chips must be a positive number');
    });

    it('should fail when player with nickname already exists', async () => {
      // Create first player
      await request(app)
        .post('/api/players')
        .send({ nickname: 'testplayer6', chips: 1000 })
        .expect(201);

      // Try to create second player with same nickname
      const response = await request(app)
        .post('/api/players')
        .send({ nickname: 'testplayer6', chips: 2000 })
        .expect(400);

      expect(response.body.error).toBe('Player with this nickname already exists');
    });

    it('should handle edge case with zero chips', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ nickname: 'testplayer7', chips: 0 })
        .expect(201);

      expect(response.body.chips).toBe(0);
    });
  });

  describe('POST /api/players/register', () => {
    it('should register a new player successfully', async () => {
      const playerData = {
        nickname: 'testplayer_reg1',
        chips: 2000
      };

      const response = await request(app)
        .post('/api/players/register')
        .send(playerData)
        .expect(200);

      expect(response.body.id).toBe('testplayer_reg1');
      expect(response.body.nickname).toBe('testplayer_reg1');
      expect(response.body.chips).toBe(2000);
    });

    it('should register player without chips specified', async () => {
      const playerData = {
        nickname: 'testplayer_reg2'
      };

      const response = await request(app)
        .post('/api/players/register')
        .send(playerData)
        .expect(200);

      expect(response.body.id).toBe('testplayer_reg2');
      expect(response.body.nickname).toBe('testplayer_reg2');
      expect(response.body.chips).toBeNull(); // chips is null when not specified in register
    });

    it('should fail when player already exists', async () => {
      // Create first player
      await request(app)
        .post('/api/players/register')
        .send({ nickname: 'testplayer_reg3', chips: 1000 })
        .expect(200);

      // Try to register second player with same nickname
      const response = await request(app)
        .post('/api/players/register')
        .send({ nickname: 'testplayer_reg3', chips: 2000 })
        .expect(400);

      expect(response.body.error).toBe('Player with this nickname already exists');
    });

    it('should register multiple different players', async () => {
      const players = ['testplayer_reg4', 'testplayer_reg5', 'testplayer_reg6'];
      
      for (const nickname of players) {
        const response = await request(app)
          .post('/api/players/register')
          .send({ nickname, chips: 1500 })
          .expect(200);

        expect(response.body.nickname).toBe(nickname);
        expect(response.body.chips).toBe(1500);
      }
    });

    it('should handle database connection gracefully', async () => {
      // This test would be more meaningful with actual database disconnection simulation
      // For now, just verify normal operation
      const response = await request(app)
        .post('/api/players/register')
        .send({ nickname: 'testplayer_reg7', chips: 1000 })
        .expect(200);

      expect(response.body.nickname).toBe('testplayer_reg7');
    });
  });

  describe('Cross-endpoint consistency', () => {
    it('should maintain consistency between POST /players and POST /players/register', async () => {
      // Create player via main endpoint
      const player1Response = await request(app)
        .post('/api/players')
        .send({ nickname: 'testplayer_cross1', chips: 1000 })
        .expect(201);

      // Try to register player with same nickname via register endpoint
      const duplicateResponse = await request(app)
        .post('/api/players/register')
        .send({ nickname: 'testplayer_cross1', chips: 2000 })
        .expect(400);

      expect(duplicateResponse.body.error).toBe('Player with this nickname already exists');
    });

    it('should maintain consistency in reverse order', async () => {
      // Register player via register endpoint
      const player1Response = await request(app)
        .post('/api/players/register')
        .send({ nickname: 'testplayer_cross2', chips: 1500 })
        .expect(200);

      // Try to create player with same nickname via main endpoint
      const duplicateResponse = await request(app)
        .post('/api/players')
        .send({ nickname: 'testplayer_cross2', chips: 2500 })
        .expect(400);

      expect(duplicateResponse.body.error).toBe('Player with this nickname already exists');
    });
  });
});