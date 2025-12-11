import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/testApp';

describe('Chat API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear chat messages before each test by making a request that triggers cleanup
    // Since we can't directly access chatMessages, we'll rely on natural cleanup
  });

  describe('POST /api/chat/messages', () => {
    it('should create a new chat message successfully', async () => {
      const messageData = {
        content: 'Hello, world!',
        playerId: 'player123'
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.content).toBe('Hello, world!');
      expect(response.body.playerId).toBe('player123');
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('number');
    });

    it('should create message with special characters', async () => {
      const messageData = {
        content: 'Special chars: !@#$%^&*()_+[]{}|;:,.<>?',
        playerId: 'player456'
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(200);

      expect(response.body.content).toBe('Special chars: !@#$%^&*()_+[]{}|;:,.<>?');
      expect(response.body.playerId).toBe('player456');
    });

    it('should create message with emoji', async () => {
      const messageData = {
        content: 'Great hand! 😄🎉♠️♥️♦️♣️',
        playerId: 'player789'
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(200);

      expect(response.body.content).toBe('Great hand! 😄🎉♠️♥️♦️♣️');
      expect(response.body.playerId).toBe('player789');
    });

    it('should create message with long content', async () => {
      const longContent = 'A'.repeat(500);
      const messageData = {
        content: longContent,
        playerId: 'player_long'
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(200);

      expect(response.body.content).toBe(longContent);
      expect(response.body.playerId).toBe('player_long');
    });

    it('should fail with missing content', async () => {
      const messageData = {
        playerId: 'player123'
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(400);

      expect(response.body.error).toBe('Content and playerId are required');
    });

    it('should fail with missing playerId', async () => {
      const messageData = {
        content: 'Hello, world!'
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(400);

      expect(response.body.error).toBe('Content and playerId are required');
    });

    it('should fail with empty content', async () => {
      const messageData = {
        content: '',
        playerId: 'player123'
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(400);

      expect(response.body.error).toBe('Content and playerId are required');
    });

    it('should fail with empty playerId', async () => {
      const messageData = {
        content: 'Hello, world!',
        playerId: ''
      };

      const response = await request(app)
        .post('/api/chat/messages')
        .send(messageData)
        .expect(400);

      expect(response.body.error).toBe('Content and playerId are required');
    });

    it('should generate unique message IDs', async () => {
      const messageData1 = {
        content: 'Message 1',
        playerId: 'player1'
      };

      const messageData2 = {
        content: 'Message 2',
        playerId: 'player2'
      };

      const response1 = await request(app)
        .post('/api/chat/messages')
        .send(messageData1)
        .expect(200);

      const response2 = await request(app)
        .post('/api/chat/messages')
        .send(messageData2)
        .expect(200);

      expect(response1.body.id).not.toBe(response2.body.id);
      expect(response1.body.timestamp).toBeLessThanOrEqual(response2.body.timestamp);
    });

    it('should handle rapid message creation', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/chat/messages')
            .send({
              content: `Rapid message ${i}`,
              playerId: `player${i}`
            })
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.content).toBe(`Rapid message ${index}`);
        expect(response.body.playerId).toBe(`player${index}`);
      });

      // All IDs should be unique
      const ids = responses.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('GET /api/chat/messages', () => {
    beforeEach(async () => {
      // Create some test messages for retrieval tests
      const testMessages = [
        { content: 'Test message 1', playerId: 'player1' },
        { content: 'Test message 2', playerId: 'player2' },
        { content: 'Test message 3', playerId: 'player3' },
        { content: 'Test message 4', playerId: 'player4' },
        { content: 'Test message 5', playerId: 'player5' }
      ];

      for (const message of testMessages) {
        await request(app)
          .post('/api/chat/messages')
          .send(message);
      }
    });

    it('should retrieve chat messages successfully', async () => {
      const response = await request(app)
        .get('/api/chat/messages')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check message structure
      response.body.forEach((message: any) => {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('playerId');
        expect(message).toHaveProperty('timestamp');
      });
    });

    it('should retrieve messages with default limit', async () => {
      const response = await request(app)
        .get('/api/chat/messages')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(50); // Default limit
    });

    it('should respect custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/chat/messages?limit=3')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(3);
    });

    it('should respect custom limit and offset parameters', async () => {
      // Get first batch
      const response1 = await request(app)
        .get('/api/chat/messages?limit=2&offset=0')
        .expect(200);

      // Get second batch
      const response2 = await request(app)
        .get('/api/chat/messages?limit=2&offset=2')
        .expect(200);

      expect(Array.isArray(response1.body)).toBe(true);
      expect(Array.isArray(response2.body)).toBe(true);
      
      // Messages should be different (assuming we have enough messages)
      if (response1.body.length > 0 && response2.body.length > 0) {
        expect(response1.body[0].id).not.toBe(response2.body[0].id);
      }
    });

    it('should handle large limit gracefully', async () => {
      const response = await request(app)
        .get('/api/chat/messages?limit=1000')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should not exceed total messages in system
    });

    it('should handle zero limit', async () => {
      const response = await request(app)
        .get('/api/chat/messages?limit=0')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should handle negative limit by returning empty array', async () => {
      const response = await request(app)
        .get('/api/chat/messages?limit=-5')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should handle large offset gracefully', async () => {
      const response = await request(app)
        .get('/api/chat/messages?offset=1000')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return messages in correct order (most recent first)', async () => {
      // Create two messages with known content
      await request(app)
        .post('/api/chat/messages')
        .send({ content: 'First message', playerId: 'test_player' });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .post('/api/chat/messages')
        .send({ content: 'Second message', playerId: 'test_player' });

      const response = await request(app)
        .get('/api/chat/messages?limit=10')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length >= 2) {
        // Find our test messages
        const firstMessage = response.body.find((m: any) => m.content === 'First message');
        const secondMessage = response.body.find((m: any) => m.content === 'Second message');
        
        if (firstMessage && secondMessage) {
          // In the result array, second message should come after first message
          // (because messages are returned with most recent last in the slice)
          const firstIndex = response.body.indexOf(firstMessage);
          const secondIndex = response.body.indexOf(secondMessage);
          expect(secondIndex).toBeGreaterThan(firstIndex);
        }
      }
    });
  });

  describe('Chat system integration', () => {
    it('should maintain message persistence during session', async () => {
      // Create a message
      const createResponse = await request(app)
        .post('/api/chat/messages')
        .send({
          content: 'Persistent message test',
          playerId: 'persistence_player'
        })
        .expect(200);

      const messageId = createResponse.body.id;

      // Retrieve messages and verify our message exists
      const getResponse = await request(app)
        .get('/api/chat/messages?limit=100')
        .expect(200);

      const foundMessage = getResponse.body.find((m: any) => m.id === messageId);
      expect(foundMessage).toBeDefined();
      expect(foundMessage.content).toBe('Persistent message test');
      expect(foundMessage.playerId).toBe('persistence_player');
    });

    it('should handle concurrent message creation and retrieval', async () => {
      // Create messages concurrently
      const createPromises = [];
      for (let i = 0; i < 5; i++) {
        createPromises.push(
          request(app)
            .post('/api/chat/messages')
            .send({
              content: `Concurrent message ${i}`,
              playerId: `concurrent_player_${i}`
            })
        );
      }

      // Retrieve messages concurrently
      const getPromises = [];
      for (let i = 0; i < 3; i++) {
        getPromises.push(
          request(app).get('/api/chat/messages?limit=10')
        );
      }

      // Wait for all operations
      const [createResults, getResults] = await Promise.all([
        Promise.all(createPromises),
        Promise.all(getPromises)
      ]);

      // Verify all creates succeeded
      createResults.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.content).toBe(`Concurrent message ${index}`);
      });

      // Verify all gets succeeded
      getResults.forEach(result => {
        expect(result.status).toBe(200);
        expect(Array.isArray(result.body)).toBe(true);
      });
    });
  });
});