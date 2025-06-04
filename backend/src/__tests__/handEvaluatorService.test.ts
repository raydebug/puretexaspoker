import { HandEvaluatorService } from '../services/handEvaluatorService';
import { Card } from '../types/card';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('HandEvaluatorService', () => {
  let handEvaluator: HandEvaluatorService;

  beforeEach(() => {
    handEvaluator = new HandEvaluatorService();
  });

  describe('evaluateHand', () => {
    it('should evaluate a royal flush correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'K' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: '10' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Royal Flush');
      expect(hand.rank).toBe(10);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a straight flush correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: '9' },
        { suit: 'hearts', rank: '8' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: '7' },
        { suit: 'hearts', rank: '6' },
        { suit: 'hearts', rank: '5' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight Flush');
      expect(hand.rank).toBe(9);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a four of a kind correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'hearts', rank: 'K' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Four of a Kind');
      expect(hand.rank).toBe(8);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a full house correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'K' },
        { suit: 'spades', rank: 'K' },
        { suit: 'hearts', rank: 'K' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Full House');
      expect(hand.rank).toBe(7);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a flush correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'K' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: '9' },
        { suit: 'hearts', rank: '7' },
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Flush');
      expect(hand.rank).toBe(6);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a straight correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: '9' },
        { suit: 'diamonds', rank: '8' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '7' },
        { suit: 'spades', rank: '6' },
        { suit: 'hearts', rank: '5' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight');
      expect(hand.rank).toBe(5);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a three of a kind correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'clubs', rank: '9' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Three of a Kind');
      expect(hand.rank).toBe(4);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a two pair correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'K' },
        { suit: 'spades', rank: 'K' },
        { suit: 'hearts', rank: 'Q' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Two Pair');
      expect(hand.rank).toBe(3);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a one pair correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'K' },
        { suit: 'spades', rank: 'Q' },
        { suit: 'hearts', rank: 'J' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('One Pair');
      expect(hand.rank).toBe(2);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a high card correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'K' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '9' },
        { suit: 'spades', rank: '7' },
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '3' },
        { suit: 'clubs', rank: '2' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('High Card');
      expect(hand.rank).toBe(1);
      expect(hand.cards.length).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle wheel straight (A-5)', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: '2' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '3' },
        { suit: 'spades', rank: '4' },
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '7' },
        { suit: 'clubs', rank: '8' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight');
      expect(hand.rank).toBe(5);
    });

    it('should handle flush with ace high', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'J' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: '9' },
        { suit: 'hearts', rank: '7' },
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' }
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
          { suit: 'hearts', rank: 'A' },
          { suit: 'diamonds', rank: 'K' }
        ],
        [
          { suit: 'clubs', rank: 'Q' },
          { suit: 'spades', rank: 'J' },
          { suit: 'hearts', rank: '10' },
          { suit: 'diamonds', rank: '2' },
          { suit: 'clubs', rank: '3' }
        ]
      );

      const hand2 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', rank: 'A' },
          { suit: 'diamonds', rank: 'Q' }
        ],
        [
          { suit: 'clubs', rank: 'K' },
          { suit: 'spades', rank: 'J' },
          { suit: 'hearts', rank: '10' },
          { suit: 'diamonds', rank: '2' },
          { suit: 'clubs', rank: '3' }
        ]
      );

      expect(hand1.rank).toBe(hand2.rank);
      expect(hand1.cards[0].rank).toBe(hand2.cards[0].rank);
      expect(handEvaluator['valueOrder'][hand1.cards[1].rank]).toBeGreaterThanOrEqual(handEvaluator['valueOrder'][hand2.cards[1].rank]);
    });

    it('should compare full houses correctly', () => {
      const hand1 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', rank: 'A' },
          { suit: 'diamonds', rank: 'A' }
        ],
        [
          { suit: 'clubs', rank: 'A' },
          { suit: 'spades', rank: 'K' },
          { suit: 'hearts', rank: 'K' },
          { suit: 'diamonds', rank: 'Q' },
          { suit: 'clubs', rank: 'J' }
        ]
      );

      const hand2 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', rank: 'K' },
          { suit: 'diamonds', rank: 'K' }
        ],
        [
          { suit: 'clubs', rank: 'K' },
          { suit: 'spades', rank: 'Q' },
          { suit: 'hearts', rank: 'Q' },
          { suit: 'diamonds', rank: 'J' },
          { suit: 'clubs', rank: '10' }
        ]
      );

      expect(hand1.rank).toBe(7); // Full House
      expect(hand2.rank).toBe(7); // Full House
      expect(handEvaluator['valueOrder'][hand1.cards[0].rank]).toBeGreaterThan(handEvaluator['valueOrder'][hand2.cards[0].rank]);
    });
  });
}); 