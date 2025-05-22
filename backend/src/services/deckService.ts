import { Card } from '../types/shared';

export class DeckService {
  private deck: Card[];

  constructor() {
    this.deck = this.createDeck();
  }

  private createDeck(): Card[] {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit });
      }
    }

    return deck;
  }

  public shuffle(): void {
    const deck = this.deck;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  public dealCards(count: number): Card[] {
    if (this.deck.length < count) {
      throw new Error('Not enough cards in deck');
    }

    return this.deck.splice(0, count);
  }

  public reset(deck: Card[]): void {
    const newDeck = this.createDeck();
    deck.length = 0;
    deck.push(...newDeck);
  }

  public getRemainingCards(deck: Card[]): number {
    return deck.length;
  }
} 