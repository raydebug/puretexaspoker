import { DeckService } from '../services/deckService';
import { Card, Suit, Rank } from '../types/card';

describe('DeckService', () => {
  let deckService: DeckService;

  beforeEach(() => {
    deckService = new DeckService();
  });

  describe('initialization', () => {
    it('should create a deck with 52 cards', () => {
      expect(deckService.getRemainingCards()).toBe(52);
    });

    it('should have all suits and ranks', () => {
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      
      // Deal all cards and check their distribution
      const cards: Card[] = [];
      for (let i = 0; i < 52; i++) {
        const card = deckService.dealCard();
        if (card) cards.push(card);
      }

      // Check if all suits are present
      suits.forEach(suit => {
        expect(cards.filter(card => card.suit === suit).length).toBe(13);
      });

      // Check if all ranks are present
      ranks.forEach(rank => {
        expect(cards.filter(card => card.rank === rank).length).toBe(4);
      });
    });
  });

  describe('shuffling', () => {
    it('should maintain 52 cards after shuffling', () => {
      deckService.shuffle();
      expect(deckService.getRemainingCards()).toBe(52);
    });

    it('should produce different card order after shuffling', () => {
      const firstDeal = deckService.dealCards(5);
      deckService.reset();
      deckService.shuffle();
      const secondDeal = deckService.dealCards(5);
      
      // Check if at least one card is in a different position
      let differentOrder = false;
      for (let i = 0; i < 5; i++) {
        if (firstDeal[i].suit !== secondDeal[i].suit || firstDeal[i].rank !== secondDeal[i].rank) {
          differentOrder = true;
          break;
        }
      }
      expect(differentOrder).toBe(true);
    });
  });

  describe('dealing cards', () => {
    it('should deal the correct number of cards', () => {
      const cards = deckService.dealCards(5);
      expect(cards.length).toBe(5);
      expect(deckService.getRemainingCards()).toBe(47);
    });

    it('should return undefined when deck is empty', () => {
      // Deal all cards
      for (let i = 0; i < 52; i++) {
        deckService.dealCard();
      }
      expect(deckService.dealCard()).toBeUndefined();
    });

    it('should deal cards with correct values', () => {
      const card = deckService.dealCard();
      expect(card).toBeDefined();
      if (card) {
        expect(card).toHaveProperty('suit');
        expect(card).toHaveProperty('rank');
        expect(card).toHaveProperty('value');
        expect(typeof card.value).toBe('number');
        expect(card.value).toBeGreaterThanOrEqual(2);
        expect(card.value).toBeLessThanOrEqual(14);
      }
    });
  });

  describe('reset', () => {
    it('should restore deck to 52 cards after dealing', () => {
      deckService.dealCards(10);
      deckService.reset();
      expect(deckService.getRemainingCards()).toBe(52);
    });

    it('should shuffle the deck after reset', () => {
      const firstDeal = deckService.dealCards(5);
      deckService.reset();
      const secondDeal = deckService.dealCards(5);
      
      let differentOrder = false;
      for (let i = 0; i < 5; i++) {
        if (firstDeal[i].suit !== secondDeal[i].suit || firstDeal[i].rank !== secondDeal[i].rank) {
          differentOrder = true;
          break;
        }
      }
      expect(differentOrder).toBe(true);
    });
  });
}); 