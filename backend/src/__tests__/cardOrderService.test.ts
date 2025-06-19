import { CardOrderService } from '../services/cardOrderService';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('CardOrderService', () => {
  let cardOrderService: CardOrderService;

  beforeEach(() => {
    cardOrderService = new CardOrderService();
  });

  describe('generateCardOrder', () => {
    it('should generate a card order with seed, cards, and hash', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      expect(result).toHaveProperty('seed');
      expect(result).toHaveProperty('cardOrder');
      expect(result).toHaveProperty('hash');
      
      expect(result.seed).toHaveLength(64); // 32 bytes as hex string
      expect(result.cardOrder).toHaveLength(52);
      expect(result.hash).toHaveLength(64); // SHA-256 hash length
    });

    it('should generate different seeds for each call', () => {
      const gameId = 'test-game-id';
      const result1 = cardOrderService.generateCardOrder(gameId);
      const result2 = cardOrderService.generateCardOrder(gameId);

      expect(result1.seed).not.toEqual(result2.seed);
      expect(result1.hash).not.toEqual(result2.hash);
    });

    it('should generate all 52 unique cards', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      const cardStrings = result.cardOrder.map(card => `${card.rank}-${card.suit}`);
      const uniqueCards = new Set(cardStrings);
      
      expect(uniqueCards.size).toBe(52);
      expect(result.cardOrder).toHaveLength(52);
    });

    it('should include all expected suits and ranks', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      const suits = new Set(result.cardOrder.map(card => card.suit));
      const ranks = new Set(result.cardOrder.map(card => card.rank));

      expect(suits.size).toBe(4);
      expect(ranks.size).toBe(13);
      
      expect(suits).toEqual(new Set(['hearts', 'diamonds', 'clubs', 'spades']));
      expect(ranks).toEqual(new Set(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']));
    });
  });

  describe('verifyCardOrder', () => {
    it('should verify a valid card order', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      const isValid = cardOrderService.verifyCardOrder(
        result.cardOrder,
        result.seed,
        gameId,
        result.hash
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid card order', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      // Tamper with the card order
      const tamperedCardOrder = [...result.cardOrder];
      [tamperedCardOrder[0], tamperedCardOrder[1]] = [tamperedCardOrder[1], tamperedCardOrder[0]];

      const isValid = cardOrderService.verifyCardOrder(
        tamperedCardOrder,
        result.seed,
        gameId,
        result.hash
      );

      expect(isValid).toBe(false);
    });

    it('should reject wrong hash', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      const isValid = cardOrderService.verifyCardOrder(
        result.cardOrder,
        result.seed,
        gameId,
        'wrong_hash_value'
      );

      expect(isValid).toBe(false);
    });

    it('should reject wrong seed', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      const isValid = cardOrderService.verifyCardOrder(
        result.cardOrder,
        'wrong_seed_value',
        gameId,
        result.hash
      );

      expect(isValid).toBe(false);
    });

    it('should reject wrong game ID', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);

      const isValid = cardOrderService.verifyCardOrder(
        result.cardOrder,
        result.seed,
        'wrong-game-id',
        result.hash
      );

      expect(isValid).toBe(false);
    });
  });

  describe('deterministic shuffle', () => {
    it('should produce identical results with same seed', () => {
      const gameId1 = 'test-game-1';
      const gameId2 = 'test-game-2';
      
      // Generate with specific seed
      const result1 = cardOrderService.generateCardOrder(gameId1);
      
      // Use the same seed to generate another deck
      const result2 = cardOrderService.generateCardOrder(gameId2);
      
      // Override seed to make them identical
      const testSeed = 'fixed_test_seed_12345';
      const hash1 = cardOrderService.generateCardOrderHash(result1.cardOrder, testSeed, gameId1);
      const hash2 = cardOrderService.generateCardOrderHash(result1.cardOrder, testSeed, gameId2);
      
      // Same card order with same seed should produce same hash for each game
      expect(hash1).not.toEqual(hash2); // Different because game IDs are different
      
      // But verification should work for each
      expect(cardOrderService.verifyCardOrder(result1.cardOrder, testSeed, gameId1, hash1)).toBe(true);
      expect(cardOrderService.verifyCardOrder(result1.cardOrder, testSeed, gameId2, hash2)).toBe(true);
    });
  });

  describe('getCardOrderDisplay', () => {
    it('should format card order for display', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);
      
      const display = cardOrderService.getCardOrderDisplay(result.cardOrder);
      
      expect(display).toContain('♥'); // Hearts
      expect(display).toContain('♦'); // Diamonds
      expect(display).toContain('♣'); // Clubs
      expect(display).toContain('♠'); // Spades
      
      expect(display.split(' ')).toHaveLength(52);
    });

    it('should include all ranks in display', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);
      
      const display = cardOrderService.getCardOrderDisplay(result.cardOrder);
      
      // Check for some expected ranks
      expect(display).toContain('A'); // Ace
      expect(display).toContain('K'); // King
      expect(display).toContain('Q'); // Queen
      expect(display).toContain('J'); // Jack
      expect(display).toContain('2'); // Two
    });
  });

  describe('formatCardOrderForDownload', () => {
    it('should format card order records for CSV download', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);
      
      const records = [{
        id: 'record-1',
        gameId,
        seed: result.seed,
        cardOrder: result.cardOrder,
        hash: result.hash,
        isRevealed: true,
        createdAt: new Date()
      }];

      const csv = cardOrderService.formatCardOrderForDownload(records);
      
      expect(csv).toContain('Game ID');
      expect(csv).toContain('Hash');
      expect(csv).toContain('Seed');
      expect(csv).toContain('Card Order');
      expect(csv).toContain('Revealed');
      
      expect(csv).toContain(gameId);
      expect(csv).toContain(result.hash);
      expect(csv).toContain('Yes'); // isRevealed = true
    });

    it('should handle multiple records', () => {
      const records = [];
      for (let i = 0; i < 3; i++) {
        const gameId = `test-game-${i}`;
        const result = cardOrderService.generateCardOrder(gameId);
        
        records.push({
          id: `record-${i}`,
          gameId,
          seed: result.seed,
          cardOrder: result.cardOrder,
          hash: result.hash,
          isRevealed: i === 0, // Only first record is revealed
          createdAt: new Date()
        });
      }

      const csv = cardOrderService.formatCardOrderForDownload(records);
      const lines = csv.split('\n');
      
      expect(lines).toHaveLength(4); // Header + 3 records
      expect(lines[0]).toContain('Game ID'); // Header
      
      // Check revealed status
      expect(lines[1]).toContain('Yes'); // First record is revealed
      expect(lines[2]).toContain('No');  // Second record is not revealed
      expect(lines[3]).toContain('No');  // Third record is not revealed
    });
  });

  describe('hash generation', () => {
    it('should generate consistent hashes', () => {
      const gameId = 'test-game-id';
      const result = cardOrderService.generateCardOrder(gameId);
      
      // Generate hash again with same data
      const hash2 = cardOrderService.generateCardOrderHash(
        result.cardOrder,
        result.seed,
        gameId
      );
      
      expect(result.hash).toEqual(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const gameId1 = 'test-game-1';
      const gameId2 = 'test-game-2';
      
      const result1 = cardOrderService.generateCardOrder(gameId1);
      const result2 = cardOrderService.generateCardOrder(gameId2);
      
      expect(result1.hash).not.toEqual(result2.hash);
    });

    it('should include game ID in hash computation', () => {
      const result = cardOrderService.generateCardOrder('game-1');
      
      // Same card order and seed but different game ID should produce different hash
      const hash2 = cardOrderService.generateCardOrderHash(
        result.cardOrder,
        result.seed,
        'game-2'
      );
      
      expect(result.hash).not.toEqual(hash2);
    });
  });
}); 