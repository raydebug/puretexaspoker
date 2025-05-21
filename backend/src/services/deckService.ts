import { Card, Suit, Value } from '../types/card';

export class DeckService {
  public createDeck(): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: Value[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }

    return deck;
  }

  public shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  public dealCards(deck: Card[], count: number): Card[] {
    if (deck.length < count) {
      throw new Error('Not enough cards in deck');
    }

    return deck.splice(0, count);
  }

  public reset(deck: Card[]): void {
    deck.length = 0;
    deck.push(...this.createDeck());
  }

  public getRemainingCards(deck: Card[]): number {
    return deck.length;
  }
} 