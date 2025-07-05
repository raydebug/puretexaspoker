import io from 'socket.io-client';
import type { Socket } from 'socket.io-client/build/esm/socket';
import { GameState, Player } from '../types/game';

export interface AIPlayerConfig {
  name: string;
  personality: 'aggressive' | 'conservative' | 'balanced' | 'bluffer';
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  reactionTime: number; // ms delay to simulate human thinking
}

export class AIPlayer {
  private socket: ReturnType<typeof io>;
  private config: AIPlayerConfig;
  private gameState: GameState | null = null;
  private isConnected = false;
  private playerId: string | null = null;

  constructor(config: AIPlayerConfig, serverUrl: string = 'http://localhost:3001') {
    this.config = config;
    this.socket = io(serverUrl);
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.socket.on('connect', () => {
      console.log(`🤖 AI Player ${this.config.name} connected`);
      this.isConnected = true;
      this.authenticatePlayer();
    });

    this.socket.on('disconnect', () => {
      console.log(`🤖 AI Player ${this.config.name} disconnected`);
      this.isConnected = false;
    });

    // Game state updates
    this.socket.on('gameState', (gameState: GameState) => {
      this.gameState = gameState;
      this.processGameState();
    });

    this.socket.on('actionRequired', (data: any) => {
      this.makeDecision(data);
    });

    this.socket.on('gameStarted', () => {
      console.log(`🎮 Game started for AI ${this.config.name}`);
    });

    this.socket.on('error', (error: any) => {
      console.error(`❌ AI Player ${this.config.name} error:`, error);
    });
  }

  private authenticatePlayer() {
    // Authenticate as AI player
    this.socket.emit('login', {
      nickname: this.config.name,
      isAI: true
    });
  }

  public async joinTable(tableId: number, buyIn: number = 150) {
    if (!this.isConnected) {
      throw new Error('AI Player not connected');
    }

    console.log(`🎯 AI ${this.config.name} joining table ${tableId} with ${buyIn} chips`);
    
    this.socket.emit('joinTable', { 
      tableId, 
      buyIn,
      nickname: this.config.name 
    });

    // Wait a bit then take a seat
    await this.delay(1000 + Math.random() * 2000);
    this.takeSeat();
  }

  private async takeSeat() {
    // Find available seat (1-6)
    const availableSeats = [1, 2, 3, 4, 5, 6];
    const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
    
    console.log(`💺 AI ${this.config.name} taking seat ${randomSeat}`);
    
    this.socket.emit('takeSeat', {
      seatNumber: randomSeat,
      buyIn: 150
    });
  }

  private async processGameState() {
    if (!this.gameState) return;

    // AI processes current game state
    console.log(`🧠 AI ${this.config.name} processing game state...`);
  }

  private async makeDecision(actionData: any) {
    // Add realistic thinking delay
    await this.delay(this.config.reactionTime + Math.random() * 1000);

    const decision = this.calculateBestAction(actionData);
    
    console.log(`🎯 AI ${this.config.name} decides: ${decision.action} ${decision.amount || ''}`);
    
    this.socket.emit('playerAction', {
      action: decision.action,
      amount: decision.amount
    });
  }

  private calculateBestAction(actionData: any): { action: string, amount?: number } {
    // Simple AI decision logic based on personality
    const availableActions = actionData.availableActions || ['fold', 'call', 'raise'];
    const currentBet = actionData.currentBet || 0;
    const myChips = actionData.playerChips || 150;

    switch (this.config.personality) {
      case 'aggressive':
        return this.aggressiveStrategy(availableActions, currentBet, myChips);
      case 'conservative':
        return this.conservativeStrategy(availableActions, currentBet, myChips);
      case 'bluffer':
        return this.bluffStrategy(availableActions, currentBet, myChips);
      default:
        return this.balancedStrategy(availableActions, currentBet, myChips);
    }
  }

  private aggressiveStrategy(actions: string[], currentBet: number, chips: number) {
    if (actions.includes('raise') && Math.random() > 0.3) {
      return { action: 'raise', amount: Math.min(currentBet * 2, chips * 0.3) };
    }
    if (actions.includes('call') && Math.random() > 0.2) {
      return { action: 'call' };
    }
    return { action: 'fold' };
  }

  private conservativeStrategy(actions: string[], currentBet: number, chips: number) {
    if (actions.includes('call') && currentBet < chips * 0.1 && Math.random() > 0.4) {
      return { action: 'call' };
    }
    if (actions.includes('check')) {
      return { action: 'check' };
    }
    return { action: 'fold' };
  }

  private bluffStrategy(actions: string[], currentBet: number, chips: number) {
    // Occasionally make big bluffs
    if (actions.includes('raise') && Math.random() > 0.7) {
      return { action: 'raise', amount: Math.min(chips * 0.5, currentBet * 3) };
    }
    if (actions.includes('call') && Math.random() > 0.5) {
      return { action: 'call' };
    }
    return { action: 'fold' };
  }

  private balancedStrategy(actions: string[], currentBet: number, chips: number) {
    const rand = Math.random();
    if (actions.includes('call') && rand > 0.6) {
      return { action: 'call' };
    }
    if (actions.includes('raise') && rand > 0.8) {
      return { action: 'raise', amount: Math.min(currentBet * 1.5, chips * 0.2) };
    }
    if (actions.includes('check') && rand > 0.4) {
      return { action: 'check' };
    }
    return { action: 'fold' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public disconnect() {
    this.socket.disconnect();
  }
}

// AI Player Manager
export class AIPlayerManager {
  private aiPlayers: AIPlayer[] = [];

  public createAIPlayer(config: AIPlayerConfig): AIPlayer {
    const aiPlayer = new AIPlayer(config);
    this.aiPlayers.push(aiPlayer);
    return aiPlayer;
  }

  public async startMultiPlayerAIGame(tableId: number, playerCount: number = 6) {
    console.log(`🚀 Starting AI game with ${playerCount} players on table ${tableId}`);

    const personalities: AIPlayerConfig['personality'][] = ['aggressive', 'conservative', 'balanced', 'bluffer'];
    const skillLevels: AIPlayerConfig['skillLevel'][] = ['beginner', 'intermediate', 'advanced', 'expert'];

    for (let i = 0; i < playerCount; i++) {
      const config: AIPlayerConfig = {
        name: `AI_Player_${i + 1}`,
        personality: personalities[i % personalities.length],
        skillLevel: skillLevels[Math.floor(Math.random() * skillLevels.length)],
        reactionTime: 1000 + Math.random() * 3000 // 1-4 second thinking time
      };

      const aiPlayer = this.createAIPlayer(config);
      
      // Stagger joins to avoid conflicts
      setTimeout(() => {
        aiPlayer.joinTable(tableId, 150);
      }, i * 2000);
    }
  }

  public disconnectAllAI() {
    this.aiPlayers.forEach(ai => ai.disconnect());
    this.aiPlayers = [];
    console.log('🛑 All AI players disconnected');
  }
} 