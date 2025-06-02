import { Server, Socket } from 'socket.io';
import { GameService } from './gameService';
import { Player } from '../types/shared';

export class WebSocketService {
  private io: Server;
  private gameService: GameService;

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });
    this.gameService = new GameService();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      socket.on('joinGame', (player: Player) => {
        this.gameService.addPlayer(player);
        this.io.emit('gameState', this.gameService.getGameState());
      });

      socket.on('leaveGame', (playerId: string) => {
        this.gameService.removePlayer(playerId);
        this.io.emit('gameState', this.gameService.getGameState());
      });

      socket.on('startGame', () => {
        try {
          this.gameService.startGame();
          this.io.emit('gameState', this.gameService.getGameState());
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to start game');
        }
      });

      socket.on('placeBet', ({ playerId, amount }: { playerId: string; amount: number }) => {
        try {
          const player = this.gameService.getPlayer(playerId);
          if (!player) {
            throw new Error('Player not found');
          }
          this.gameService.placeBet(playerId, amount);
          const gameState = this.gameService.getGameState();
          this.io.emit('gameState', gameState);
          const event = gameState.currentBet === amount ? 'playerCalled' : 'playerRaised';
          this.io.emit(event, { playerId, amount });
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to place bet');
        }
      });

      socket.on('fold', (playerId: string) => {
        try {
          const player = this.gameService.getPlayer(playerId);
          if (!player) {
            throw new Error('Player not found');
          }
          this.gameService.fold(playerId);
          this.io.emit('gameState', this.gameService.getGameState());
          this.io.emit('playerFolded', { playerId });
        } catch (error: any) {
          socket.emit('error', error.message || 'Failed to fold');
        }
      });

      socket.on('playerAway', (playerId: string) => {
        this.gameService.updatePlayerStatus(playerId, true);
        this.io.emit('gameState', this.gameService.getGameState());
      });

      socket.on('playerBack', (playerId: string) => {
        this.gameService.updatePlayerStatus(playerId, false);
        this.io.emit('gameState', this.gameService.getGameState());
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id, 'reason:', socket.disconnect);
      });
    });
  }
} 