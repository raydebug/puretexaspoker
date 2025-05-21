import { Card, Hand, Value } from '../types/card';

export class HandEvaluatorService {
  private readonly valueOrder: { [key in Value]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  public evaluateHand(holeCards: Card[], communityCards: Card[]): Hand {
    const allCards = [...holeCards, ...communityCards];
    const sorted = this.sortCards(allCards);
    const byValue = this.groupByValue(sorted);
    const bySuit = this.groupBySuit(sorted);

    // Check for royal flush
    const royalFlush = this.findRoyalFlush(bySuit);
    if (royalFlush) {
      return { cards: royalFlush, rank: 10, name: 'Royal Flush' };
    }

    // Check for straight flush
    const straightFlush = this.findStraightFlush(bySuit);
    if (straightFlush) {
      return { cards: straightFlush, rank: 9, name: 'Straight Flush' };
    }

    // Check for four of a kind
    const fourOfAKind = this.findFourOfAKind(byValue);
    if (fourOfAKind) {
      const [value, kicker] = fourOfAKind;
      const cards = byValue[value];
      if (cards) {
        return { cards: [...cards, kicker], rank: 8, name: 'Four of a Kind' };
      }
    }

    // Check for full house
    const fullHouse = this.findFullHouse(byValue);
    if (fullHouse) {
      const [three, two] = fullHouse;
      return { cards: [...three, ...two], rank: 7, name: 'Full House' };
    }

    // Check for flush
    const flushCards = this.findFlush(bySuit);
    if (flushCards) {
      return { cards: flushCards, rank: 6, name: 'Flush' };
    }

    // Check for straight
    const straight = this.findStraight(sorted);
    if (straight) {
      return { cards: straight, rank: 5, name: 'Straight' };
    }

    // Check for three of a kind
    const threeOfAKind = this.findThreeOfAKind(byValue);
    if (threeOfAKind) {
      const [value, kickers] = threeOfAKind;
      const cards = byValue[value];
      if (cards) {
        return { cards: [...cards, ...kickers], rank: 4, name: 'Three of a Kind' };
      }
    }

    // Check for two pair
    const twoPair = this.findTwoPair(byValue);
    if (twoPair) {
      const [pair1, pair2, kicker] = twoPair;
      return { cards: [...pair1, ...pair2, kicker], rank: 3, name: 'Two Pair' };
    }

    // Check for one pair
    const onePair = this.findOnePair(byValue);
    if (onePair) {
      const [pair, kickers] = onePair;
      return { cards: [...pair, ...kickers], rank: 2, name: 'One Pair' };
    }

    // High card
    return { cards: sorted.slice(0, 5), rank: 1, name: 'High Card' };
  }

  private sortCards(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => this.valueOrder[b.value] - this.valueOrder[a.value]);
  }

  private groupByValue(cards: Card[]): { [key in Value]?: Card[] } {
    return cards.reduce((acc, card) => {
      acc[card.value] = acc[card.value] || [];
      acc[card.value]!.push(card);
      return acc;
    }, {} as { [key in Value]?: Card[] });
  }

  private groupBySuit(cards: Card[]): { [key: string]: Card[] } {
    return cards.reduce((acc, card) => {
      acc[card.suit] = acc[card.suit] || [];
      acc[card.suit].push(card);
      return acc;
    }, {} as { [key: string]: Card[] });
  }

  private findRoyalFlush(bySuit: { [key: string]: Card[] }): Card[] | null {
    for (const suit in bySuit) {
      const cards = bySuit[suit];
      if (cards.length >= 5) {
        const royalFlush = cards.filter(card => 
          ['A', 'K', 'Q', 'J', '10'].includes(card.value)
        );
        if (royalFlush.length === 5) {
          return royalFlush;
        }
      }
    }
    return null;
  }

  private findStraightFlush(bySuit: { [key: string]: Card[] }): Card[] | null {
    for (const suit in bySuit) {
      const cards = bySuit[suit];
      if (cards.length >= 5) {
        const straight = this.findStraight(cards);
        if (straight) {
          return straight;
        }
      }
    }
    return null;
  }

  private findFourOfAKind(byValue: { [key in Value]?: Card[] }): [Value, Card] | null {
    for (const value in byValue) {
      const cards = byValue[value as Value];
      if (cards && cards.length === 4) {
        const kicker = Object.values(byValue)
          .flat()
          .find(card => card.value !== value);
        if (kicker) {
          return [value as Value, kicker];
        }
      }
    }
    return null;
  }

  private findFullHouse(byValue: { [key in Value]?: Card[] }): [Card[], Card[]] | null {
    let three: Card[] | null = null;
    let two: Card[] | null = null;

    for (const value in byValue) {
      const cards = byValue[value as Value];
      if (cards) {
        if (cards.length === 3) {
          three = cards;
        } else if (cards.length === 2) {
          two = cards;
        }
      }
    }

    if (three && two) {
      return [three, two];
    }
    return null;
  }

  private findFlush(bySuit: { [key: string]: Card[] }): Card[] | null {
    for (const suit in bySuit) {
      const cards = bySuit[suit];
      if (cards.length >= 5) {
        return cards.slice(0, 5);
      }
    }
    return null;
  }

  private findStraight(cards: Card[]): Card[] | null {
    const values = [...new Set(cards.map(card => card.value))];
    const sortedValues = values.sort((a, b) => this.valueOrder[b] - this.valueOrder[a]);

    // Check for regular straight
    for (let i = 0; i <= sortedValues.length - 5; i++) {
      const straight = sortedValues.slice(i, i + 5);
      if (this.isConsecutive(straight)) {
        return cards.filter(card => straight.includes(card.value)).slice(0, 5);
      }
    }

    // Check for wheel (A-5)
    if (this.isWheel(sortedValues)) {
      const wheel = ['A', '5', '4', '3', '2'] as Value[];
      return cards.filter(card => wheel.includes(card.value)).slice(0, 5);
    }

    return null;
  }

  private findThreeOfAKind(byValue: { [key in Value]?: Card[] }): [Value, Card[]] | null {
    for (const value in byValue) {
      const cards = byValue[value as Value];
      if (cards && cards.length === 3) {
        const kickers = Object.values(byValue)
          .flat()
          .filter(card => card.value !== value)
          .slice(0, 2);
        return [value as Value, kickers];
      }
    }
    return null;
  }

  private findTwoPair(byValue: { [key in Value]?: Card[] }): [Card[], Card[], Card] | null {
    const pairs = Object.entries(byValue)
      .filter(([_, cards]) => cards && cards.length === 2)
      .sort(([a], [b]) => this.valueOrder[b as Value] - this.valueOrder[a as Value]);

    if (pairs.length >= 2) {
      const kicker = Object.values(byValue)
        .flat()
        .find(card => card.value !== pairs[0][0] && card.value !== pairs[1][0]);
      if (kicker) {
        return [pairs[0][1]!, pairs[1][1]!, kicker];
      }
    }
    return null;
  }

  private findOnePair(byValue: { [key in Value]?: Card[] }): [Card[], Card[]] | null {
    for (const value in byValue) {
      const cards = byValue[value as Value];
      if (cards && cards.length === 2) {
        const kickers = Object.values(byValue)
          .flat()
          .filter(card => card.value !== value)
          .slice(0, 3);
        return [cards, kickers];
      }
    }
    return null;
  }

  private isConsecutive(values: Value[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (this.valueOrder[values[i - 1]] - this.valueOrder[values[i]] !== 1) {
        return false;
      }
    }
    return true;
  }

  private isWheel(values: Value[]): boolean {
    const wheel = ['A', '5', '4', '3', '2'] as Value[];
    return wheel.every(value => values.includes(value));
  }
} 