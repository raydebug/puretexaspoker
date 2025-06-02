import { Card, Hand, Value } from '../types/card';

export class HandEvaluatorService {
  private readonly valueOrder: { [key: string]: number } = {
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
      return { cards: twoPair, rank: 3, name: 'Two Pair' };
    }

    // Check for one pair
    const onePair = this.findOnePair(byValue);
    if (onePair) {
      return { cards: onePair, rank: 2, name: 'One Pair' };
    }

    // High card
    return { cards: sorted.slice(0, 5), rank: 1, name: 'High Card' };
  }

  private sortCards(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => this.valueOrder[b.rank] - this.valueOrder[a.rank]);
  }

  private groupByValue(cards: Card[]): { [key: string]: Card[] } {
    return cards.reduce((acc, card) => {
      acc[card.rank] = acc[card.rank] || [];
      acc[card.rank]!.push(card);
      return acc;
    }, {} as { [key: string]: Card[] });
  }

  private groupBySuit(cards: Card[]): { [key: string]: Card[] } {
    return cards.reduce((acc, card) => {
      acc[card.suit] = acc[card.suit] || [];
      acc[card.suit].push(card);
      return acc;
    }, {} as { [key: string]: Card[] });
  }

  private findRoyalFlush(bySuit: { [key: string]: Card[] }): Card[] | null {
    const flushCards = this.findFlush(bySuit);
    if (!flushCards) return null;
    
    // Check if it contains A, K, Q, J, 10
    const isRoyal = flushCards.every(card => 
      ['A', 'K', 'Q', 'J', '10'].includes(card.rank)
    );
    
    return isRoyal ? flushCards : null;
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

  private findFourOfAKind(byValue: { [key: string]: Card[] }): [string, Card] | null {
    for (const value in byValue) {
      const cards = byValue[value];
      if (cards.length === 4) {
        // Find the kicker (remaining card)
        const kicker = Object.values(byValue)
          .flat()
          .find(card => card.rank !== value);
        
        return [value, kicker as Card];
      }
    }
    
    return null;
  }

  private findFullHouse(byValue: { [key: string]: Card[] }): [Card[], Card[]] | null {
    for (const value in byValue) {
      const groupCards = byValue[value];
      if (groupCards.length === 3) {
        // Find a pair from remaining cards
        const kickers = Object.values(byValue)
          .flat()
          .filter(card => card.rank !== value)
          .slice(0, 2);
        
        if (kickers.length >= 2) {
          return [groupCards, kickers as Card[]];
        }
      }
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
    const values = [...new Set(cards.map(card => card.rank))];
    const sortedValues = values.sort((a, b) => this.valueOrder[b] - this.valueOrder[a]);

    // Check for regular straight
    for (let i = 0; i <= sortedValues.length - 5; i++) {
      const straight = sortedValues.slice(i, i + 5);
      return cards.filter(card => straight.includes(card.rank)).slice(0, 5);
    }

    // Check for wheel (A-2-3-4-5)
    const wheel = ['A', '5', '4', '3', '2'];
    if (wheel.every(value => values.includes(value))) {
      return cards.filter(card => wheel.includes(card.rank)).slice(0, 5);
    }

    return null;
  }

  private findThreeOfAKind(byValue: { [key: string]: Card[] }): [string, Card[]] | null {
    for (const value in byValue) {
      const cards = byValue[value];
      if (cards.length === 3) {
        const kickers = Object.values(byValue)
          .flat()
          .filter(card => card.rank !== value)
          .slice(0, 2);
        return [value, kickers as Card[]];
      }
    }
    return null;
  }

  private findTwoPair(byValue: { [key: string]: Card[] }): Card[] | null {
    const pairs = Object.entries(byValue)
      .filter(([, groupCards]) => groupCards.length >= 2)
      .sort(([a], [b]) => this.valueOrder[b] - this.valueOrder[a]);

    if (pairs.length >= 2) {
      const kicker = Object.values(byValue)
        .flat()
        .find(card => card.rank !== pairs[0][0] && card.rank !== pairs[1][0]);
      
      const result = [
        ...pairs[0][1].slice(0, 2),
        ...pairs[1][1].slice(0, 2)
      ];
      
      return kicker ? [...result, kicker] : result;
    }
    
    return null;
  }

  private findOnePair(byValue: { [key: string]: Card[] }): Card[] | null {
    for (const [value, groupCards] of Object.entries(byValue)) {
      if (groupCards.length >= 2) {
        const kickers = Object.values(byValue)
          .flat()
          .filter(card => card.rank !== value)
          .slice(0, 3);
        
        return [...groupCards.slice(0, 2), ...kickers];
      }
    }
    
    return null;
  }
} 