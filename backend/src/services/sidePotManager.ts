import { Player } from '../types/shared';

export interface SidePot {
  id: string;
  amount: number;
  eligiblePlayerIds: string[];
  winners?: string[];
  isResolved: boolean;
}

export interface PotDistribution {
  playerId: string;
  amount: number;
  potType: 'main' | 'side';
  potId: string;
}

export class SidePotManager {
  private sidePots: SidePot[] = [];
  private nextPotId = 1;

  public createSidePots(players: Player[], currentPot: number): SidePot[] {
    this.sidePots = [];
    this.nextPotId = 1;

    // Get all players with their current bets, sorted by bet amount
    const playerBets = players
      .filter(p => p.currentBet > 0 || p.isActive)
      .map(p => ({ playerId: p.id, bet: p.currentBet, isActive: p.isActive }))
      .sort((a, b) => a.bet - b.bet);

    if (playerBets.length === 0) {
      return [];
    }

    let remainingPlayers = playerBets.filter(p => p.isActive);
    let previousBetLevel = 0;

    while (remainingPlayers.length > 0) {
      // Find the next bet level
      const currentBetLevel = remainingPlayers.reduce((min, p) => 
        p.bet > previousBetLevel ? Math.min(min, p.bet) : min, 
        Infinity
      );

      if (currentBetLevel === Infinity) break;

      // Calculate pot amount for this level
      const levelContribution = currentBetLevel - previousBetLevel;
      const potAmount = levelContribution * remainingPlayers.length;

      // Create side pot
      const sidePot: SidePot = {
        id: `pot-${this.nextPotId++}`,
        amount: potAmount,
        eligiblePlayerIds: remainingPlayers.map(p => p.playerId),
        isResolved: false
      };

      this.sidePots.push(sidePot);

      // Remove players who are all-in at this level
      remainingPlayers = remainingPlayers.filter(p => p.bet > currentBetLevel);
      previousBetLevel = currentBetLevel;
    }

    return this.sidePots;
  }

  public distributePots(sidePots: SidePot[], handResults: { playerId: string; hand: any }[]): PotDistribution[] {
    const distributions: PotDistribution[] = [];

    for (const pot of sidePots) {
      if (pot.isResolved) continue;

      // Filter hand results to only eligible players for this pot
      const eligibleResults = handResults.filter(result => 
        pot.eligiblePlayerIds.includes(result.playerId)
      );

      if (eligibleResults.length === 0) continue;

      // Find the best hand(s) among eligible players
      const winners = this.findPotWinners(eligibleResults);
      const winnerCount = winners.length;
      const amountPerWinner = Math.floor(pot.amount / winnerCount);
      const remainder = pot.amount % winnerCount;

      // Distribute the pot
      winners.forEach((winner, index) => {
        const winAmount = amountPerWinner + (index < remainder ? 1 : 0);
        distributions.push({
          playerId: winner.playerId,
          amount: winAmount,
          potType: pot.id === 'pot-1' ? 'main' : 'side',
          potId: pot.id
        });
      });

      pot.winners = winners.map(w => w.playerId);
      pot.isResolved = true;
    }

    return distributions;
  }

  private findPotWinners(handResults: { playerId: string; hand: any }[]): { playerId: string; hand: any }[] {
    if (handResults.length === 0) return [];

    // Sort by hand strength (assumes hand has a comparison method)
    const sortedResults = [...handResults].sort((a, b) => {
      // This assumes the hand evaluator has a comparison method
      // We'll need to import the hand evaluator to properly compare
      if (a.hand.rank !== b.hand.rank) {
        return b.hand.rank - a.hand.rank;
      }
      
      // For more detailed comparison, we'd need the enhanced hand evaluator
      if (a.hand.detailedRank && b.hand.detailedRank) {
        return b.hand.detailedRank - a.hand.detailedRank;
      }
      
      return 0; // Tie
    });

    // Find all players with the best hand
    const bestHand = sortedResults[0].hand;
    const winners = sortedResults.filter(result => {
      if (result.hand.rank !== bestHand.rank) return false;
      
      if (result.hand.detailedRank && bestHand.detailedRank) {
        return result.hand.detailedRank === bestHand.detailedRank;
      }
      
      return true; // Default tie if no detailed ranking
    });

    return winners;
  }

  public getSidePots(): SidePot[] {
    return [...this.sidePots];
  }

  public getTotalPotAmount(): number {
    return this.sidePots.reduce((total, pot) => total + pot.amount, 0);
  }

  public reset(): void {
    this.sidePots = [];
    this.nextPotId = 1;
  }

  // Helper method to check if any players are all-in
  public hasAllInPlayers(players: Player[]): boolean {
    return players.some(p => p.isActive && p.chips === 0 && p.currentBet > 0);
  }

  // Method to handle betting round with side pots
  public handleBettingWithSidePots(players: Player[]): {
    needsSidePots: boolean;
    mainPot: number;
    sidePots: SidePot[];
  } {
    const allInPlayers = players.filter(p => p.isActive && p.chips === 0 && p.currentBet > 0);
    const needsSidePots = allInPlayers.length > 0;

    if (!needsSidePots) {
      return {
        needsSidePots: false,
        mainPot: players.reduce((sum, p) => sum + p.currentBet, 0),
        sidePots: []
      };
    }

    const totalPot = players.reduce((sum, p) => sum + p.currentBet, 0);
    const sidePots = this.createSidePots(players, totalPot);

    return {
      needsSidePots: true,
      mainPot: 0, // All money is in side pots
      sidePots
    };
  }
} 