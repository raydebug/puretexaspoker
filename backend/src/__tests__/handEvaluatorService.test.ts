import { HandEvaluatorService } from '../services/handEvaluatorService';
import { Card } from '../types/card';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('HandEvaluatorService', () => {
  let handEvaluator: HandEvaluatorService;

  beforeEach(() => {
    handEvaluator = new HandEvaluatorService();
  });

  describe('hand evaluation', () => {
    it('should identify royal flush', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'hearts', rank: 'K', value: 13 }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: 'Q', value: 12 },
        { suit: 'hearts', rank: 'J', value: 11 },
        { suit: 'hearts', rank: '10', value: 10 },
        { suit: 'clubs', rank: '2', value: 2 },
        { suit: 'diamonds', rank: '3', value: 3 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Royal Flush');
      expect(hand.rank).toBe(10);
    });

    it('should identify straight flush', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: '9', value: 9 },
        { suit: 'hearts', rank: '8', value: 8 }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: '7', value: 7 },
        { suit: 'hearts', rank: '6', value: 6 },
        { suit: 'hearts', rank: '5', value: 5 },
        { suit: 'clubs', rank: '2', value: 2 },
        { suit: 'diamonds', rank: '3', value: 3 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight Flush');
      expect(hand.rank).toBe(9);
    });

    it('should identify four of a kind', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: 'A', value: 14 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'A', value: 14 },
        { suit: 'spades', rank: 'A', value: 14 },
        { suit: 'hearts', rank: 'K', value: 13 },
        { suit: 'diamonds', rank: 'Q', value: 12 },
        { suit: 'clubs', rank: 'J', value: 11 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Four of a Kind');
      expect(hand.rank).toBe(8);
    });

    it('should identify full house', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: 'A', value: 14 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'A', value: 14 },
        { suit: 'spades', rank: 'K', value: 13 },
        { suit: 'hearts', rank: 'K', value: 13 },
        { suit: 'diamonds', rank: 'Q', value: 12 },
        { suit: 'clubs', rank: 'J', value: 11 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Full House');
      expect(hand.rank).toBe(7);
    });

    it('should identify flush', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'hearts', rank: 'J', value: 11 }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: '9', value: 9 },
        { suit: 'hearts', rank: '7', value: 7 },
        { suit: 'hearts', rank: '5', value: 5 },
        { suit: 'diamonds', rank: '2', value: 2 },
        { suit: 'clubs', rank: '3', value: 3 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Flush');
      expect(hand.rank).toBe(6);
    });

    it('should identify straight', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: '9', value: 9 },
        { suit: 'diamonds', rank: '8', value: 8 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '7', value: 7 },
        { suit: 'spades', rank: '6', value: 6 },
        { suit: 'hearts', rank: '5', value: 5 },
        { suit: 'diamonds', rank: '2', value: 2 },
        { suit: 'clubs', rank: '3', value: 3 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight');
      expect(hand.rank).toBe(5);
    });

    it('should identify three of a kind', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: 'A', value: 14 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'A', value: 14 },
        { suit: 'spades', rank: 'K', value: 13 },
        { suit: 'hearts', rank: 'Q', value: 12 },
        { suit: 'diamonds', rank: 'J', value: 11 },
        { suit: 'clubs', rank: '10', value: 10 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Three of a Kind');
      expect(hand.rank).toBe(4);
    });

    it('should identify two pair', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: 'A', value: 14 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'K', value: 13 },
        { suit: 'spades', rank: 'K', value: 13 },
        { suit: 'hearts', rank: 'Q', value: 12 },
        { suit: 'diamonds', rank: 'J', value: 11 },
        { suit: 'clubs', rank: '10', value: 10 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Two Pair');
      expect(hand.rank).toBe(3);
    });

    it('should identify pair', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: 'A', value: 14 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'K', value: 13 },
        { suit: 'spades', rank: 'Q', value: 12 },
        { suit: 'hearts', rank: 'J', value: 11 },
        { suit: 'diamonds', rank: '10', value: 10 },
        { suit: 'clubs', rank: '9', value: 9 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Pair');
      expect(hand.rank).toBe(2);
    });

    it('should identify high card', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: 'K', value: 13 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'Q', value: 12 },
        { suit: 'spades', rank: 'J', value: 11 },
        { suit: 'hearts', rank: '9', value: 9 },
        { suit: 'diamonds', rank: '7', value: 7 },
        { suit: 'clubs', rank: '5', value: 5 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('High Card');
      expect(hand.rank).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle ace-low straight', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: '2', value: 2 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '3', value: 3 },
        { suit: 'spades', rank: '4', value: 4 },
        { suit: 'hearts', rank: '5', value: 5 },
        { suit: 'diamonds', rank: '7', value: 7 },
        { suit: 'clubs', rank: '8', value: 8 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight');
      expect(hand.rank).toBe(5);
    });

    it('should handle wheel straight (A-5)', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'diamonds', rank: '2', value: 2 }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '3', value: 3 },
        { suit: 'spades', rank: '4', value: 4 },
        { suit: 'hearts', rank: '5', value: 5 },
        { suit: 'diamonds', rank: '7', value: 7 },
        { suit: 'clubs', rank: '8', value: 8 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight');
      expect(hand.rank).toBe(5);
    });

    it('should handle flush with ace high', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A', value: 14 },
        { suit: 'hearts', rank: 'J', value: 11 }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: '9', value: 9 },
        { suit: 'hearts', rank: '7', value: 7 },
        { suit: 'hearts', rank: '5', value: 5 },
        { suit: 'diamonds', rank: '2', value: 2 },
        { suit: 'clubs', rank: '3', value: 3 }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Flush');
      expect(hand.rank).toBe(6);
      expect(hand.cards[0].rank).toBe('A');
    });
  });

  describe('hand comparison', () => {
    it('should compare hands with same rank but different kickers', () => {
      const hand1 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', rank: 'A', value: 14 },
          { suit: 'diamonds', rank: 'K', value: 13 }
        ],
        [
          { suit: 'clubs', rank: 'Q', value: 12 },
          { suit: 'spades', rank: 'J', value: 11 },
          { suit: 'hearts', rank: '10', value: 10 },
          { suit: 'diamonds', rank: '2', value: 2 },
          { suit: 'clubs', rank: '3', value: 3 }
        ]
      );

      const hand2 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', rank: 'A', value: 14 },
          { suit: 'diamonds', rank: 'Q', value: 12 }
        ],
        [
          { suit: 'clubs', rank: 'K', value: 13 },
          { suit: 'spades', rank: 'J', value: 11 },
          { suit: 'hearts', rank: '10', value: 10 },
          { suit: 'diamonds', rank: '2', value: 2 },
          { suit: 'clubs', rank: '3', value: 3 }
        ]
      );

      expect(hand1.rank).toBe(hand2.rank); // Both are high card
      expect(hand1.cards[0].value).toBe(hand2.cards[0].value); // Both have Ace high
      expect(hand1.cards[1].value).toBeGreaterThan(hand2.cards[1].value); // First hand has King kicker
    });

    it('should compare full houses correctly', () => {
      const hand1 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', rank: 'A', value: 14 },
          { suit: 'diamonds', rank: 'A', value: 14 }
        ],
        [
          { suit: 'clubs', rank: 'A', value: 14 },
          { suit: 'spades', rank: 'K', value: 13 },
          { suit: 'hearts', rank: 'K', value: 13 },
          { suit: 'diamonds', rank: 'Q', value: 12 },
          { suit: 'clubs', rank: 'J', value: 11 }
        ]
      );

      const hand2 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', rank: 'K', value: 13 },
          { suit: 'diamonds', rank: 'K', value: 13 }
        ],
        [
          { suit: 'clubs', rank: 'K', value: 13 },
          { suit: 'spades', rank: 'A', value: 14 },
          { suit: 'hearts', rank: 'A', value: 14 },
          { suit: 'diamonds', rank: 'Q', value: 12 },
          { suit: 'clubs', rank: 'J', value: 11 }
        ]
      );

      expect(hand1.rank).toBe(hand2.rank); // Both are full house
      expect(hand1.cards[0].value).toBeGreaterThan(hand2.cards[0].value); // First hand has higher three of a kind
    });
  });
}); 