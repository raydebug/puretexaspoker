/// <reference path="../types/nakama.d.ts" />

interface AIPlayerConfig {
  name: string;
  personality: 'aggressive' | 'conservative' | 'balanced' | 'bluffer';
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  reactionTime: number; // milliseconds
}

interface AIDecision {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
  amount?: number;
  reasoning: string;
}

export class AIPlayerService {
  private readonly nk: nkruntime.Nakama;
  private readonly logger: nkruntime.Logger;
  
  constructor(nk: nkruntime.Nakama, logger: nkruntime.Logger) {
    this.nk = nk;
    this.logger = logger;
  }

  /**
   * Make an AI decision based on game state and player configuration
   */
  public makeDecision(
    config: AIPlayerConfig,
    gameState: any,
    playerId: string,
    availableActions: string[]
  ): AIDecision {
    
    const player = gameState.players[playerId];
    if (!player) {
      return { action: 'fold', reasoning: 'Player not found' };
    }

    // Calculate basic game metrics
    const currentBet = gameState.currentBet || 0;
    const playerBet = player.currentBet || 0;
    const callAmount = currentBet - playerBet;
    const playerChips = player.chips || 0;
    const potSize = gameState.pot || 0;
    const potOdds = potSize > 0 ? callAmount / (potSize + callAmount) : 0;

    // Hand strength estimation (simplified)
    const handStrength = this.estimateHandStrength(player.cards, gameState.communityCards, gameState.gamePhase);
    
    // Apply personality-based decision making
    switch (config.personality) {
      case 'aggressive':
        return this.aggressiveStrategy(handStrength, availableActions, callAmount, playerChips, potOdds, config.skillLevel);
      case 'conservative':
        return this.conservativeStrategy(handStrength, availableActions, callAmount, playerChips, potOdds, config.skillLevel);
      case 'bluffer':
        return this.blufferStrategy(handStrength, availableActions, callAmount, playerChips, potOdds, config.skillLevel);
      default:
        return this.balancedStrategy(handStrength, availableActions, callAmount, playerChips, potOdds, config.skillLevel);
    }
  }

  /**
   * Estimate hand strength (simplified version)
   */
  private estimateHandStrength(holeCards: any[], communityCards: any[], phase: string): number {
    if (!holeCards || holeCards.length !== 2) return 0;

    // Very basic hand strength estimation (0-1 scale)
    const card1Value = this.getCardValue(holeCards[0].rank);
    const card2Value = this.getCardValue(holeCards[1].rank);
    
    let strength = 0;

    // Pocket pair bonus
    if (card1Value === card2Value) {
      strength += 0.3 + (card1Value / 14) * 0.4; // Higher pairs are stronger
    }
    
    // High card strength
    const avgCardValue = (card1Value + card2Value) / 2;
    strength += (avgCardValue / 14) * 0.3;

    // Suited bonus
    if (holeCards[0].suit === holeCards[1].suit) {
      strength += 0.1;
    }

    // Connected cards bonus
    if (Math.abs(card1Value - card2Value) <= 1) {
      strength += 0.05;
    }

    // Adjust for community cards (very simplified)
    if (phase !== 'preflop' && communityCards.length > 0) {
      // Check for potential pairs, straights, flushes
      strength += this.evaluateWithCommunity(holeCards, communityCards) * 0.3;
    }

    return Math.min(strength, 1.0);
  }

  private getCardValue(rank: string): number {
    const values: { [key: string]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank] || 0;
  }

  private evaluateWithCommunity(holeCards: any[], communityCards: any[]): number {
    // Very simplified community card evaluation
    let bonus = 0;
    
    // Check for pairs with community cards
    const allRanks = [...holeCards, ...communityCards].map(c => c.rank);
    const rankCounts: { [rank: string]: number } = {};
    allRanks.forEach(rank => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    const maxCount = Math.max(...Object.values(rankCounts));
    if (maxCount >= 2) bonus += 0.2;
    if (maxCount >= 3) bonus += 0.3;
    if (maxCount >= 4) bonus += 0.5;

    return bonus;
  }

  /**
   * Aggressive AI strategy
   */
  private aggressiveStrategy(
    handStrength: number, 
    availableActions: string[], 
    callAmount: number, 
    playerChips: number, 
    potOdds: number,
    skillLevel: string
  ): AIDecision {
    
    const skillMultiplier = this.getSkillMultiplier(skillLevel);
    const adjustedStrength = handStrength * skillMultiplier;

    if (adjustedStrength > 0.7) {
      if (availableActions.includes('raise') && playerChips > callAmount * 3) {
        const raiseAmount = Math.min(callAmount * 3, playerChips * 0.8);
        return { action: 'raise', amount: raiseAmount, reasoning: 'Strong hand - aggressive raise' };
      }
      if (availableActions.includes('bet') && playerChips > callAmount * 2) {
        const betAmount = Math.min(callAmount * 2, playerChips * 0.6);
        return { action: 'bet', amount: betAmount, reasoning: 'Strong hand - aggressive bet' };
      }
    }

    if (adjustedStrength > 0.4) {
      if (availableActions.includes('call') && callAmount <= playerChips) {
        return { action: 'call', reasoning: 'Decent hand - call to see more cards' };
      }
      if (availableActions.includes('check')) {
        return { action: 'check', reasoning: 'Decent hand - check to see more cards' };
      }
    }

    // Bluff occasionally with weak hands
    if (Math.random() < 0.2 && availableActions.includes('bet') && playerChips > callAmount) {
      const bluffAmount = Math.min(callAmount, playerChips * 0.3);
      return { action: 'bet', amount: bluffAmount, reasoning: 'Aggressive bluff' };
    }

    return { action: 'fold', reasoning: 'Weak hand - fold to preserve chips' };
  }

  /**
   * Conservative AI strategy
   */
  private conservativeStrategy(
    handStrength: number, 
    availableActions: string[], 
    callAmount: number, 
    playerChips: number, 
    potOdds: number,
    skillLevel: string
  ): AIDecision {
    
    const skillMultiplier = this.getSkillMultiplier(skillLevel);
    const adjustedStrength = handStrength * skillMultiplier;

    if (adjustedStrength > 0.8) {
      if (availableActions.includes('raise') && playerChips > callAmount * 2) {
        const raiseAmount = Math.min(callAmount * 1.5, playerChips * 0.4);
        return { action: 'raise', amount: raiseAmount, reasoning: 'Very strong hand - conservative raise' };
      }
      if (availableActions.includes('call') && callAmount <= playerChips * 0.2) {
        return { action: 'call', reasoning: 'Strong hand - call conservatively' };
      }
    }

    if (adjustedStrength > 0.6) {
      if (availableActions.includes('call') && potOdds < 0.3 && callAmount <= playerChips * 0.1) {
        return { action: 'call', reasoning: 'Good hand with favorable pot odds' };
      }
      if (availableActions.includes('check')) {
        return { action: 'check', reasoning: 'Good hand - check to control pot size' };
      }
    }

    if (adjustedStrength > 0.3 && availableActions.includes('check')) {
      return { action: 'check', reasoning: 'Marginal hand - check to see more cards cheaply' };
    }

    return { action: 'fold', reasoning: 'Conservative fold with weak hand' };
  }

  /**
   * Bluffer AI strategy
   */
  private blufferStrategy(
    handStrength: number, 
    availableActions: string[], 
    callAmount: number, 
    playerChips: number, 
    potOdds: number,
    skillLevel: string
  ): AIDecision {
    
    const skillMultiplier = this.getSkillMultiplier(skillLevel);
    const bluffFrequency = 0.3; // 30% bluff rate

    // Strong hand - bet for value
    if (handStrength > 0.7) {
      if (availableActions.includes('raise') && playerChips > callAmount * 2) {
        const raiseAmount = Math.min(callAmount * 2.5, playerChips * 0.7);
        return { action: 'raise', amount: raiseAmount, reasoning: 'Strong hand - value raise' };
      }
      if (availableActions.includes('call')) {
        return { action: 'call', reasoning: 'Strong hand - call for value' };
      }
    }

    // Bluff with weak hands occasionally
    if (handStrength < 0.4 && Math.random() < bluffFrequency) {
      if (availableActions.includes('bet') && playerChips > callAmount) {
        const bluffAmount = Math.min(callAmount * 1.5, playerChips * 0.4);
        return { action: 'bet', amount: bluffAmount, reasoning: 'Bluff attempt' };
      }
      if (availableActions.includes('raise') && playerChips > callAmount * 2) {
        const bluffAmount = Math.min(callAmount * 2, playerChips * 0.5);
        return { action: 'raise', amount: bluffAmount, reasoning: 'Bluff raise' };
      }
    }

    // Standard play for medium hands
    if (handStrength > 0.4) {
      if (availableActions.includes('call') && potOdds < 0.4) {
        return { action: 'call', reasoning: 'Decent hand - call' };
      }
      if (availableActions.includes('check')) {
        return { action: 'check', reasoning: 'Medium hand - check' };
      }
    }

    return { action: 'fold', reasoning: 'Weak hand - fold' };
  }

  /**
   * Balanced AI strategy
   */
  private balancedStrategy(
    handStrength: number, 
    availableActions: string[], 
    callAmount: number, 
    playerChips: number, 
    potOdds: number,
    skillLevel: string
  ): AIDecision {
    
    const skillMultiplier = this.getSkillMultiplier(skillLevel);
    const adjustedStrength = handStrength * skillMultiplier;

    // Very strong hands
    if (adjustedStrength > 0.75) {
      if (availableActions.includes('raise') && playerChips > callAmount * 2) {
        const raiseAmount = Math.min(callAmount * 2, playerChips * 0.6);
        return { action: 'raise', amount: raiseAmount, reasoning: 'Strong hand - value raise' };
      }
      if (availableActions.includes('call')) {
        return { action: 'call', reasoning: 'Strong hand - call' };
      }
    }

    // Good hands
    if (adjustedStrength > 0.5) {
      if (availableActions.includes('call') && potOdds < 0.35) {
        return { action: 'call', reasoning: 'Good hand with favorable odds' };
      }
      if (availableActions.includes('check')) {
        return { action: 'check', reasoning: 'Good hand - check to control pot' };
      }
    }

    // Marginal hands
    if (adjustedStrength > 0.3) {
      if (availableActions.includes('check')) {
        return { action: 'check', reasoning: 'Marginal hand - check' };
      }
      if (availableActions.includes('call') && potOdds < 0.2 && callAmount <= playerChips * 0.05) {
        return { action: 'call', reasoning: 'Marginal hand with good pot odds' };
      }
    }

    return { action: 'fold', reasoning: 'Weak hand - fold' };
  }

  private getSkillMultiplier(skillLevel: string): number {
    switch (skillLevel) {
      case 'expert': return 1.2;
      case 'advanced': return 1.1;
      case 'intermediate': return 1.0;
      case 'beginner': return 0.8;
      default: return 1.0;
    }
  }

  /**
   * Create an AI player for a match
   */
  public async createAIPlayerInMatch(
    matchId: string,
    config: AIPlayerConfig
  ): Promise<string> {
    try {
      // Create a device session for the AI player
      const deviceId = `ai_${config.name}_${Date.now()}`;
      
      // Note: In a real implementation, you'd need to handle AI authentication differently
      // This is a simplified version for demonstration
      
      this.logger.info(`Created AI player ${config.name} for match ${matchId}`);
      return deviceId;
      
    } catch (error) {
      this.logger.error(`Failed to create AI player: ${error}`);
      throw error;
    }
  }

  /**
   * Process AI player turn in match
   */
  public processAITurn(
    config: AIPlayerConfig,
    gameState: any,
    playerId: string,
    availableActions: string[],
    dispatcher: nkruntime.MatchDispatcher
  ): void {
    
    // Add realistic thinking time
    setTimeout(() => {
      const decision = this.makeDecision(config, gameState, playerId, availableActions);
      
      // Send the AI decision as a match message
      const actionData = {
        action: decision.action,
        amount: decision.amount,
        reasoning: decision.reasoning
      };

      // Use OpCode 2 for game actions
      dispatcher.broadcastMessage(2, JSON.stringify(actionData), [], undefined, true);
      
      this.logger.info(`AI ${config.name} decided: ${decision.action} (${decision.reasoning})`);
      
    }, config.reactionTime);
  }
}

// Export for use in match handlers
module.exports = { AIPlayerService }; 