import { Card, Hand } from '../types/card';

export class HandEvaluatorService {
  public evaluateHand(holeCards: Card[], communityCards: Card[]): Hand {
    const allCards = [...holeCards, ...communityCards];
    const possibleHands = this.getAllPossibleHands(allCards);
    const bestHand = this.findBestHand(possibleHands);
    return bestHand;
  }

  private getAllPossibleHands(cards: Card[]): Hand[] {
    const hands: Hand[] = [];
    const combinations = this.getCombinations(cards, 5);
    
    for (const combination of combinations) {
      const hand = this.evaluateCombination(combination);
      hands.push(hand);
    }
    
    return hands;
  }

  private getCombinations(cards: Card[], size: number): Card[][] {
    const combinations: Card[][] = [];
    
    const combine = (current: Card[], start: number) => {
      if (current.length === size) {
        combinations.push([...current]);
        return;
      }
      
      for (let i = start; i < cards.length; i++) {
        current.push(cards[i]);
        combine(current, i + 1);
        current.pop();
      }
    };
    
    combine([], 0);
    return combinations;
  }

  private evaluateCombination(cards: Card[]): Hand {
    // Sort cards by value in descending order
    const sortedCards = [...cards].sort((a, b) => b.value - a.value);
    
    // Check for each hand type from highest to lowest
    if (this.isRoyalFlush(sortedCards)) {
      return { cards: sortedCards, rank: 10, name: 'Royal Flush' };
    }
    if (this.isStraightFlush(sortedCards)) {
      return { cards: sortedCards, rank: 9, name: 'Straight Flush' };
    }
    if (this.isFourOfAKind(sortedCards)) {
      return { cards: sortedCards, rank: 8, name: 'Four of a Kind' };
    }
    if (this.isFullHouse(sortedCards)) {
      return { cards: sortedCards, rank: 7, name: 'Full House' };
    }
    if (this.isFlush(sortedCards)) {
      return { cards: sortedCards, rank: 6, name: 'Flush' };
    }
    if (this.isStraight(sortedCards)) {
      return { cards: sortedCards, rank: 5, name: 'Straight' };
    }
    if (this.isThreeOfAKind(sortedCards)) {
      return { cards: sortedCards, rank: 4, name: 'Three of a Kind' };
    }
    if (this.isTwoPair(sortedCards)) {
      return { cards: sortedCards, rank: 3, name: 'Two Pair' };
    }
    if (this.isPair(sortedCards)) {
      return { cards: sortedCards, rank: 2, name: 'Pair' };
    }
    
    return { cards: sortedCards, rank: 1, name: 'High Card' };
  }

  private isRoyalFlush(cards: Card[]): boolean {
    return this.isStraightFlush(cards) && cards[0].value === 14;
  }

  private isStraightFlush(cards: Card[]): boolean {
    return this.isFlush(cards) && this.isStraight(cards);
  }

  private isFourOfAKind(cards: Card[]): boolean {
    const groups = this.groupByValue(cards);
    return Object.values(groups).some(group => group.length === 4);
  }

  private isFullHouse(cards: Card[]): boolean {
    const groups = this.groupByValue(cards);
    const values = Object.values(groups);
    return values.some(group => group.length === 3) && values.some(group => group.length === 2);
  }

  private isFlush(cards: Card[]): boolean {
    return cards.every(card => card.suit === cards[0].suit);
  }

  private isStraight(cards: Card[]): boolean {
    for (let i = 0; i < cards.length - 1; i++) {
      if (cards[i].value !== cards[i + 1].value + 1) {
        return false;
      }
    }
    return true;
  }

  private isThreeOfAKind(cards: Card[]): boolean {
    const groups = this.groupByValue(cards);
    return Object.values(groups).some(group => group.length === 3);
  }

  private isTwoPair(cards: Card[]): boolean {
    const groups = this.groupByValue(cards);
    const pairs = Object.values(groups).filter(group => group.length === 2);
    return pairs.length === 2;
  }

  private isPair(cards: Card[]): boolean {
    const groups = this.groupByValue(cards);
    return Object.values(groups).some(group => group.length === 2);
  }

  private groupByValue(cards: Card[]): { [key: number]: Card[] } {
    return cards.reduce((groups, card) => {
      if (!groups[card.value]) {
        groups[card.value] = [];
      }
      groups[card.value].push(card);
      return groups;
    }, {} as { [key: number]: Card[] });
  }

  private findBestHand(hands: Hand[]): Hand {
    return hands.reduce((best, current) => {
      if (current.rank > best.rank) {
        return current;
      }
      if (current.rank === best.rank) {
        // Compare high cards if ranks are equal
        for (let i = 0; i < current.cards.length; i++) {
          if (current.cards[i].value > best.cards[i].value) {
            return current;
          }
          if (current.cards[i].value < best.cards[i].value) {
            return best;
          }
        }
      }
      return best;
    });
  }
} 