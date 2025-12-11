/// <reference path="../types/nakama.d.ts" />

interface SidePot {
  amount: number;
  eligiblePlayers: string[];
  maxContribution: number;
}

interface PotDistribution {
  playerId: string;
  amount: number;
  potIndex: number;
  description: string;
}

interface PlayerContribution {
  playerId: string;
  totalContribution: number;
  isAllIn: boolean;
  isActive: boolean;
}

export class SidePotManager {
  /**
   * Calculate side pots when players go all-in with different chip amounts
   */
  public calculateSidePots(players: PlayerContribution[]): SidePot[] {
    const activePlayers = players.filter(p => p.isActive && p.totalContribution > 0);
    
    if (activePlayers.length === 0) {
      return [];
    }

    // Sort players by their total contribution (ascending)
    const sortedPlayers = [...activePlayers].sort((a, b) => a.totalContribution - b.totalContribution);
    
    const sidePots: SidePot[] = [];
    let previousContribution = 0;

    for (let i = 0; i < sortedPlayers.length; i++) {
      const currentContribution = sortedPlayers[i].totalContribution;
      const contributionDiff = currentContribution - previousContribution;

      if (contributionDiff > 0) {
        // Create a side pot for this contribution level
        const eligiblePlayers = sortedPlayers
          .slice(i) // Only players at this level or higher
          .map(p => p.playerId);

        const potAmount = contributionDiff * eligiblePlayers.length;

        sidePots.push({
          amount: potAmount,
          eligiblePlayers,
          maxContribution: currentContribution
        });
      }

      previousContribution = currentContribution;
    }

    return sidePots;
  }

  /**
   * Distribute side pots to winners
   */
  public distributeSidePots(
    sidePots: SidePot[], 
    winners: string[], 
    allPlayerHands: { playerId: string; hand: any }[]
  ): PotDistribution[] {
    const distributions: PotDistribution[] = [];

    for (let i = 0; i < sidePots.length; i++) {
      const pot = sidePots[i];
      
      // Find eligible winners for this pot
      const eligibleWinners = winners.filter(winnerId => 
        pot.eligiblePlayers.includes(winnerId)
      );

      if (eligibleWinners.length === 0) {
        // No eligible winners - find best hand among eligible players
        const eligibleHands = allPlayerHands.filter(ph => 
          pot.eligiblePlayers.includes(ph.playerId)
        );

        if (eligibleHands.length > 0) {
          // Find the best hand among eligible players
          const { HandEvaluator } = require('./hand_evaluator');
          const handEvaluator = new HandEvaluator();
          
          const potWinners = handEvaluator.determineWinners(eligibleHands);
          const winAmount = Math.floor(pot.amount / potWinners.length);

                     potWinners.forEach((winnerId: string) => {
            distributions.push({
              playerId: winnerId,
              amount: winAmount,
              potIndex: i,
              description: `Side pot ${i + 1} (max bet ${pot.maxContribution})`
            });
          });
        }
      } else {
        // Distribute among eligible winners
        const winAmount = Math.floor(pot.amount / eligibleWinners.length);

                 eligibleWinners.forEach((winnerId: string) => {
          distributions.push({
            playerId: winnerId,
            amount: winAmount,
            potIndex: i,
            description: `Side pot ${i + 1} (max bet ${pot.maxContribution})`
          });
        });
      }
    }

    return distributions;
  }

  /**
   * Get total pot amount from all side pots
   */
  public getTotalPotAmount(sidePots: SidePot[]): number {
    return sidePots.reduce((total, pot) => total + pot.amount, 0);
  }

  /**
   * Validate side pot calculations
   */
  public validateSidePots(
    sidePots: SidePot[], 
    playerContributions: PlayerContribution[]
  ): boolean {
    const totalCalculated = this.getTotalPotAmount(sidePots);
    const totalContributed = playerContributions.reduce((sum, p) => sum + p.totalContribution, 0);
    
    return Math.abs(totalCalculated - totalContributed) < 0.01; // Allow for rounding
  }

  /**
   * Create player contributions from poker table state
   */
  public createPlayerContributions(players: any[]): PlayerContribution[] {
    return players.map(player => ({
      playerId: player.userId,
      totalContribution: player.currentBet,
      isAllIn: player.isAllIn || player.chips === 0,
      isActive: player.isActive && !player.isFolded
    }));
  }

  /**
   * Handle all-in scenario with side pot creation
   */
  public handleAllInScenario(players: any[]): {
    sidePots: SidePot[];
    distributions: PotDistribution[];
    totalPot: number;
  } {
    const contributions = this.createPlayerContributions(players);
    const sidePots = this.calculateSidePots(contributions);
    const totalPot = this.getTotalPotAmount(sidePots);

    // For distribution, we need the actual winners and hands
    // This will be called from the showdown function
    return {
      sidePots,
      distributions: [], // Will be filled during showdown
      totalPot
    };
  }

  /**
   * Apply pot distributions to players
   */
  public applyDistributions(
    distributions: PotDistribution[], 
    players: { [userId: string]: any }
  ): void {
    distributions.forEach(dist => {
      const player = players[dist.playerId];
      if (player) {
        player.chips += dist.amount;
      }
    });
  }

  /**
   * Get formatted side pot information for display
   */
  public formatSidePotsInfo(sidePots: SidePot[]): string[] {
    return sidePots.map((pot, index) => 
      `Side Pot ${index + 1}: $${pot.amount} (${pot.eligiblePlayers.length} players, max bet $${pot.maxContribution})`
    );
  }
}

// Export for use in match handlers
module.exports = { SidePotManager }; 