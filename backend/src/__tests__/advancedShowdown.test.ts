import { HandEvaluator, DetailedHand } from '../services/handEvaluator';
import { SidePotManager } from '../services/sidePotManager';
import { GameService } from '../services/gameService';
import { Player, Card } from '../types/shared';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('Advanced Hand Evaluation & Showdown', () => {
  let handEvaluator: HandEvaluator;
  let sidePotManager: SidePotManager;
  let gameService: GameService;

  beforeEach(() => {
    handEvaluator = new HandEvaluator();
    sidePotManager = new SidePotManager();
    gameService = new GameService('test-game-id');
  });

  describe('Enhanced Hand Evaluation', () => {
    it('should correctly evaluate and compare pairs with different kickers', () => {
      const hand1Cards: Card[] = [
        { rank: 'A', suit: 'hearts' },
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'clubs' },
        { rank: 'Q', suit: 'diamonds' },
        { rank: 'J', suit: 'hearts' }
      ];

      const hand2Cards: Card[] = [
        { rank: 'A', suit: 'diamonds' },
        { rank: 'A', suit: 'clubs' },
        { rank: 'K', suit: 'hearts' },
        { rank: 'Q', suit: 'spades' },
        { rank: '10', suit: 'hearts' }
      ];

      const hand1 = handEvaluator.evaluateHand(hand1Cards.slice(0, 2), hand1Cards.slice(2));
      const hand2 = handEvaluator.evaluateHand(hand2Cards.slice(0, 2), hand2Cards.slice(2));

      expect(hand1.name).toBe('Pair');
      expect(hand2.name).toBe('Pair');

      // Hand1 should win due to higher kicker (J vs 10)
      const comparison = handEvaluator.compareHands(hand1, hand2);
      expect(comparison).toBe(1);
    });

    it('should correctly evaluate straight flushes', () => {
      const straightFlushCards: Card[] = [
        { rank: '9', suit: 'hearts' },
        { rank: '10', suit: 'hearts' },
        { rank: 'J', suit: 'hearts' },
        { rank: 'Q', suit: 'hearts' },
        { rank: 'K', suit: 'hearts' }
      ];

      const hand = handEvaluator.evaluateHand(straightFlushCards.slice(0, 2), straightFlushCards.slice(2));
      expect(hand.name).toBe('Straight Flush');
      expect(hand.rank).toBe(9);
      expect(hand.highCards[0]).toBe(13); // King high
    });

    it('should correctly evaluate royal flush', () => {
      const royalFlushCards: Card[] = [
        { rank: '10', suit: 'spades' },
        { rank: 'J', suit: 'spades' },
        { rank: 'Q', suit: 'spades' },
        { rank: 'K', suit: 'spades' },
        { rank: 'A', suit: 'spades' }
      ];

      const hand = handEvaluator.evaluateHand(royalFlushCards.slice(0, 2), royalFlushCards.slice(2));
      expect(hand.name).toBe('Royal Flush');
      expect(hand.rank).toBe(10);
    });

    it('should correctly handle wheel straight (A-2-3-4-5)', () => {
      const wheelCards: Card[] = [
        { rank: 'A', suit: 'hearts' },
        { rank: '2', suit: 'spades' },
        { rank: '3', suit: 'clubs' },
        { rank: '4', suit: 'diamonds' },
        { rank: '5', suit: 'hearts' }
      ];

      const hand = handEvaluator.evaluateHand(wheelCards.slice(0, 2), wheelCards.slice(2));
      expect(hand.name).toBe('Straight');
      expect(hand.highCards[0]).toBe(5); // 5-high straight
    });

    it('should correctly compare full houses', () => {
      const fullHouse1Cards: Card[] = [
        { rank: 'A', suit: 'hearts' },
        { rank: 'A', suit: 'spades' },
        { rank: 'A', suit: 'clubs' },
        { rank: 'K', suit: 'diamonds' },
        { rank: 'K', suit: 'hearts' }
      ];

      const fullHouse2Cards: Card[] = [
        { rank: 'K', suit: 'hearts' },
        { rank: 'K', suit: 'spades' },
        { rank: 'K', suit: 'clubs' },
        { rank: 'A', suit: 'diamonds' },
        { rank: 'A', suit: 'hearts' }
      ];

      const hand1 = handEvaluator.evaluateHand(fullHouse1Cards.slice(0, 2), fullHouse1Cards.slice(2));
      const hand2 = handEvaluator.evaluateHand(fullHouse2Cards.slice(0, 2), fullHouse2Cards.slice(2));

      expect(hand1.name).toBe('Full House');
      expect(hand2.name).toBe('Full House');

      // Aces full should beat Kings full
      const comparison = handEvaluator.compareHands(hand1, hand2);
      expect(comparison).toBe(1);
    });

    it('should detect exact ties', () => {
      const hand1Cards: Card[] = [
        { rank: 'A', suit: 'hearts' },
        { rank: 'K', suit: 'spades' },
        { rank: 'Q', suit: 'clubs' },
        { rank: 'J', suit: 'diamonds' },
        { rank: '9', suit: 'hearts' }
      ];

      const hand2Cards: Card[] = [
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'hearts' },
        { rank: 'Q', suit: 'diamonds' },
        { rank: 'J', suit: 'clubs' },
        { rank: '9', suit: 'spades' }
      ];

      const hand1 = handEvaluator.evaluateHand(hand1Cards.slice(0, 2), hand1Cards.slice(2));
      const hand2 = handEvaluator.evaluateHand(hand2Cards.slice(0, 2), hand2Cards.slice(2));

      const comparison = handEvaluator.compareHands(hand1, hand2);
      expect(comparison).toBe(0); // Exact tie
    });
  });

  describe('Side Pot Management', () => {
    it('should create correct side pots for all-in scenarios', () => {
      const players: Player[] = [
        {
          id: 'p1',
          name: 'Player 1',
          currentBet: 100,
          isActive: true,
          chips: 0,
          seatNumber: 1,
          position: 0,
          isDealer: false,
          isAway: false,
          cards: [],
          avatar: { type: 'default', color: '#000' }
        },
        {
          id: 'p2',
          name: 'Player 2',
          currentBet: 200,
          isActive: true,
          chips: 0,
          seatNumber: 2,
          position: 1,
          isDealer: false,
          isAway: false,
          cards: [],
          avatar: { type: 'default', color: '#000' }
        },
        {
          id: 'p3',
          name: 'Player 3',
          currentBet: 300,
          isActive: true,
          chips: 100,
          seatNumber: 3,
          position: 2,
          isDealer: false,
          isAway: false,
          cards: [],
          avatar: { type: 'default', color: '#000' }
        }
      ];

      const sidePots = sidePotManager.createSidePots(players, 600);

      expect(sidePots).toHaveLength(3);
      
      // Main pot: 100 * 3 = 300
      expect(sidePots[0].amount).toBe(300);
      expect(sidePots[0].eligiblePlayerIds).toContain('p1');
      expect(sidePots[0].eligiblePlayerIds).toContain('p2');
      expect(sidePots[0].eligiblePlayerIds).toContain('p3');

      // Side pot 1: 100 * 2 = 200
      expect(sidePots[1].amount).toBe(200);
      expect(sidePots[1].eligiblePlayerIds).toContain('p2');
      expect(sidePots[1].eligiblePlayerIds).toContain('p3');
      expect(sidePots[1].eligiblePlayerIds).not.toContain('p1');

      // Side pot 2: 100 * 1 = 100
      expect(sidePots[2].amount).toBe(100);
      expect(sidePots[2].eligiblePlayerIds).toContain('p3');
      expect(sidePots[2].eligiblePlayerIds).not.toContain('p1');
      expect(sidePots[2].eligiblePlayerIds).not.toContain('p2');
    });

    it('should detect when side pots are needed', () => {
      const playersWithAllIn: Player[] = [
        {
          id: 'p1',
          name: 'Player 1',
          currentBet: 100,
          isActive: true,
          chips: 0, // All-in
          seatNumber: 1,
          position: 0,
          isDealer: false,
          isAway: false,
          cards: [],
          avatar: { type: 'default', color: '#000' }
        }
      ];

      const playersWithoutAllIn: Player[] = [
        {
          id: 'p1',
          name: 'Player 1',
          currentBet: 100,
          isActive: true,
          chips: 100, // Not all-in
          seatNumber: 1,
          position: 0,
          isDealer: false,
          isAway: false,
          cards: [],
          avatar: { type: 'default', color: '#000' }
        }
      ];

      expect(sidePotManager.hasAllInPlayers(playersWithAllIn)).toBe(true);
      expect(sidePotManager.hasAllInPlayers(playersWithoutAllIn)).toBe(false);
    });
  });

  describe('Game Service Showdown Integration', () => {
    it('should handle simple showdown with one winner', () => {
      const player1: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 1,
        isAway: false,
        cards: [],
        avatar: { type: 'default', color: '#000000' }
      };

      const player2: Player = {
        id: 'player2',
        name: 'Player 2',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 1,
        seatNumber: 2,
        isAway: false,
        cards: [],
        avatar: { type: 'default', color: '#000000' }
      };

      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.startGame();

      // Simulate a hand going to showdown
      let currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.call(currentPlayerId!); // Complete preflop

      // Complete all betting rounds to get to showdown
      for (let i = 0; i < 3; i++) {
        currentPlayerId = gameService.getGameState().currentPlayerId;
        gameService.check(currentPlayerId!);
        currentPlayerId = gameService.getGameState().currentPlayerId;
        gameService.check(currentPlayerId!);
      }

      const finalState = gameService.getGameState();
      expect(finalState.phase).toBe('finished');
      expect(finalState.isHandComplete).toBe(true);
      expect(finalState.winner).toBeDefined();
      expect(finalState.showdownResults).toBeDefined();
      expect(finalState.showdownResults).toHaveLength(2);
    });

    it('should handle split pot scenarios', () => {
      // This would require setting up specific cards to create a tie
      // For now, we'll test the structure
      const gameState = gameService.getGameState();
      gameState.pot = 100;
      gameState.players = [
        {
          id: 'p1',
          name: 'Player 1',
          chips: 500,
          isActive: true,
          currentBet: 0,
          position: 0,
          seatNumber: 1,
          isDealer: false,
          isAway: false,
          cards: [
            { rank: 'A', suit: 'hearts' },
            { rank: 'K', suit: 'spades' }
          ],
          avatar: { type: 'default', color: '#000' }
        },
        {
          id: 'p2',
          name: 'Player 2',
          chips: 500,
          isActive: true,
          currentBet: 0,
          position: 1,
          seatNumber: 2,
          isDealer: false,
          isAway: false,
          cards: [
            { rank: 'A', suit: 'clubs' },
            { rank: 'K', suit: 'diamonds' }
          ],
          avatar: { type: 'default', color: '#000' }
        }
      ];

      gameState.communityCards = [
        { rank: 'Q', suit: 'hearts' },
        { rank: 'J', suit: 'spades' },
        { rank: '10', suit: 'clubs' },
        { rank: '2', suit: 'diamonds' },
        { rank: '3', suit: 'hearts' }
      ];

      // Both players have AK high, should tie
      const handResults = gameService.evaluateHands();
      expect(handResults).toHaveLength(2);
      
      const comparison = handEvaluator.compareHands(handResults[0].hand, handResults[1].hand);
      expect(comparison).toBe(0); // Should be a tie
    });
  });
}); 