import { Card, Hand } from '../types/shared';

export interface DetailedHand extends Hand {
  highCards: number[];  // Kickers in descending order
  detailedRank: number; // More precise ranking for comparison
}

export class HandEvaluator {
  public evaluateHand(holeCards: Card[], communityCards: Card[]): DetailedHand {
    const allCards = [...holeCards, ...communityCards];
    const combinations = this.getCombinations(allCards, 5);
    const bestHand = this.findBestHand(combinations);
    return bestHand;
  }

  // Compare two hands for showdown - returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
  public compareHands(hand1: DetailedHand, hand2: DetailedHand): number {
    // First compare by hand rank (straight flush vs flush, etc.)
    if (hand1.rank !== hand2.rank) {
      return hand1.rank > hand2.rank ? 1 : -1;
    }

    // Same hand type, compare by detailed rank and kickers
    if (hand1.detailedRank !== hand2.detailedRank) {
      return hand1.detailedRank > hand2.detailedRank ? 1 : -1;
    }

    // Compare kickers
    for (let i = 0; i < Math.max(hand1.highCards.length, hand2.highCards.length); i++) {
      const kicker1 = hand1.highCards[i] || 0;
      const kicker2 = hand2.highCards[i] || 0;
      
      if (kicker1 !== kicker2) {
        return kicker1 > kicker2 ? 1 : -1;
      }
    }

    return 0; // Exact tie
  }

  private getCombinations(cards: Card[], size: number): Card[][] {
    if (size === 0) return [[]];
    if (cards.length === 0) return [];

    const [first, ...rest] = cards;
    const withFirst = this.getCombinations(rest, size - 1).map(combo => [first, ...combo]);
    const withoutFirst = this.getCombinations(rest, size);

    return [...withFirst, ...withoutFirst];
  }

  private findBestHand(combinations: Card[][]): DetailedHand {
    let bestHand: DetailedHand = {
      name: 'High Card',
      rank: 0,
      detailedRank: 0,
      highCards: [],
      cards: []
    };

    for (const combo of combinations) {
      const hand = this.evaluateCombination(combo);
      if (this.compareHands(hand, bestHand) > 0) {
        bestHand = hand;
      }
    }

    return bestHand;
  }

  private evaluateCombination(cards: Card[]): DetailedHand {
    const sortedCards = [...cards].sort((a, b) => this.getCardValue(b.rank) - this.getCardValue(a.rank));
    const ranks = sortedCards.map(card => card.rank);
    const suits = sortedCards.map(card => card.suit);
    const values = sortedCards.map(card => this.getCardValue(card.rank));

    // Check for each hand type with detailed evaluation
    if (this.isRoyalFlush(sortedCards)) {
      return { 
        name: 'Royal Flush', 
        rank: 10, 
        detailedRank: 10000000, // Royal flush always beats other royal flushes
        highCards: [14], // Ace high
        cards: sortedCards 
      };
    }

    if (this.isStraightFlush(sortedCards)) {
      const highCard = this.getStraightHighCard(values);
      return { 
        name: 'Straight Flush', 
        rank: 9, 
        detailedRank: 9000000 + highCard,
        highCards: [highCard],
        cards: sortedCards 
      };
    }

    if (this.isFourOfAKind(ranks)) {
      const { quadRank, kicker } = this.getFourOfAKindDetails(values);
      return { 
        name: 'Four of a Kind', 
        rank: 8, 
        detailedRank: 8000000 + quadRank * 100 + kicker,
        highCards: [quadRank, kicker],
        cards: sortedCards 
      };
    }

    if (this.isFullHouse(ranks)) {
      const { tripRank, pairRank } = this.getFullHouseDetails(values);
      return { 
        name: 'Full House', 
        rank: 7, 
        detailedRank: 7000000 + tripRank * 100 + pairRank,
        highCards: [tripRank, pairRank],
        cards: sortedCards 
      };
    }

    if (this.isFlush(suits)) {
      return { 
        name: 'Flush', 
        rank: 6, 
        detailedRank: 6000000 + this.calculateHighCardValue(values),
        highCards: values,
        cards: sortedCards 
      };
    }

    if (this.isStraight(ranks)) {
      const highCard = this.getStraightHighCard(values);
      return { 
        name: 'Straight', 
        rank: 5, 
        detailedRank: 5000000 + highCard,
        highCards: [highCard],
        cards: sortedCards 
      };
    }

    if (this.isThreeOfAKind(ranks)) {
      const { tripRank, kickers } = this.getThreeOfAKindDetails(values);
      return { 
        name: 'Three of a Kind', 
        rank: 4, 
        detailedRank: 4000000 + tripRank * 10000 + this.calculateHighCardValue(kickers),
        highCards: [tripRank, ...kickers],
        cards: sortedCards 
      };
    }

    if (this.isTwoPair(ranks)) {
      const { highPair, lowPair, kicker } = this.getTwoPairDetails(values);
      return { 
        name: 'Two Pair', 
        rank: 3, 
        detailedRank: 3000000 + highPair * 10000 + lowPair * 100 + kicker,
        highCards: [highPair, lowPair, kicker],
        cards: sortedCards 
      };
    }

    if (this.isPair(ranks)) {
      const { pairRank, kickers } = this.getPairDetails(values);
      return { 
        name: 'Pair', 
        rank: 2, 
        detailedRank: 2000000 + pairRank * 1000000 + this.calculateHighCardValue(kickers),
        highCards: [pairRank, ...kickers],
        cards: sortedCards 
      };
    }

    return { 
      name: 'High Card', 
      rank: 1, 
      detailedRank: 1000000 + this.calculateHighCardValue(values),
      highCards: values,
      cards: sortedCards 
    };
  }

  // Detailed analysis methods
  private getFourOfAKindDetails(values: number[]): { quadRank: number; kicker: number } {
    const counts = this.getValueCounts(values);
    const quadRank = Object.keys(counts).find(rank => counts[parseInt(rank)] === 4);
    const kicker = Object.keys(counts).find(rank => counts[parseInt(rank)] === 1);
    
    return {
      quadRank: parseInt(quadRank!),
      kicker: parseInt(kicker!)
    };
  }

  private getFullHouseDetails(values: number[]): { tripRank: number; pairRank: number } {
    const counts = this.getValueCounts(values);
    const tripRank = Object.keys(counts).find(rank => counts[parseInt(rank)] === 3);
    const pairRank = Object.keys(counts).find(rank => counts[parseInt(rank)] === 2);
    
    return {
      tripRank: parseInt(tripRank!),
      pairRank: parseInt(pairRank!)
    };
  }

  private getThreeOfAKindDetails(values: number[]): { tripRank: number; kickers: number[] } {
    const counts = this.getValueCounts(values);
    const tripRank = parseInt(Object.keys(counts).find(rank => counts[parseInt(rank)] === 3)!);
    const kickers = Object.keys(counts)
      .filter(rank => counts[parseInt(rank)] === 1)
      .map(rank => parseInt(rank))
      .sort((a, b) => b - a);
    
    return { tripRank, kickers };
  }

  private getTwoPairDetails(values: number[]): { highPair: number; lowPair: number; kicker: number } {
    const counts = this.getValueCounts(values);
    const pairs = Object.keys(counts)
      .filter(rank => counts[parseInt(rank)] === 2)
      .map(rank => parseInt(rank))
      .sort((a, b) => b - a);
    const kicker = parseInt(Object.keys(counts).find(rank => counts[parseInt(rank)] === 1)!);
    
    return {
      highPair: pairs[0],
      lowPair: pairs[1],
      kicker
    };
  }

  private getPairDetails(values: number[]): { pairRank: number; kickers: number[] } {
    const counts = this.getValueCounts(values);
    const pairRank = parseInt(Object.keys(counts).find(rank => counts[parseInt(rank)] === 2)!);
    const kickers = Object.keys(counts)
      .filter(rank => counts[parseInt(rank)] === 1)
      .map(rank => parseInt(rank))
      .sort((a, b) => b - a);
    
    return { pairRank, kickers };
  }

  private getStraightHighCard(values: number[]): number {
    const sortedValues = [...values].sort((a, b) => b - a);
    // Handle A-2-3-4-5 straight (wheel)
    if (sortedValues[0] === 14 && sortedValues[1] === 5) {
      return 5; // 5-high straight
    }
    return sortedValues[0];
  }

  private calculateHighCardValue(values: number[]): number {
    // Create a weighted sum for comparing high cards
    return values.reduce((sum, value, index) => sum + value * Math.pow(100, 4 - index), 0);
  }

  private getValueCounts(values: number[]): { [key: number]: number } {
    const counts: { [key: number]: number } = {};
    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
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
    
    // Check for regular straight
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        // Check for A-2-3-4-5 straight (wheel)
        if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
          return true;
        }
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