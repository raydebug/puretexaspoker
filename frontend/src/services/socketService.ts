import { io, Socket } from 'socket.io-client';
import { GameState, Player } from '../types/game';

class SocketService {
  private socket: Socket | null = null;
  private gameState: GameState | null = null;
  private currentPlayer: Player | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io('http://localhost:3001');
      this.setupListeners();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinGame(nickname: string, seatNumber: number) {
    if (this.socket) {
      this.socket.emit('joinGame', { nickname, seatNumber });
    }
  }

  placeBet(gameId: string, playerId: string, amount: number) {
    if (this.socket) {
      this.socket.emit('placeBet', { gameId, playerId, amount });
    }
  }

  check(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit('check', { gameId, playerId });
    }
  }

  fold(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit('fold', { gameId, playerId });
    }
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('gameState', (state: GameState) => {
      this.gameState = state;
      // Update current player if it exists in the game state
      if (this.currentPlayer) {
        const updatedPlayer = state.players.find(p => p.id === this.currentPlayer?.id);
        if (updatedPlayer) {
          this.currentPlayer = updatedPlayer;
        }
      }
    });

    this.socket.on('playerJoined', (player: Player) => {
      if (this.gameState) {
        this.gameState.players.push(player);
      }
    });

    this.socket.on('playerLeft', (playerId: string) => {
      if (this.gameState) {
        this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
      }
    });

    this.socket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  getCurrentPlayer(): Player | null {
    return this.currentPlayer;
  }

  setCurrentPlayer(player: Player) {
    this.currentPlayer = player;
  }
}

export const socketService = new SocketService(); 