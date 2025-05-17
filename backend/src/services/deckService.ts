import { Card, Suit, Rank } from '../types/card';

export class DeckService {
  private deck: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    this.deck = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        this.deck.push({
          suit,
          rank,
          value: this.getCardValue(rank)
        });
      }
    }
  }

  private getCardValue(rank: Rank): number {
    const values: { [key in Rank]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank];
  }

  public shuffle(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  public dealCard(): Card | undefined {
    return this.deck.pop();
  }

  public dealCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.dealCard();
      if (card) {
        cards.push(card);
      }
    }
    return cards;
  }

  public reset(): void {
    this.initializeDeck();
    this.shuffle();
  }

  public getRemainingCards(): number {
    return this.deck.length;
  }
} 