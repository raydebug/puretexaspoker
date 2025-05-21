import { HandEvaluatorService } from '../services/handEvaluatorService';
import { Card, Suit, Value } from '../types/card';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('HandEvaluatorService', () => {
  let handEvaluator: HandEvaluatorService;

  beforeEach(() => {
    handEvaluator = new HandEvaluatorService();
  });

  describe('evaluateHand', () => {
    it('should evaluate a royal flush correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'hearts', value: 'K' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', value: 'Q' },
        { suit: 'hearts', value: 'J' },
        { suit: 'hearts', value: '10' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Royal Flush');
      expect(hand.rank).toBe(10);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a straight flush correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: '9' },
        { suit: 'hearts', value: '8' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', value: '7' },
        { suit: 'hearts', value: '6' },
        { suit: 'hearts', value: '5' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight Flush');
      expect(hand.rank).toBe(9);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a four of a kind correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'diamonds', value: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: 'A' },
        { suit: 'spades', value: 'A' },
        { suit: 'hearts', value: 'K' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Four of a Kind');
      expect(hand.rank).toBe(8);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a full house correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'diamonds', value: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: 'K' },
        { suit: 'spades', value: 'K' },
        { suit: 'hearts', value: 'K' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Full House');
      expect(hand.rank).toBe(7);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a flush correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'hearts', value: 'K' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', value: 'Q' },
        { suit: 'hearts', value: 'J' },
        { suit: 'hearts', value: '9' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Flush');
      expect(hand.rank).toBe(6);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a straight correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: '9' },
        { suit: 'diamonds', value: '8' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: '7' },
        { suit: 'spades', value: '6' },
        { suit: 'hearts', value: '5' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight');
      expect(hand.rank).toBe(5);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a three of a kind correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'diamonds', value: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: 'A' },
        { suit: 'spades', value: 'K' },
        { suit: 'hearts', value: 'Q' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Three of a Kind');
      expect(hand.rank).toBe(4);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a two pair correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'diamonds', value: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: 'K' },
        { suit: 'spades', value: 'K' },
        { suit: 'hearts', value: 'Q' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Two Pair');
      expect(hand.rank).toBe(3);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a one pair correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'diamonds', value: 'A' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: 'K' },
        { suit: 'spades', value: 'Q' },
        { suit: 'hearts', value: 'J' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('One Pair');
      expect(hand.rank).toBe(2);
      expect(hand.cards.length).toBe(5);
    });

    it('should evaluate a high card correctly', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'diamonds', value: 'K' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: 'Q' },
        { suit: 'spades', value: 'J' },
        { suit: 'hearts', value: '9' }
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
        { suit: 'hearts', value: 'A' },
        { suit: 'diamonds', value: '2' }
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', value: '3' },
        { suit: 'spades', value: '4' },
        { suit: 'hearts', value: '5' },
        { suit: 'diamonds', value: '7' },
        { suit: 'clubs', value: '8' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Straight');
      expect(hand.rank).toBe(5);
    });

    it('should handle flush with ace high', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', value: 'A' },
        { suit: 'hearts', value: 'J' }
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', value: '9' },
        { suit: 'hearts', value: '7' },
        { suit: 'hearts', value: '5' },
        { suit: 'diamonds', value: '2' },
        { suit: 'clubs', value: '3' }
      ];

      const hand = handEvaluator.evaluateHand(holeCards, communityCards);
      expect(hand.name).toBe('Flush');
      expect(hand.rank).toBe(6);
      expect(hand.cards[0].value).toBe('A');
    });
  });

  describe('hand comparison', () => {
    it('should compare hands with same rank but different kickers', () => {
      const hand1 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', value: 'A' },
          { suit: 'diamonds', value: 'K' }
        ],
        [
          { suit: 'clubs', value: 'Q' },
          { suit: 'spades', value: 'J' },
          { suit: 'hearts', value: '10' },
          { suit: 'diamonds', value: '2' },
          { suit: 'clubs', value: '3' }
        ]
      );

      const hand2 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', value: 'A' },
          { suit: 'diamonds', value: 'Q' }
        ],
        [
          { suit: 'clubs', value: 'K' },
          { suit: 'spades', value: 'J' },
          { suit: 'hearts', value: '10' },
          { suit: 'diamonds', value: '2' },
          { suit: 'clubs', value: '3' }
        ]
      );

      expect(hand1.rank).toBe(hand2.rank);
      expect(hand1.cards[0].value).toBe(hand2.cards[0].value);
      expect(handEvaluator['valueOrder'][hand1.cards[1].value]).toBeGreaterThanOrEqual(handEvaluator['valueOrder'][hand2.cards[1].value]);
    });

    it('should compare full houses correctly', () => {
      const hand1 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', value: 'A' },
          { suit: 'diamonds', value: 'A' }
        ],
        [
          { suit: 'clubs', value: 'A' },
          { suit: 'spades', value: 'K' },
          { suit: 'hearts', value: 'K' },
          { suit: 'diamonds', value: 'Q' },
          { suit: 'clubs', value: 'J' }
        ]
      );

      const hand2 = handEvaluator.evaluateHand(
        [
          { suit: 'hearts', value: 'K' },
          { suit: 'diamonds', value: 'K' }
        ],
        [
          { suit: 'clubs', value: 'K' },
          { suit: 'spades', value: 'Q' },
          { suit: 'hearts', value: 'Q' },
          { suit: 'diamonds', value: 'J' },
          { suit: 'clubs', value: '10' }
        ]
      );

      expect(hand1.rank).toBe(7); // Full House
      expect(hand2.rank).toBe(7); // Full House
      expect(handEvaluator['valueOrder'][hand1.cards[0].value]).toBeGreaterThan(handEvaluator['valueOrder'][hand2.cards[0].value]);
    });
  });
}); 