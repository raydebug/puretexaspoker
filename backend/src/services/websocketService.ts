import { Server, Socket } from 'socket.io';
import { GameService } from './gameService';
import { GameState, Player } from '../types/card';

export class WebSocketService {
  private io: Server;
  private gameService: GameService;
  private activeGames: Map<string, Set<string>> = new Map(); // gameId -> Set of playerIds

  constructor(io: Server) {
    this.io = io;
    this.gameService = new GameService();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('joinGame', (gameId: string, player: Player) => {
        this.handleJoinGame(socket, gameId, player);
      });

      socket.on('leaveGame', (gameId: string, playerId: string) => {
        this.handleLeaveGame(socket, gameId, playerId);
      });

      socket.on('placeBet', (gameId: string, playerId: string, amount: number) => {
        this.handlePlaceBet(socket, gameId, playerId, amount);
      });

      socket.on('fold', (gameId: string, playerId: string) => {
        this.handleFold(socket, gameId, playerId);
      });

      socket.on('check', (gameId: string, playerId: string) => {
        this.handleCheck(socket, gameId, playerId);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinGame(socket: Socket, gameId: string, player: Player): void {
    try {
      // Join socket room for this game
      socket.join(gameId);

      // Add player to active games tracking
      if (!this.activeGames.has(gameId)) {
        this.activeGames.set(gameId, new Set());
      }
      this.activeGames.get(gameId)?.add(player.id);

      // Get current game state and emit to all players in the game
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);

      console.log(`Player ${player.id} joined game ${gameId}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join game' });
    }
  }

  private handleLeaveGame(socket: Socket, gameId: string, playerId: string): void {
    try {
      socket.leave(gameId);
      this.activeGames.get(gameId)?.delete(playerId);

      // If no players left, clean up the game
      if (this.activeGames.get(gameId)?.size === 0) {
        this.activeGames.delete(gameId);
      }

      this.io.to(gameId).emit('playerLeft', playerId);
      console.log(`Player ${playerId} left game ${gameId}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to leave game' });
    }
  }

  private handlePlaceBet(socket: Socket, gameId: string, playerId: string, amount: number): void {
    try {
      this.gameService.placeBet(playerId, amount);
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);
    } catch (error) {
      socket.emit('error', { message: 'Failed to place bet' });
    }
  }

  private handleFold(socket: Socket, gameId: string, playerId: string): void {
    try {
      this.gameService.fold(playerId);
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);
    } catch (error) {
      socket.emit('error', { message: 'Failed to fold' });
    }
  }

  private handleCheck(socket: Socket, gameId: string, playerId: string): void {
    try {
      this.gameService.check(playerId);
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);
    } catch (error) {
      socket.emit('error', { message: 'Failed to check' });
    }
  }

  private handleDisconnect(socket: Socket): void {
    console.log('Client disconnected:', socket.id);
    // Clean up any games the player was in
    this.activeGames.forEach((players, gameId) => {
      if (players.has(socket.id)) {
        this.handleLeaveGame(socket, gameId, socket.id);
      }
    });
  }
} 