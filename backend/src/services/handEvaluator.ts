import { Card, Hand } from '../types/shared';

export class HandEvaluator {
  public evaluateHand(holeCards: Card[], communityCards: Card[]): Hand {
    const allCards = [...holeCards, ...communityCards];
    const combinations = this.getCombinations(allCards, 5);
    const bestHand = this.findBestHand(combinations);
    return bestHand;
  }

  private getCombinations(cards: Card[], size: number): Card[][] {
    if (size === 0) return [[]];
    if (cards.length === 0) return [];

    const [first, ...rest] = cards;
    const withFirst = this.getCombinations(rest, size - 1).map(combo => [first, ...combo]);
    const withoutFirst = this.getCombinations(rest, size);

    return [...withFirst, ...withoutFirst];
  }

  private findBestHand(combinations: Card[][]): Hand {
    let bestHand: Hand = {
      name: 'High Card',
      rank: 0,
      cards: []
    };

    for (const combo of combinations) {
      const hand = this.evaluateCombination(combo);
      if (hand.rank > bestHand.rank) {
        bestHand = hand;
      }
    }

    return bestHand;
  }

  private evaluateCombination(cards: Card[]): Hand {
    const sortedCards = [...cards].sort((a, b) => this.getCardValue(b.rank) - this.getCardValue(a.rank));
    const ranks = sortedCards.map(card => card.rank);
    const suits = sortedCards.map(card => card.suit);

    if (this.isRoyalFlush(sortedCards)) {
      return { name: 'Royal Flush', rank: 10, cards: sortedCards };
    }
    if (this.isStraightFlush(sortedCards)) {
      return { name: 'Straight Flush', rank: 9, cards: sortedCards };
    }
    if (this.isFourOfAKind(ranks)) {
      return { name: 'Four of a Kind', rank: 8, cards: sortedCards };
    }
    if (this.isFullHouse(ranks)) {
      return { name: 'Full House', rank: 7, cards: sortedCards };
    }
    if (this.isFlush(suits)) {
      return { name: 'Flush', rank: 6, cards: sortedCards };
    }
    if (this.isStraight(ranks)) {
      return { name: 'Straight', rank: 5, cards: sortedCards };
    }
    if (this.isThreeOfAKind(ranks)) {
      return { name: 'Three of a Kind', rank: 4, cards: sortedCards };
    }
    if (this.isTwoPair(ranks)) {
      return { name: 'Two Pair', rank: 3, cards: sortedCards };
    }
    if (this.isPair(ranks)) {
      return { name: 'Pair', rank: 2, cards: sortedCards };
    }

    return { name: 'High Card', rank: 1, cards: sortedCards };
  }

  private getCardValue(rank: string): number {
    const values: { [key: string]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank] || 0;
  }

  private isRoyalFlush(cards: Card[]): boolean {
    return this.isStraightFlush(cards) && cards[0].rank === 'A';
  }

  private isStraightFlush(cards: Card[]): boolean {
    return this.isFlush(cards.map(c => c.suit)) && this.isStraight(cards.map(c => c.rank));
  }

  private isFourOfAKind(ranks: string[]): boolean {
    return this.getRankCounts(ranks).some(count => count === 4);
  }

  private isFullHouse(ranks: string[]): boolean {
    const counts = this.getRankCounts(ranks);
    return counts.includes(3) && counts.includes(2);
  }

  private isFlush(suits: string[]): boolean {
    return new Set(suits).size === 1;
  }

  private isStraight(ranks: string[]): boolean {
    const values = ranks.map(r => this.getCardValue(r)).sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }

  private isThreeOfAKind(ranks: string[]): boolean {
    return this.getRankCounts(ranks).some(count => count === 3);
  }

  private isTwoPair(ranks: string[]): boolean {
    const counts = this.getRankCounts(ranks);
    return counts.filter(count => count === 2).length === 2;
  }

  private isPair(ranks: string[]): boolean {
    return this.getRankCounts(ranks).some(count => count === 2);
  }

  private getRankCounts(ranks: string[]): number[] {
    const counts: { [key: string]: number } = {};
    ranks.forEach(rank => {
      counts[rank] = (counts[rank] || 0) + 1;
    });
    return Object.values(counts);
  }
} 