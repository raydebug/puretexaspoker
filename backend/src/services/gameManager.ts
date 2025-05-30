import { GameService } from './gameService';
import { GameState, Player } from '../types/shared';
import { prisma } from '../db';

export class GameManager {
  private games: Map<string, GameService> = new Map();

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

    return gameService.getGameState();
  }

  public async dealCommunityCards(gameId: string): Promise<GameState> {
    const gameService = this.games.get(gameId);
    if (!gameService) {
      throw new Error('Game not found');
    }

    gameService.dealCommunityCards();
    const gameState = gameService.getGameState();

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: gameState.isHandComplete ? 'finished' : 'active'
      }
    });

    return gameState;
  }

  public getGame(gameId: string): GameService | undefined {
    return this.games.get(gameId);
  }

  public getGameState(gameId: string): GameState | null {
    const gameService = this.games.get(gameId);
    return gameService ? gameService.getGameState() : null;
  }

  public removeGame(gameId: string): void {
    this.games.delete(gameId);
  }
}

// Singleton instance
export const gameManager = new GameManager(); 