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
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      socket.on('joinGame', (player: Player) => {
        this.gameService.addPlayer(player);
        this.broadcastGameState();
      });

      socket.on('leaveGame', (playerId: string) => {
        this.gameService.removePlayer(playerId);
        this.broadcastGameState();
      });

      socket.on('startGame', () => {
        try {
          this.gameService.startGame();
          this.broadcastGameState();
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to start game');
        }
      });

      socket.on('placeBet', ({ playerId, amount }: { playerId: string; amount: number }) => {
        try {
          this.gameService.placeBet(playerId, amount);
          const gameState = this.gameService.getGameState();
          const event = gameState.currentBet === amount ? 'playerCalled' : 'playerRaised';
          this.io.emit(event, { playerId, amount });
          this.broadcastGameState();
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to place bet');
        }
      });

      socket.on('fold', (playerId: string) => {
        try {
          this.gameService.fold(playerId);
          this.io.emit('playerFolded', { playerId });
          this.broadcastGameState();
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to fold');
        }
      });

      socket.on('playerAway', (playerId: string) => {
        try {
          this.gameService.updatePlayerStatus(playerId, true);
          this.broadcastGameState();
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to update player status');
        }
      });

      socket.on('playerBack', (playerId: string) => {
        try {
          this.gameService.updatePlayerStatus(playerId, false);
          this.broadcastGameState();
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to update player status');
        }
      });

      socket.on('chat:message', ({ gameId, message }: { gameId: string, message: ChatMessage }) => {
        this.handleChatMessage(socket, gameId, message);
      });

      socket.on('chat:getHistory', (gameId: string) => {
        this.handleGetChatHistory(socket, gameId);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id, 'reason:', socket.disconnect);
      });
    });
  }

  private broadcastGameState(): void {
    const gameState = this.gameService.getGameState();
    this.io.emit('gameStateUpdate', gameState);
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
} 
} 