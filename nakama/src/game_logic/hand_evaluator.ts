/// <reference path="../types/nakama.d.ts" />

interface Card {
  rank: string;
  suit: string;
}

interface DetailedHand {
  name: string;
  rank: number;
  detailedRank: number;
  highCards: number[];
  cards: Card[];
}

interface HandComparison {
  winner: 'hand1' | 'hand2' | 'tie';
  hand1: DetailedHand;
  hand2: DetailedHand;
}

export class HandEvaluator {
  private readonly valueOrder: { [key: string]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  /**
   * Evaluate the best 5-card hand from hole cards and community cards
   */
  public evaluateHand(holeCards: Card[], communityCards: Card[]): DetailedHand {
    const allCards = [...holeCards, ...communityCards];
    const combinations = this.getCombinations(allCards, 5);
    const bestHand = this.findBestHand(combinations);
    return bestHand;
  }

  /**
   * Compare two hands for showdown - returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
   */
  public compareHands(hand1: DetailedHand, hand2: DetailedHand): number {
    if (hand1.detailedRank > hand2.detailedRank) return 1;
    if (hand1.detailedRank < hand2.detailedRank) return -1;
    return 0;
  }

  /**
   * Determine winners from multiple hands
   */
  public determineWinners(hands: { playerId: string; hand: DetailedHand }[]): string[] {
    if (hands.length === 0) return [];
    if (hands.length === 1) return [hands[0].playerId];

    // Find the best hand rank
    const bestHand = hands.reduce((best, current) => 
      this.compareHands(current.hand, best.hand) > 0 ? current : best
    );

    // Find all hands that tie with the best hand
    const winners = hands.filter(h => 
      this.compareHands(h.hand, bestHand.hand) === 0
    );

    return winners.map(w => w.playerId);
  }

  /**
   * Get all possible 5-card combinations from available cards
   */
  private getCombinations(cards: Card[], size: number): Card[][] {
    if (size > cards.length) return [];
    if (size === cards.length) return [cards];
    if (size === 1) return cards.map(card => [card]);

    const combinations: Card[][] = [];

    for (let i = 0; i < cards.length - size + 1; i++) {
      const head = cards[i];
      const tailCombinations = this.getCombinations(cards.slice(i + 1), size - 1);
      
      for (const tailCombination of tailCombinations) {
        combinations.push([head, ...tailCombination]);
      }
    }

    return combinations;
  }

  /**
   * Find the best hand from all combinations
   */
  private findBestHand(combinations: Card[][]): DetailedHand {
    let bestHand = this.evaluateCombination(combinations[0]);

    for (let i = 1; i < combinations.length; i++) {
      const currentHand = this.evaluateCombination(combinations[i]);
      if (currentHand.detailedRank > bestHand.detailedRank) {
        bestHand = currentHand;
      }
    }

    return bestHand;
  }

  /**
   * Evaluate a specific 5-card combination
   */
  private evaluateCombination(cards: Card[]): DetailedHand {
    const sortedCards = [...cards].sort((a, b) => this.valueOrder[b.rank] - this.valueOrder[a.rank]);
    const values = sortedCards.map(card => this.valueOrder[card.rank]);
    const suits = sortedCards.map(card => card.suit);
    const ranks = this.getRankCounts(values);

    // Check for royal flush
    if (this.isFlush(suits) && this.isRoyalStraight(values)) {
      return { 
        name: 'Royal Flush', 
        rank: 10, 
        detailedRank: 10000000,
        highCards: [14], // Ace high
        cards: sortedCards 
      };
    }

    // Check for straight flush
    if (this.isFlush(suits) && this.isStraight(ranks)) {
      const highCard = this.getStraightHighCard(values);
      return { 
        name: 'Straight Flush', 
        rank: 9, 
        detailedRank: 9000000 + highCard,
        highCards: [highCard],
        cards: sortedCards 
      };
    }

    // Check for four of a kind
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

    // Check for full house
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

    // Check for flush
    if (this.isFlush(suits)) {
      return { 
        name: 'Flush', 
        rank: 6, 
        detailedRank: 6000000 + this.calculateHighCardValue(values),
        highCards: values,
        cards: sortedCards 
      };
    }

    // Check for straight
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

    // Check for three of a kind
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

    // Check for two pair
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

    // Check for pair
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

    // High card
    return { 
      name: 'High Card', 
      rank: 1, 
      detailedRank: 1000000 + this.calculateHighCardValue(values),
      highCards: values,
      cards: sortedCards 
    };
  }

  // Helper methods for hand detection
  private getRankCounts(values: number[]): number[] {
    const counts: { [key: number]: number } = {};
    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.values(counts).sort((a, b) => b - a);
  }

  private isFlush(suits: string[]): boolean {
    return new Set(suits).size === 1;
  }

  private isStraight(ranks: number[]): boolean {
    const uniqueRanks = [...new Set(ranks)];
    if (uniqueRanks.length !== 5) return false;
    
    uniqueRanks.sort((a, b) => a - b);
    
    // Check for regular straight
    for (let i = 1; i < uniqueRanks.length; i++) {
      if (uniqueRanks[i] !== uniqueRanks[i - 1] + 1) {
        // Check for wheel straight (A-2-3-4-5)
        return this.isWheelStraight(uniqueRanks);
      }
    }
    return true;
  }

  private isWheelStraight(ranks: number[]): boolean {
    const wheelRanks = [2, 3, 4, 5, 14];
    return JSON.stringify(ranks.sort()) === JSON.stringify(wheelRanks);
  }

  private isRoyalStraight(values: number[]): boolean {
    const royalValues = [10, 11, 12, 13, 14];
    const sortedValues = [...values].sort((a, b) => a - b);
    return JSON.stringify(sortedValues) === JSON.stringify(royalValues);
  }

  private isFourOfAKind(ranks: number[]): boolean {
    return ranks[0] === 4;
  }

  private isFullHouse(ranks: number[]): boolean {
    return ranks[0] === 3 && ranks[1] === 2;
  }

  private isThreeOfAKind(ranks: number[]): boolean {
    return ranks[0] === 3 && ranks[1] === 1;
  }

  private isTwoPair(ranks: number[]): boolean {
    return ranks[0] === 2 && ranks[1] === 2;
  }

  private isPair(ranks: number[]): boolean {
    return ranks[0] === 2 && ranks[1] === 1;
  }

  // Detail extraction methods
  private getFourOfAKindDetails(values: number[]): { quadRank: number; kicker: number } {
    const counts = this.getValueCounts(values);
    const quadRank = parseInt(Object.keys(counts).find(key => counts[parseInt(key)] === 4) || '0');
    const kicker = parseInt(Object.keys(counts).find(key => counts[parseInt(key)] === 1) || '0');
    return { quadRank, kicker };
  }

  private getFullHouseDetails(values: number[]): { tripRank: number; pairRank: number } {
    const counts = this.getValueCounts(values);
    const tripRank = parseInt(Object.keys(counts).find(key => counts[parseInt(key)] === 3) || '0');
    const pairRank = parseInt(Object.keys(counts).find(key => counts[parseInt(key)] === 2) || '0');
    return { tripRank, pairRank };
  }

  private getThreeOfAKindDetails(values: number[]): { tripRank: number; kickers: number[] } {
    const counts = this.getValueCounts(values);
    const tripRank = parseInt(Object.keys(counts).find(key => counts[parseInt(key)] === 3) || '0');
    const kickers = Object.keys(counts)
      .filter(key => counts[parseInt(key)] === 1)
      .map(key => parseInt(key))
      .sort((a, b) => b - a);
    return { tripRank, kickers };
  }

  private getTwoPairDetails(values: number[]): { highPair: number; lowPair: number; kicker: number } {
    const counts = this.getValueCounts(values);
    const pairs = Object.keys(counts)
      .filter(key => counts[parseInt(key)] === 2)
      .map(key => parseInt(key))
      .sort((a, b) => b - a);
    const kicker = parseInt(Object.keys(counts).find(key => counts[parseInt(key)] === 1) || '0');
    return { highPair: pairs[0], lowPair: pairs[1], kicker };
  }

  private getPairDetails(values: number[]): { pairRank: number; kickers: number[] } {
    const counts = this.getValueCounts(values);
    const pairRank = parseInt(Object.keys(counts).find(key => counts[parseInt(key)] === 2) || '0');
    const kickers = Object.keys(counts)
      .filter(key => counts[parseInt(key)] === 1)
      .map(key => parseInt(key))
      .sort((a, b) => b - a);
    return { pairRank, kickers };
  }

  private getStraightHighCard(values: number[]): number {
    const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
    
    // Check for wheel straight (A-2-3-4-5) where 5 is high
    if (this.isWheelStraight(uniqueValues)) {
      return 5;
    }
    
    return uniqueValues[0];
  }

  private getValueCounts(values: number[]): { [key: number]: number } {
    const counts: { [key: number]: number } = {};
    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  private calculateHighCardValue(values: number[]): number {
    return values.reduce((sum, value, index) => sum + value * Math.pow(100, 4 - index), 0);
  }
}

// Export for use in match handlers
module.exports = { HandEvaluator }; 