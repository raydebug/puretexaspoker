import { Server, Socket } from 'socket.io';
import { GameService } from './gameService';
import { GameState, Player } from '../types/card';
import { createChatService } from './chatService';
import { errorTrackingService } from './errorTrackingService';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isPrivate?: boolean;
  recipient?: string;
}

export class WebSocketService {
  private io: Server;
  private gameService: GameService;
  private chatService: ReturnType<typeof createChatService>;
  private activeGames: Map<string, Set<string>> = new Map(); // gameId -> Set of playerIds

  constructor(io: Server) {
    this.io = io;
    this.gameService = new GameService();
    this.chatService = createChatService(io);
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

      // Chat handlers
      socket.on('chat:message', ({ gameId, message }: { gameId: string, message: ChatMessage }) => {
        this.handleChatMessage(socket, gameId, message);
      });

      socket.on('chat:getHistory', (gameId: string) => {
        this.handleGetChatHistory(socket, gameId);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinGame(socket: Socket, gameId: string, player: Player): void {
    try {
      socket.join(gameId);
      socket.data.player = player;
      socket.data.gameId = gameId;

      if (!this.activeGames.has(gameId)) {
        this.activeGames.set(gameId, new Set());
      }
      this.activeGames.get(gameId)?.add(player.id);

      this.gameService.addPlayer(player);
      const gameState = this.gameService.getGameState();

      socket.emit('gameStateUpdate', gameState);
      
      // Send chat history and notify others
      socket.emit('chat:history', this.chatService.getHistory(gameId));
      this.chatService.notifyGameEvent(gameId, 'playerJoined', player.name);
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handleJoinGame', { gameId, player });
      socket.emit('error', { message: 'Failed to join game' });
    }
  }

  private handleLeaveGame(socket: Socket, gameId: string, playerId: string): void {
    try {
      socket.leave(gameId);
      this.activeGames.get(gameId)?.delete(playerId);
      
      const player = this.gameService.getPlayer(playerId);
      this.gameService.removePlayer(playerId);
      
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);
      
      // Notify others about player leaving
      if (player) {
        this.chatService.notifyGameEvent(gameId, 'playerLeft', player.name);
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handleLeaveGame', { gameId, playerId });
      socket.emit('error', { message: 'Failed to leave game' });
    }
  }

  private handlePlaceBet(socket: Socket, gameId: string, playerId: string, amount: number): void {
    try {
      const player = this.gameService.getPlayer(playerId);
      this.gameService.placeBet(playerId, amount);
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);
      
      // Notify about bet
      if (player) {
        const event = gameState.currentBet === amount ? 'playerCalled' : 'playerRaised';
        this.chatService.notifyGameEvent(gameId, event, player.name);
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handlePlaceBet', { gameId, playerId, amount });
      socket.emit('error', { message: 'Failed to place bet' });
    }
  }

  private handleFold(socket: Socket, gameId: string, playerId: string): void {
    try {
      const player = this.gameService.getPlayer(playerId);
      this.gameService.fold(playerId);
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);
      
      // Notify about fold
      if (player) {
        this.chatService.notifyGameEvent(gameId, 'playerFolded', player.name);
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handleFold', { gameId, playerId });
      socket.emit('error', { message: 'Failed to fold' });
    }
  }

  private handleCheck(socket: Socket, gameId: string, playerId: string): void {
    try {
      const player = this.gameService.getPlayer(playerId);
      this.gameService.check(playerId);
      const gameState = this.gameService.getGameState();
      this.io.to(gameId).emit('gameStateUpdate', gameState);
      
      // Notify about check
      if (player) {
        this.chatService.notifyGameEvent(gameId, 'playerChecked', player.name);
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handleCheck', { gameId, playerId });
      socket.emit('error', { message: 'Failed to check' });
    }
  }

  private handleChatMessage(socket: Socket, gameId: string, message: ChatMessage): void {
    try {
      this.chatService.sendMessage(gameId, message);
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handleChatMessage', { 
        gameId, 
        sender: message.sender
      });
      socket.emit('error', { message: 'Failed to send chat message' });
    }
  }

  private handleGetChatHistory(socket: Socket, gameId: string): void {
    try {
      const history = this.chatService.getHistory(gameId);
      socket.emit('chat:history', history);
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handleGetChatHistory', { gameId });
      socket.emit('error', { message: 'Failed to retrieve chat history' });
    }
  }

  private handleDisconnect(socket: Socket): void {
    try {
      const player = socket.data.player;
      const gameId = socket.data.gameId;
      
      if (player && gameId) {
        this.activeGames.get(gameId)?.delete(player.id);
        this.gameService.updatePlayerStatus(player.id, true); // Mark as away
        
        const gameState = this.gameService.getGameState();
        this.io.to(gameId).emit('gameStateUpdate', gameState);
        
        // Notify others about player going away
        this.chatService.notifyGameEvent(gameId, 'playerWentAway', player.name);
      }
      
      console.log('Client disconnected:', socket.id);
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'handleDisconnect', { 
        socketId: socket.id,
        player: socket.data?.player?.name
      });
    }
  }
} 