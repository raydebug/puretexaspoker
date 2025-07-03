import { Card } from '../types/shared';
import { createHash, randomBytes } from 'crypto';
import { DeckService } from './deckService';

export interface CardOrderRecord {
  id: string;
  gameId: string;
  seed: string;
  cardOrder: Card[];
  hash: string;
  isRevealed: boolean;
  createdAt: Date;
}

export class CardOrderService {
  private deckService: DeckService;

  constructor() {
    this.deckService = new DeckService();
  }

  /**
   * Generate a deterministic card order with hash
   * If test card order is available, use that instead
   */
  public generateCardOrder(gameId: string): {
    seed: string;
    cardOrder: Card[];
    hash: string;
  } {
    // Check if there's a test card order for this game
    const testCardOrder = this.getTestCardOrder(gameId);
    
    if (testCardOrder) {
      console.log(`🎯 Using test card order for game ${gameId}: ${testCardOrder.length} cards`);
      
      // Use test seed and hash for test mode
      const testSeed = `test-seed-${gameId}-${Date.now()}`;
      const hash = this.generateCardOrderHash(testCardOrder, testSeed, gameId);
      
      return {
        seed: testSeed,
        cardOrder: testCardOrder,
        hash
      };
    }
    
    // Generate random seed for normal operation
    const seed = randomBytes(32).toString('hex');
    
    // Create deterministic deck based on seed
    const deck: Card[] = [];
    this.deckService.reset(deck);
    
    // Use seed to create deterministic shuffle
    const shuffledDeck = this.deterministicShuffle(deck, seed);
    
    // Generate hash of the complete card order
    const hash = this.generateCardOrderHash(shuffledDeck, seed, gameId);
    
    return {
      seed,
      cardOrder: shuffledDeck,
      hash
    };
  }

  /**
   * Get test card order for a specific game (placeholder - will be imported from test routes)
   */
  private getTestCardOrder(gameId: string): Card[] | null {
    // This will be implemented by importing from test routes
    // For now, return null (no test override)
    try {
      // Dynamic import to avoid circular dependency
      const testModule = require('../routes/test');
      if (testModule && typeof testModule.getTestCardOrder === 'function') {
        return testModule.getTestCardOrder(gameId);
      }
    } catch (error) {
      // Test module not available or error importing - continue with normal operation
      console.log(`⚠️ Could not load test card order for ${gameId}: ${error}`);
    }
    
    return null;
  }

  /**
   * Create deterministic shuffle based on seed
   */
  private deterministicShuffle(deck: Card[], seed: string): Card[] {
    const shuffledDeck = [...deck];
    
    // Use seed to generate deterministic random numbers
    let seedNum = this.seedToNumber(seed);
    
    // Fisher-Yates shuffle with deterministic random
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      // Generate next deterministic "random" number
      seedNum = (seedNum * 1103515245 + 12345) & 0x7fffffff;
      const j = seedNum % (i + 1);
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    
    return shuffledDeck;
  }

  /**
   * Convert hex seed to number for deterministic random generation
   */
  private seedToNumber(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate SHA-256 hash of card order
   */
  public generateCardOrderHash(cardOrder: Card[], seed: string, gameId: string): string {
    const cardOrderString = JSON.stringify(cardOrder);
    const hashInput = `${gameId}:${seed}:${cardOrderString}`;
    return createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Verify card order against hash
   */
  public verifyCardOrder(
    cardOrder: Card[],
    seed: string,
    gameId: string,
    expectedHash: string
  ): boolean {
    const computedHash = this.generateCardOrderHash(cardOrder, seed, gameId);
    return computedHash === expectedHash;
  }

  /**
   * Get printable card order representation
   */
  public getCardOrderDisplay(cardOrder: Card[]): string {
    return cardOrder.map(card => `${card.rank}${this.getSuitSymbol(card.suit)}`).join(' ');
  }

  /**
   * Get suit symbol for display
   */
  private getSuitSymbol(suit: string): string {
    const symbols = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit as keyof typeof symbols] || suit;
  }

  /**
   * Format card order for CSV download
   */
  public formatCardOrderForDownload(records: CardOrderRecord[]): string {
    const headers = ['Game ID', 'Created At', 'Hash', 'Seed', 'Card Order', 'Revealed'];
    const rows = records.map(record => [
      record.gameId,
      record.createdAt.toISOString(),
      record.hash,
      record.seed,
      this.getCardOrderDisplay(record.cardOrder),
      record.isRevealed ? 'Yes' : 'No'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
} 