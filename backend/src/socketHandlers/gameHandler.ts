import { Server, Socket } from 'socket.io';
// import { gameManager } from '../services/gameManager'; // gameManager service doesn't exist
import { errorTrackingService } from '../services/errorTrackingService';

export function registerGameHandlers(io: Server) {
  return; // Disabled - gameManager service doesn't exist
  /*
  // Entire function body commented out due to missing gameManager service
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

    // Get seat information
    socket.on('game:getSeats', ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const game = gameManager.getGame(gameId);
        if (!game) {
          throw new Error('Game not found');
        }

        const seats = game.getAllSeats();
        socket.emit('game:seatInfo', { gameId, seats });
      } catch (error) {
        handleGameError(socket, error as Error, 'getSeats');
      }
    });

    // Reserve a seat
    socket.on('game:reserveSeat', ({ gameId, seatNumber, playerId, durationMinutes }) => {
      try {
        if (!gameId || !seatNumber || !playerId) {
          throw new Error('Game ID, seat number, and player ID are required');
        }

        const game = gameManager.getGame(gameId);
        if (!game) {
          throw new Error('Game not found');
        }

        const result = game.getSeatManager().reserveSeat(
          seatNumber,
          playerId,
          durationMinutes || 5
        );

        if (result.success) {
          socket.emit('game:seatReserved', { gameId, seatNumber, playerId });
          // Broadcast updated seat info to all clients in the game room
          const seats = game.getAllSeats();
          io.to(`game:${gameId}`).emit('game:seatInfo', { gameId, seats });
        } else {
          socket.emit('gameError', { message: result.error, context: 'game:reserveSeat' });
        }
      } catch (error) {
        handleGameError(socket, error as Error, 'reserveSeat');
      }
    });

    // Get turn order
    socket.on('game:getTurnOrder', ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const game = gameManager.getGame(gameId);
        if (!game) {
          throw new Error('Game not found');
        }

        const gameState = game.getGameState();
        const turnOrder = game.getSeatManager().calculateTurnOrder(gameState.players);
        
        socket.emit('game:turnOrder', {
          gameId,
          turnOrder,
          currentPlayerId: gameState.currentPlayerId,
          dealerPosition: gameState.dealerPosition
        });
      } catch (error) {
        handleGameError(socket, error as Error, 'getTurnOrder');
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

    // Raise
    socket.on('game:raise', async ({ gameId, playerId, totalAmount }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Game ID and Player ID are required');
        }
        if (typeof totalAmount !== 'number' || totalAmount <= 0) {
          throw new Error('Invalid raise amount');
        }

        const gameState = await gameManager.raise(gameId, playerId, totalAmount);
        socket.emit('game:actionSuccess', { action: 'raise', gameId, totalAmount });
      } catch (error) {
        handleGameError(socket, error as Error, 'raise');
      }
    });

    // Get phase information
    socket.on('game:getPhaseInfo', async ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const phaseInfo = await gameManager.getPhaseInfo(gameId);
        socket.emit('game:phaseInfo', { gameId, phaseInfo });
      } catch (error) {
        handleGameError(socket, error as Error, 'getPhaseInfo');
      }
    });

    // Start new hand
    socket.on('game:startNewHand', async ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const gameState = await gameManager.startNewHand(gameId);
        socket.emit('game:actionSuccess', { action: 'startNewHand', gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'startNewHand');
      }
    });

    // Backwards compatibility handler for generic game:action event
    socket.on('game:action', async ({ gameId, playerId, action, amount, totalAmount }) => {
      console.log('DEBUG: Received generic game:action event:', { gameId, playerId, action, amount, totalAmount });
      
      try {
        // Route to specific handlers based on action type
        switch (action) {
          case 'bet':
            if (!amount) throw new Error('Amount required for bet action');
            await gameManager.placeBet(gameId, playerId, amount);
            socket.emit('game:actionSuccess', { action: 'bet', gameId, amount });
            break;
          case 'call':
            await gameManager.call(gameId, playerId);
            socket.emit('game:actionSuccess', { action: 'call', gameId });
            break;
          case 'check':
            await gameManager.check(gameId, playerId);
            socket.emit('game:actionSuccess', { action: 'check', gameId });
            break;
          case 'fold':
            await gameManager.fold(gameId, playerId);
            socket.emit('game:actionSuccess', { action: 'fold', gameId });
            break;
          case 'raise':
            const raiseAmount = totalAmount || amount;
            if (!raiseAmount) throw new Error('Amount required for raise action');
            await gameManager.raise(gameId, playerId, raiseAmount);
            socket.emit('game:actionSuccess', { action: 'raise', gameId, totalAmount: raiseAmount });
            break;
          default:
            throw new Error(`Unknown action type: ${action}`);
        }
      } catch (error) {
        handleGameError(socket, error as Error, `action:${action}`);
      }
    });

    // Force complete phase (testing/admin feature)
    socket.on('game:forceCompletePhase', async ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const gameState = await gameManager.forceCompletePhase(gameId);
        socket.emit('game:actionSuccess', { action: 'forceCompletePhase', gameId });
      } catch (error) {
        handleGameError(socket, error as Error, 'forceCompletePhase');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Game client disconnected: ${socket.id}`);
      // Socket rooms are automatically cleaned up on disconnect
    });
  });
  */
} 