import { GameService } from './gameService';
import { GameState, Player } from '../types/shared';
import { prisma } from '../db';
import { Server } from 'socket.io';
import { CardOrderService } from './cardOrderService';
import { GamePersistenceManager } from './gamePersistenceManager';

export class GameManager {
  private games: Map<string, GameService> = new Map();
  private io: Server | null = null;
  private static instance: GameManager;
  private cardOrderService: CardOrderService;
  private gamePersistenceManager: GamePersistenceManager;

  private constructor() {
    this.cardOrderService = new CardOrderService();
    this.gamePersistenceManager = GamePersistenceManager.getInstance();
    
    // Initialize with default game for testing
    const testGame = new GameService('test-game-id');
    
    // ENHANCED AUTOMATION: Set up callback for test game too
    testGame.setPhaseTransitionCallback(this.handleAutomaticPhaseTransition.bind(this));
    
    this.games.set('test-game-id', testGame);
    console.log(`DEBUG: GameManager initialized with test game. Map size: ${this.games.size}`);
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  private emitGameUpdate(gameId: string, event: string, data?: any): void {
    if (this.io) {
      const gameState = this.getGameState(gameId);
      // Emit to all clients in the game room
      this.io.to(`game:${gameId}`).emit('gameState', gameState);
      if (event !== 'gameState') {
        this.io.to(`game:${gameId}`).emit(event, data);
      }
    }
  }

  // ENHANCED AUTOMATION: Handle automatic phase transitions with WebSocket broadcasting
  private handleAutomaticPhaseTransition(gameId: string, fromPhase: string, toPhase: string, gameState: GameState): void {
    console.log(`🔔 AUTOMATED TRANSITION: GameManager handling ${fromPhase} → ${toPhase} for game ${gameId}`);
    
    // Create detailed transition message
    let message = '';
    let eventType = 'automaticPhaseTransition';
    
    switch (toPhase) {
      case 'flop':
        message = `🎴 Automatic Flop: 3 community cards dealt (betting round completed)`;
        eventType = 'automaticFlop';
        break;
      case 'turn':
        message = `🎴 Automatic Turn: 4th community card dealt (betting round completed)`;
        eventType = 'automaticTurn';
        break;
      case 'river':
        message = `🎴 Automatic River: 5th community card dealt (betting round completed)`;
        eventType = 'automaticRiver';
        break;
      case 'showdown':
        message = `🎯 Automatic Showdown: Determining winner (betting complete)`;
        eventType = 'automaticShowdown';
        break;
      case 'finished':
        const winnerName = gameState.winner ? 
          this.games.get(gameId)?.getPlayer(gameState.winner)?.name || gameState.winner : 'Unknown';
        message = `🏆 Hand Complete: ${winnerName} wins ${gameState.pot} chips`;
        eventType = 'gameComplete';
        break;
      default:
        message = `🔄 Phase transition: ${fromPhase} → ${toPhase}`;
    }

    // Broadcast the automatic transition to all clients
    if (this.io) {
      console.log(`📡 AUTOMATED: Broadcasting ${eventType} to game:${gameId}`);
      
      // Emit the updated game state
      this.io.to(`game:${gameId}`).emit('gameState', gameState);
      
      // Emit specific phase transition event
      this.io.to(`game:${gameId}`).emit(eventType, {
        gameId,
        fromPhase,
        toPhase,
        message,
        communityCards: gameState.communityCards,
        pot: gameState.pot,
        currentPlayerId: gameState.currentPlayerId,
        phase: gameState.phase,
        isAutomatic: true,
        timestamp: Date.now()
      });
      
      // Emit general phase transition event for backwards compatibility
      this.io.to(`game:${gameId}`).emit('phaseTransition', {
        gameId,
        fromPhase,
        toPhase,
        message,
        isAutomatic: true
      });
      
      console.log(`✅ AUTOMATED: Successfully broadcasted ${fromPhase} → ${toPhase} transition`);
    } else {
      console.log(`⚠️ AUTOMATED: No Socket.IO instance available for broadcasting`);
    }
  }

  public createGame(gameId: string): GameState {
    console.log(`DEBUG: GameManager.createGame called with gameId: ${gameId}`);
    if (this.games.has(gameId)) {
      console.log(`DEBUG: Game ${gameId} already exists, returning existing state`);
      return this.games.get(gameId)!.getGameState();
    }
    const gameService = new GameService(gameId);
    
    // ENHANCED AUTOMATION: Set up automatic phase transition callback
    gameService.setPhaseTransitionCallback(this.handleAutomaticPhaseTransition.bind(this));
    
    this.games.set(gameId, gameService);
    console.log(`DEBUG: GameManager created game ${gameId}, map size: ${this.games.size}`);
    console.log(`DEBUG: GameManager games map keys: ${Array.from(this.games.keys())}`);
    return gameService.getGameState();
  }

  public async startGame(gameId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Generate card order before starting the game
    const cardOrderData = this.cardOrderService.generateCardOrder(gameId);

    // Create or update card order record in database
    await prisma.cardOrder.upsert({
      where: { gameId },
      create: {
        gameId,
        seed: cardOrderData.seed,
        cardOrder: JSON.stringify(cardOrderData.cardOrder),
        hash: cardOrderData.hash,
        isRevealed: false
      },
      update: {
        seed: cardOrderData.seed,
        cardOrder: JSON.stringify(cardOrderData.cardOrder),
        hash: cardOrderData.hash,
        isRevealed: false
      }
    });

    // Start the game (deals cards, posts blinds, etc.)
    gameService.startGame();

    // Update database
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'active'
      }
    });

    // Emit real-time updates including card order hash
    this.emitGameUpdate(gameId, 'gameStarted', { 
      gameId,
      cardOrderHash: cardOrderData.hash
    });
    this.emitGameUpdate(gameId, 'cardsDealt', { 
      phase: 'preflop',
      message: 'Hole cards dealt to all players',
      cardOrderHash: cardOrderData.hash
    });

    return gameService.getGameState();
  }

  public async placeBet(gameId: string, playerId: string, amount: number): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Get game state before action
    const gameStateBefore = gameService.getGameState();
    const player = gameService.getPlayer(playerId);
    const playerName = player?.name || 'Unknown';

    gameService.placeBet(playerId, amount);

    // Get game state after action
    const gameStateAfter = gameService.getGameState();

    // Record the action in both tables
    await Promise.all([
      // Original GameAction table
      prisma.gameAction.create({
        data: {
          gameId,
          playerId,
          type: 'bet',
          amount
        }
      }),
      // New GameActionHistory table for Action History UI
      this.gamePersistenceManager.recordGameAction(
        gameId,
        playerId,
        playerName,
        'bet',
        amount,
        gameStateAfter.phase,
        1, // Hand number - TODO: implement proper hand tracking
        gameStateBefore,
        gameStateAfter
      )
    ]);

    // Update pot in database
    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: gameStateAfter.pot
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'bet',
      amount,
      pot: gameStateAfter.pot
    });

    return gameStateAfter;
  }

  public async fold(gameId: string, playerId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Get game state before action
    const gameStateBefore = gameService.getGameState();
    const player = gameService.getPlayer(playerId);
    const playerName = player?.name || 'Unknown';

    gameService.fold(playerId);

    // Get game state after action
    const gameStateAfter = gameService.getGameState();

    // Record the action in both tables
    await Promise.all([
      // Original GameAction table
      prisma.gameAction.create({
        data: {
          gameId,
          playerId,
          type: 'fold'
        }
      }),
      // New GameActionHistory table for Action History UI
      this.gamePersistenceManager.recordGameAction(
        gameId,
        playerId,
        playerName,
        'fold',
        undefined, // No amount for fold
        gameStateAfter.phase,
        1, // Hand number - TODO: implement proper hand tracking
        gameStateBefore,
        gameStateAfter
      )
    ]);

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: gameStateAfter.isHandComplete ? 'finished' : 'active'
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'fold'
    });

    return gameStateAfter;
  }

  public async call(gameId: string, playerId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Get game state before action
    const gameStateBefore = gameService.getGameState();
    const player = gameService.getPlayer(playerId);
    const playerName = player?.name || 'Unknown';

    gameService.call(playerId);

    // Get game state after action
    const gameStateAfter = gameService.getGameState();

    // Calculate call amount
    const callAmount = gameStateBefore.currentBet - (player?.currentBet || 0);

    // Record the action in both tables
    await Promise.all([
      // Original GameAction table
      prisma.gameAction.create({
        data: {
          gameId,
          playerId,
          type: 'call'
        }
      }),
      // New GameActionHistory table for Action History UI
      this.gamePersistenceManager.recordGameAction(
        gameId,
        playerId,
        playerName,
        'call',
        callAmount > 0 ? callAmount : undefined,
        gameStateAfter.phase,
        1, // Hand number - TODO: implement proper hand tracking
        gameStateBefore,
        gameStateAfter
      )
    ]);

    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: gameStateAfter.pot
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'call',
      pot: gameStateAfter.pot
    });

    return gameStateAfter;
  }

  public async check(gameId: string, playerId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Get game state before action
    const gameStateBefore = gameService.getGameState();
    const player = gameService.getPlayer(playerId);
    const playerName = player?.name || 'Unknown';

    gameService.check(playerId);

    // Get game state after action
    const gameStateAfter = gameService.getGameState();

    // Record the action in both tables
    await Promise.all([
      // Original GameAction table
      prisma.gameAction.create({
        data: {
          gameId,
          playerId,
          type: 'check'
        }
      }),
      // New GameActionHistory table for Action History UI
      this.gamePersistenceManager.recordGameAction(
        gameId,
        playerId,
        playerName,
        'check',
        undefined, // No amount for check
        gameStateAfter.phase,
        1, // Hand number - TODO: implement proper hand tracking
        gameStateBefore,
        gameStateAfter
      )
    ]);

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'check'
    });

    return gameStateAfter;
  }

  public async dealCommunityCards(gameId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    const prevPhase = gameService.getGameState().phase;
    
    try {
      gameService.dealCommunityCards();
    } catch (error) {
      throw new Error(`Cannot deal community cards: ${(error as Error).message}`);
    }
    
    const gameState = gameService.getGameState();

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: gameState.isHandComplete ? 'finished' : 'active'
      }
    });

    // Emit real-time update with phase transition
    let message = '';
    switch (gameState.phase) {
      case 'flop':
        message = 'Flop dealt: 3 community cards revealed';
        break;
      case 'turn':
        message = 'Turn dealt: 4th community card revealed';
        break;
      case 'river':
        message = 'River dealt: 5th community card revealed';
        break;
      case 'showdown':
        message = 'Showdown: All community cards revealed, determining winner';
        break;
      case 'finished':
        message = `Hand complete. Winner: ${gameState.winner ? 
          gameService.getPlayer(gameState.winner)?.name || gameState.winner : 'None'}`;
        break;
    }

    this.emitGameUpdate(gameId, 'communityCardsDealt', {
      phase: gameState.phase,
      prevPhase,
      communityCards: gameState.communityCards,
      message,
      winner: gameState.winner,
      handEvaluation: gameState.handEvaluation
    });

    // If game is finished, reveal the card order
    if (gameState.phase === 'finished' || gameState.isHandComplete) {
      await this.revealCardOrder(gameId);
    }

    return gameState;
  }

  public async startNewHand(gameId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    try {
      gameService.startNewHand();
    } catch (error) {
      throw new Error(`Cannot start new hand: ${(error as Error).message}`);
    }

    const gameState = gameService.getGameState();

    // Update database for new hand
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'active',
        pot: gameState.pot
      }
    });

    // Emit real-time updates for new hand
    this.emitGameUpdate(gameId, 'newHandStarted', {
      gameId,
      phase: gameState.phase,
      dealerPosition: gameState.dealerPosition,
      message: 'New hand started - cards dealt'
    });

    return gameState;
  }

  public async getPhaseInfo(gameId: string): Promise<any> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    return gameService.getPhaseInfo();
  }

  public async forceCompletePhase(gameId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    const phaseInfo = gameService.getPhaseInfo();
    if (!phaseInfo.canDeal) {
      throw new Error(`Cannot complete phase: ${phaseInfo.description}. Betting round not complete.`);
    }

    return this.dealCommunityCards(gameId);
  }

  public getGame(gameId: string): GameService | null {
    console.log(`DEBUG: GameManager.getGame called with gameId: ${gameId}`);
    console.log(`DEBUG: GameManager games map size: ${this.games.size}`);
    console.log(`DEBUG: GameManager games map keys: ${Array.from(this.games.keys())}`);
    const game = this.games.get(gameId) || null;
    console.log(`DEBUG: GameManager.getGame returning: ${game ? 'GAME_SERVICE' : 'NULL'}`);
    return game;
  }

  public getGameState(gameId: string): GameState | null {
    const gameService = this.games.get(gameId);
    return gameService ? gameService.getGameState() : null;
  }

  public removeGame(gameId: string): void {
    this.games.delete(gameId);
  }

  // Method for clients to join game room
  public joinGameRoom(gameId: string, socketId: string): void {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`game:${gameId}`);
        // Send current game state to the joining client
        const gameState = this.getGameState(gameId);
        if (gameState) {
          socket.emit('gameState', gameState);
        }
      }
    }
  }

  // Method for clients to leave game room
  public leaveGameRoom(gameId: string, socketId: string): void {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`game:${gameId}`);
      }
    }
  }

  public async raise(gameId: string, playerId: string, totalAmount: number): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Get game state before action
    const gameStateBefore = gameService.getGameState();
    const player = gameService.getPlayer(playerId);
    const playerName = player?.name || 'Unknown';

    gameService.raise(playerId, totalAmount);

    // Get game state after action
    const gameStateAfter = gameService.getGameState();

    // Record the action in both tables
    await Promise.all([
      // Original GameAction table
      prisma.gameAction.create({
        data: {
          gameId,
          playerId,
          type: 'raise' as any, // Cast to avoid TypeScript enum issues
          amount: totalAmount
        }
      }),
      // New GameActionHistory table for Action History UI
      this.gamePersistenceManager.recordGameAction(
        gameId,
        playerId,
        playerName,
        'raise',
        totalAmount,
        gameStateAfter.phase,
        1, // Hand number - TODO: implement proper hand tracking
        gameStateBefore,
        gameStateAfter
      )
    ]);

    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: gameStateAfter.pot
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'raise',
      amount: totalAmount,
      pot: gameStateAfter.pot
    });

    return gameStateAfter;
  }

  public async allIn(gameId: string, playerId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Get game state before action
    const gameStateBefore = gameService.getGameState();
    const player = gameService.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    const playerName = player.name || 'Unknown';

    const allInAmount = player.chips;
    gameService.allIn(playerId);

    // Get game state after action
    const gameStateAfter = gameService.getGameState();

    // Record the action in both tables
    await Promise.all([
      // Original GameAction table
      prisma.gameAction.create({
        data: {
          gameId,
          playerId,
          type: 'bet' as any, // All-in is recorded as a bet action
          amount: allInAmount
        }
      }),
      // New GameActionHistory table for Action History UI
      this.gamePersistenceManager.recordGameAction(
        gameId,
        playerId,
        playerName,
        'allIn',
        allInAmount,
        gameStateAfter.phase,
        1, // Hand number - TODO: implement proper hand tracking
        gameStateBefore,
        gameStateAfter
      )
    ]);

    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: gameStateAfter.pot
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'allIn',
      amount: allInAmount,
      pot: gameStateAfter.pot
    });

    return gameStateAfter;
  }

  private async revealCardOrder(gameId: string): Promise<void> {
    try {
      await prisma.cardOrder.update({
        where: { gameId },
        data: { isRevealed: true }
      });

      // Emit event that card order has been revealed
      this.emitGameUpdate(gameId, 'cardOrderRevealed', {
        gameId,
        message: 'Card order has been revealed for transparency'
      });
    } catch (error) {
      console.error('Error revealing card order:', error);
    }
  }
}

// Singleton instance
export const gameManager = GameManager.getInstance(); 