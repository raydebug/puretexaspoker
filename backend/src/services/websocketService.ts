import { Server, Socket } from 'socket.io';
import { GameService } from './gameService';
import { Player } from '../types/shared';
import { errorTrackingService } from './errorTrackingService';
import { createChatService } from './chatService';

export class WebSocketService {
  private io: Server;
  private gameService: GameService;
  private chatService: any;

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });
    this.gameService = new GameService('websocket-game-id');
    this.chatService = createChatService(this.io);
    this.setupSocketHandlers();
  }

  private handleSocketError = (socket: Socket, error: Error, event: string, data?: any) => {
    const errorDetails = errorTrackingService.trackError(error, `websocket:${event}`, {
      socketId: socket.id,
      eventData: data
    });

    // Send structured error response to client
    socket.emit('error', {
      message: error.message,
      event,
      severity: errorDetails.severity,
      timestamp: Date.now(),
      retryable: this.isRetryableError(error)
    });

    console.error(`Socket event error [${event}]:`, error.message, {
      socketId: socket.id,
      data
    });
  };

  private isRetryableError = (error: Error): boolean => {
    // Determine if error is retryable based on error type
    const retryableMessages = [
      'Network error',
      'Connection timeout',
      'Temporary service unavailable',
      'Rate limit exceeded'
    ];
    
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  };

  private validateInput = (data: any, requiredFields: string[]): void => {
    if (!data) {
      throw new Error('Request data is required');
    }

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }
  };

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      // Enhanced connection tracking
      socket.data.connectedAt = Date.now();
      socket.data.events = [];

      socket.on('joinGame', (player: Player) => {
        try {
          this.validateInput(player, ['id', 'name']);
          
          if (!player.chips || player.chips < 0) {
            throw new Error('Invalid chip amount');
          }

          this.gameService.addPlayer(player);
          this.io.emit('gameState', this.gameService.getGameState());
          
          // Notify chat service of player joining
          this.chatService.notifyGameEvent('default', 'playerJoined', player.name);
          
          socket.data.events.push({ type: 'joinGame', timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'joinGame', player);
        }
      });

      socket.on('leaveGame', (playerId: string) => {
        try {
          this.validateInput({ playerId }, ['playerId']);
          
          const player = this.gameService.getPlayer(playerId);
          const playerName = player?.name;
          
          this.gameService.removePlayer(playerId);
          this.io.emit('gameState', this.gameService.getGameState());
          
          // Notify chat service of player leaving
          if (playerName) {
            this.chatService.notifyGameEvent('default', 'playerLeft', playerName);
          }
          
          socket.data.events.push({ type: 'leaveGame', timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'leaveGame', { playerId });
        }
      });

      socket.on('startGame', () => {
        try {
          this.gameService.startGame();
          this.io.emit('gameState', this.gameService.getGameState());
          
          // Notify chat service of game starting
          this.chatService.notifyGameEvent('default', 'gameStarted');
          
          socket.data.events.push({ type: 'startGame', timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'startGame');
        }
      });

      socket.on('placeBet', ({ playerId, amount }: { playerId: string; amount: number }) => {
        try {
          this.validateInput({ playerId, amount }, ['playerId', 'amount']);
          
          if (typeof amount !== 'number' || amount <= 0) {
            throw new Error('Bet amount must be a positive number');
          }

          const player = this.gameService.getPlayer(playerId);
          if (!player) {
            throw new Error('Player not found');
          }

          if (player.chips < amount) {
            throw new Error('Insufficient chips');
          }

          this.gameService.placeBet(playerId, amount);
          const gameState = this.gameService.getGameState();
          this.io.emit('gameState', gameState);
          
          const event = gameState.currentBet === amount ? 'playerCalled' : 'playerRaised';
          this.io.emit(event, { playerId, amount });
          
          // Notify chat service of betting action
          const actionType = gameState.currentBet === amount ? 'playerCalled' : 'playerRaised';
          this.chatService.notifyGameEvent('default', actionType, player.name);
          
          socket.data.events.push({ type: 'placeBet', timestamp: Date.now(), amount });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'placeBet', { playerId, amount });
        }
      });

      socket.on('fold', (playerId: string) => {
        try {
          this.validateInput({ playerId }, ['playerId']);
          
          const player = this.gameService.getPlayer(playerId);
          if (!player) {
            throw new Error('Player not found');
          }

          this.gameService.fold(playerId);
          this.io.emit('gameState', this.gameService.getGameState());
          this.io.emit('playerFolded', { playerId });
          
          // Notify chat service of fold action
          this.chatService.notifyGameEvent('default', 'playerFolded', player.name);
          
          socket.data.events.push({ type: 'fold', timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'fold', { playerId });
        }
      });

      socket.on('playerAway', (playerId: string) => {
        try {
          this.validateInput({ playerId }, ['playerId']);
          
          const player = this.gameService.getPlayer(playerId);
          if (!player) {
            throw new Error('Player not found');
          }

          this.gameService.updatePlayerStatus(playerId, true);
          this.io.emit('gameState', this.gameService.getGameState());
          
          // Notify chat service of player going away
          this.chatService.notifyGameEvent('default', 'playerWentAway', player.name);
          
          socket.data.events.push({ type: 'playerAway', timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'playerAway', { playerId });
        }
      });

      socket.on('playerBack', (playerId: string) => {
        try {
          this.validateInput({ playerId }, ['playerId']);
          
          const player = this.gameService.getPlayer(playerId);
          if (!player) {
            throw new Error('Player not found');
          }

          this.gameService.updatePlayerStatus(playerId, false);
          this.io.emit('gameState', this.gameService.getGameState());
          
          // Notify chat service of player coming back
          this.chatService.notifyGameEvent('default', 'playerCameBack', player.name);
          
          socket.data.events.push({ type: 'playerBack', timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'playerBack', { playerId });
        }
      });

      // Enhanced chat message handling
      socket.on('chat:message', ({ gameId, message }) => {
        try {
          this.validateInput({ gameId, message }, ['gameId', 'message']);
          this.validateInput(message, ['id', 'sender', 'text']);
          
          if (message.text.length > 500) {
            throw new Error('Message too long (max 500 characters)');
          }

          // Basic profanity filter (can be enhanced)
          const profanityWords = ['spam', 'scam']; // Add more as needed
          const containsProfanity = profanityWords.some(word => 
            message.text.toLowerCase().includes(word.toLowerCase())
          );
          
          if (containsProfanity) {
            throw new Error('Message contains inappropriate content');
          }

          this.chatService.sendMessage(gameId, message);
          
          socket.data.events.push({ type: 'chat:message', timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'chat:message', { gameId, message });
        }
      });

      // Handle connection errors
      socket.on('error', (error: Error) => {
        console.error('Socket error from client:', error);
        errorTrackingService.trackError(error, 'websocket:client_error', {
          socketId: socket.id
        });
      });

      socket.on('disconnect', (reason: string) => {
        try {
          console.log('Client disconnected:', socket.id, 'reason:', reason);
          
          // Track disconnect reason for monitoring
          errorTrackingService.trackError(`Socket disconnected: ${reason}`, 'websocket:disconnect', {
            socketId: socket.id,
            reason,
            connectedDuration: socket.data.connectedAt ? Date.now() - socket.data.connectedAt : 0,
            eventCount: socket.data.events ? socket.data.events.length : 0
          });

          // Clean up any game state if needed
          const gameState = this.gameService.getGameState();
          if (gameState && gameState.players) {
            const playerToRemove = gameState.players.find(p => p.id === socket.id);
            if (playerToRemove) {
              this.gameService.removePlayer(socket.id);
              this.io.emit('gameState', this.gameService.getGameState());
              this.chatService.notifyGameEvent('default', 'playerLeft', playerToRemove.name);
            }
          }
        } catch (error: any) {
          // Don't emit errors on disconnect as socket is already closed
          console.error('Error during disconnect cleanup:', error.message);
        }
      });

      // Health check endpoint
      socket.on('ping', () => {
        try {
          socket.emit('pong', { timestamp: Date.now() });
        } catch (error: any) {
          this.handleSocketError(socket, error, 'ping');
        }
      });
    });

    // Global error handling for the io server
    this.io.engine.on('connection_error', (err) => {
      console.error('Socket.io connection error:', err);
      errorTrackingService.trackError(err, 'websocket:connection_error');
    });
  }
} 