import { GameService } from './gameService';
import { GameState, Player } from '../types/shared';
import { prisma } from '../db';
import { Server } from 'socket.io';

export class GameManager {
  private games: Map<string, GameService> = new Map();
  private io: Server | null = null;

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

  public async createGame(tableId: string): Promise<GameState> {
    // Check if table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        playerTables: {
          include: {
            player: true
          }
        }
      }
    });

    if (!table) {
      throw new Error('Table not found');
    }

    // Check if there's already an active game for this table
    const existingGame = await prisma.game.findFirst({
      where: {
        tableId,
        status: 'active'
      }
    });

    if (existingGame) {
      throw new Error('Table already has an active game');
    }

    // Create new game service instance
    const gameService = new GameService();
    
    // Add players from table to game
    const gamePlayers: Player[] = table.playerTables.map((pt, index) => ({
      id: pt.player.id,
      name: pt.player.nickname,
      chips: pt.buyIn || 1000, // Use buy-in amount or default
      isActive: false, // Will be set to true when game starts
      isDealer: index === 0, // First player starts as dealer
      currentBet: 0,
      position: index,
      seatNumber: pt.seatNumber || index + 1,
      isAway: false,
      cards: [],
      avatar: {
        type: 'default',
        color: '#007bff'
      }
    }));

    // Add players to game service
    gamePlayers.forEach(player => {
      gameService.addPlayer(player);
    });

    // Create game record in database
    const dbGame = await prisma.game.create({
      data: {
        tableId,
        status: 'waiting',
        pot: 0
      }
    });

    // Set the game ID in the service
    gameService.setGameId(dbGame.id);

    // Store the game service
    this.games.set(dbGame.id, gameService);

    // Emit real-time update
    this.emitGameUpdate(dbGame.id, 'gameCreated', { gameId: dbGame.id });

    return gameService.getGameState();
  }

  public async startGame(gameId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    // Start the game (deals cards, posts blinds, etc.)
    gameService.startGame();

    // Update database
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'active'
      }
    });

    // Emit real-time updates
    this.emitGameUpdate(gameId, 'gameStarted', { gameId });
    this.emitGameUpdate(gameId, 'cardsDealt', { 
      phase: 'preflop',
      message: 'Hole cards dealt to all players'
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
    return this.games.get(gameId) || null;
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
}

// Singleton instance
export const gameManager = new GameManager(); 