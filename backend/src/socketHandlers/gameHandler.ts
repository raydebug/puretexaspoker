import { Server, Socket } from 'socket.io';
import { gameManager } from '../services/gameManager';
import { errorTrackingService } from '../services/errorTrackingService';

export function registerGameHandlers(io: Server) {
  // Set up the GameManager to use this Socket.io server
  gameManager.setSocketServer(io);

  const handleGameError = (socket: Socket, error: Error, context: string) => {
    const errorDetails = errorTrackingService.trackError(error, `game:${context}`, {
      socketId: socket.id
    });

    // Send specific error message to the client
    socket.emit('gameError', {
      message: error.message,
      context: `game:${context}`,
      severity: errorDetails.severity
    });
  };

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected to game handler: ${socket.id}`);

    // Join a specific game room
    socket.on('game:join', async ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }
        
        // Join the game room
        gameManager.joinGameRoom(gameId, socket.id);
        console.log(`Socket ${socket.id} joined game room: ${gameId}`);
        
        socket.emit('game:joined', { gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'join');
      }
    });

    // Leave a game room
    socket.on('game:leave', ({ gameId }) => {
      try {
        if (gameId) {
          gameManager.leaveGameRoom(gameId, socket.id);
          console.log(`Socket ${socket.id} left game room: ${gameId}`);
        }
      } catch (error) {
        handleGameError(socket, error as Error, 'leave');
      }
    });

    // Create a new game
    socket.on('game:create', async ({ tableId }) => {
      try {
        if (!tableId) {
          throw new Error('Table ID is required');
        }

        const gameState = await gameManager.createGame(tableId);
        socket.emit('game:created', gameState);
      } catch (error) {
        handleGameError(socket, error as Error, 'create');
      }
    });

    // Start a game
    socket.on('game:start', async ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const gameState = await gameManager.startGame(gameId);
        // The GameManager will emit the real-time updates automatically
        socket.emit('game:actionSuccess', { action: 'start', gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'start');
      }
    });

    // Place a bet
    socket.on('game:bet', async ({ gameId, playerId, amount }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Game ID and Player ID are required');
        }
        if (typeof amount !== 'number' || amount <= 0) {
          throw new Error('Invalid bet amount');
        }

        const gameState = await gameManager.placeBet(gameId, playerId, amount);
        socket.emit('game:actionSuccess', { action: 'bet', gameId, amount });
      } catch (error) {
        handleGameError(socket, error as Error, 'bet');
      }
    });

    // Call
    socket.on('game:call', async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Game ID and Player ID are required');
        }

        const gameState = await gameManager.call(gameId, playerId);
        socket.emit('game:actionSuccess', { action: 'call', gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'call');
      }
    });

    // Check
    socket.on('game:check', async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Game ID and Player ID are required');
        }

        const gameState = await gameManager.check(gameId, playerId);
        socket.emit('game:actionSuccess', { action: 'check', gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'check');
      }
    });

    // Fold
    socket.on('game:fold', async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Game ID and Player ID are required');
        }

        const gameState = await gameManager.fold(gameId, playerId);
        socket.emit('game:actionSuccess', { action: 'fold', gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'fold');
      }
    });

    // Deal community cards
    socket.on('game:dealCommunityCards', async ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const gameState = await gameManager.dealCommunityCards(gameId);
        socket.emit('game:actionSuccess', { action: 'dealCommunityCards', gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'dealCommunityCards');
      }
    });

    // Get current game state
    socket.on('game:getState', ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const gameState = gameManager.getGameState(gameId);
        if (gameState) {
          socket.emit('gameState', gameState);
        } else {
          socket.emit('gameError', { 
            message: 'Game not found',
            context: 'game:getState'
          });
        }
      } catch (error) {
        handleGameError(socket, error as Error, 'getState');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Game client disconnected: ${socket.id}`);
      // Socket rooms are automatically cleaned up on disconnect
    });
  });
} 