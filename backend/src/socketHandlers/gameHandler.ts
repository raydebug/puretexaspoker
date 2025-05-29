import { Server, Socket } from 'socket.io';
import { GameService } from '../services/gameService';
import { errorTrackingService } from '../services/errorTrackingService';

export function registerGameHandlers(io: Server) {
  const gameService = new GameService();

  const broadcastGameState = () => {
    io.emit('gameState', gameService.getGameState());
  };

  const handleGameError = (socket: Socket, error: Error, context: string) => {
    const errorDetails = errorTrackingService.trackError(error, `game:${context}`, {
      socketId: socket.id,
      gameState: gameService.getGameState()
    });

    // Send specific error message to the client
    socket.emit('gameError', {
      message: error.message,
      context: `game:${context}`,
      severity: errorDetails.severity
    });
  };

  io.on('connection', (socket: Socket) => {
    socket.on('game:start', () => {
      try {
        gameService.startGame();
        broadcastGameState();
      } catch (error) {
        handleGameError(socket, error as Error, 'start');
      }
    });

    socket.on('game:bet', ({ playerId, amount }) => {
      try {
        if (typeof amount !== 'number' || amount <= 0) {
          throw new Error('Invalid bet amount');
        }
        gameService.placeBet(playerId, amount);
        broadcastGameState();
      } catch (error) {
        handleGameError(socket, error as Error, 'bet');
      }
    });

    socket.on('game:fold', ({ playerId }) => {
      try {
        if (!playerId) {
          throw new Error('Player ID is required');
        }
        gameService.fold(playerId);
        broadcastGameState();
      } catch (error) {
        handleGameError(socket, error as Error, 'fold');
      }
    });

    socket.on('game:check', ({ playerId }) => {
      try {
        if (!playerId) {
          throw new Error('Player ID is required');
        }
        gameService.check(playerId);
        broadcastGameState();
      } catch (error) {
        handleGameError(socket, error as Error, 'check');
      }
    });

    // Send initial game state
    socket.emit('gameState', gameService.getGameState());
  });
} 