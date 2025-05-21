import { DeckService } from '../services/deckService';
import { Card, Suit, Value } from '../types/card';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('DeckService', () => {
  let deckService: DeckService;
  let deck: Card[];

  beforeEach(() => {
    deckService = new DeckService();
    deck = deckService.createDeck();
  });

  describe('createDeck', () => {
    it('should create a deck with 52 cards', () => {
      expect(deck.length).toBe(52);
    });

    it('should create a deck with unique cards', () => {
      const cardStrings = deck.map(card => `${card.suit}-${card.value}`);
      const uniqueCards = new Set(cardStrings);
      expect(uniqueCards.size).toBe(52);
    });

    it('should create a deck with all suits and values', () => {
      const suits = new Set(deck.map(card => card.suit));
      const values = new Set(deck.map(card => card.value));
      expect(suits.size).toBe(4);
      expect(values.size).toBe(13);
    });
  });

  describe('shuffleDeck', () => {
    it('should shuffle the deck', () => {
      const originalDeck = [...deck];
      deckService.shuffleDeck(deck);
      expect(deck).not.toEqual(originalDeck);
    });

    it('should maintain all cards after shuffling', () => {
      const originalCardStrings = deck.map(card => `${card.suit}-${card.value}`).sort();
      deckService.shuffleDeck(deck);
      const shuffledCardStrings = deck.map(card => `${card.suit}-${card.value}`).sort();
      expect(shuffledCardStrings).toEqual(originalCardStrings);
    });
  });

  describe('dealCards', () => {
    it('should deal the correct number of cards', () => {
      const dealtCards = deckService.dealCards(deck, 5);
      expect(dealtCards.length).toBe(5);
      expect(deck.length).toBe(47);
    });

    it('should throw error when trying to deal more cards than available', () => {
      expect(() => deckService.dealCards(deck, 53)).toThrow('Not enough cards in deck');
    });
  });

  describe('reset', () => {
    it('should reset the deck to 52 cards', () => {
      deckService.dealCards(deck, 5);
      deckService.reset(deck);
      expect(deck.length).toBe(52);
    });

    it('should create a new deck with all cards', () => {
      deckService.dealCards(deck, 5);
      deckService.reset(deck);
      const cardStrings = deck.map(card => `${card.suit}-${card.value}`);
      const uniqueCards = new Set(cardStrings);
      expect(uniqueCards.size).toBe(52);
    });
  });

  describe('getRemainingCards', () => {
    it('should return correct number of remaining cards', () => {
      deckService.dealCards(deck, 5);
      expect(deckService.getRemainingCards(deck)).toBe(47);
    });

    it('should return 0 when deck is empty', () => {
      deckService.dealCards(deck, 52);
      expect(deckService.getRemainingCards(deck)).toBe(0);
    });
  });
}); 