import { DeckService } from '../services/deckService';
import { Card } from '../types/shared';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('DeckService', () => {
  let deckService: DeckService;
  let deck: Card[];

  beforeEach(() => {
    deckService = new DeckService();
    deck = [];
    deckService.reset(deck);
  });

  describe('createDeck', () => {
    it('should create a deck with 52 cards', () => {
      expect(deck.length).toBe(52);
    });

    it('should create a deck with unique cards', () => {
      const cardStrings = deck.map(card => `${card.suit}-${card.rank}`);
      const uniqueCards = new Set(cardStrings);
      expect(uniqueCards.size).toBe(52);
    });

    it('should create a deck with all suits and values', () => {
      const suits = new Set(deck.map(card => card.suit));
      const ranks = new Set(deck.map(card => card.rank));
      expect(suits.size).toBe(4);
      expect(ranks.size).toBe(13);
    });
  });

  describe('shuffle', () => {
    it('should shuffle the deck', () => {
      const originalDeck = [...deck];
      deckService.shuffle();
      expect(deck).not.toEqual(originalDeck);
    });

    it('should maintain all cards after shuffling', () => {
      const originalCardStrings = deck.map(card => `${card.suit}-${card.rank}`).sort();
      deckService.shuffle();
      const shuffledCardStrings = deck.map(card => `${card.suit}-${card.rank}`).sort();
      expect(shuffledCardStrings).toEqual(originalCardStrings);
    });
  });

  describe('dealCards', () => {
    it('should deal the correct number of cards', () => {
      const dealtCards = deckService.dealCards(5);
      expect(dealtCards.length).toBe(5);
      expect(deck.length).toBe(47);
    });

    it('should throw error when trying to deal more cards than available', () => {
      expect(() => deckService.dealCards(53)).toThrow('Not enough cards in deck');
    });
  });

  describe('reset', () => {
    it('should reset the deck to 52 cards', () => {
      deckService.dealCards(5);
      deckService.reset(deck);
      expect(deck.length).toBe(52);
    });

    it('should create a new deck with all cards', () => {
      deckService.dealCards(5);
      deckService.reset(deck);
      const cardStrings = deck.map(card => `${card.suit}-${card.rank}`);
      const uniqueCards = new Set(cardStrings);
      expect(uniqueCards.size).toBe(52);
    });
  });

  describe('getRemainingCards', () => {
    it('should return correct number of remaining cards', () => {
      deckService.dealCards(5);
      expect(deckService.getRemainingCards(deck)).toBe(47);
    });

    it('should return 0 when deck is empty', () => {
      deckService.dealCards(52);
      expect(deckService.getRemainingCards(deck)).toBe(0);
    });
  });
}); 