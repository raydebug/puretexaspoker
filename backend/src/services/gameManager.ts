import { GameService } from './gameService';
import { GameState, Player } from '../types/shared';
import { prisma } from '../db';
import { Server } from 'socket.io';
import { CardOrderService } from './cardOrderService';

export class GameManager {
  private games: Map<string, GameService> = new Map();
  private io: Server | null = null;
  private static instance: GameManager;
  private cardOrderService: CardOrderService;

  private constructor() {
    this.cardOrderService = new CardOrderService();
    // Initialize with default game for testing
    const testGame = new GameService('test-game-id');
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

  public createGame(gameId: string): GameState {
    console.log(`DEBUG: GameManager.createGame called with gameId: ${gameId}`);
    if (this.games.has(gameId)) {
      return this.games.get(gameId)!.getGameState();
    }
    const gameService = new GameService(gameId);
    this.games.set(gameId, gameService);
    console.log(`DEBUG: GameManager games map size: ${this.games.size}`);
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

    // Create card order record in database
    await prisma.cardOrder.create({
      data: {
        gameId,
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

    gameService.placeBet(playerId, amount);

    // Record the action in database
    await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: 'bet',
        amount
      }
    });

    // Update pot in database
    const gameState = gameService.getGameState();
    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: gameState.pot
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'bet',
      amount,
      pot: gameState.pot
    });

    return gameState;
  }

  public async fold(gameId: string, playerId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    gameService.fold(playerId);

    // Record the action in database
    await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: 'fold'
      }
    });

    const gameState = gameService.getGameState();
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: gameState.isHandComplete ? 'finished' : 'active'
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'fold'
    });

    return gameState;
  }

  public async call(gameId: string, playerId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    gameService.call(playerId);

    // Record the action in database
    await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: 'call'
      }
    });

    const gameState = gameService.getGameState();
    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: gameState.pot
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'call',
      pot: gameState.pot
    });

    return gameState;
  }

  public async check(gameId: string, playerId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    gameService.check(playerId);

    // Record the action in database
    await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: 'check'
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'check'
    });

    return gameService.getGameState();
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

    gameService.raise(playerId, totalAmount);

    // Record the action in database
    await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: 'raise' as any, // Cast to avoid TypeScript enum issues
        amount: totalAmount
      }
    });

    const gameState = gameService.getGameState();
    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: gameState.pot
      }
    });

    // Emit real-time update
    this.emitGameUpdate(gameId, 'playerAction', {
      playerId,
      action: 'raise',
      amount: totalAmount,
      pot: gameState.pot
    });

    return gameState;
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