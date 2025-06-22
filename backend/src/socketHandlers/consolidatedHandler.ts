import { Server, Socket } from 'socket.io';
import { gameManager } from '../services/gameManager';
import { tableManager } from '../services/TableManager';
import { locationManager } from '../services/LocationManager';
import { prisma } from '../db';
import { Player, GameState } from '../types/shared';

/**
 * Consolidated WebSocket Handler
 * Single entry point for all socket events with gameManager as source of truth
 * This replaces the fragmented handler system to eliminate conflicts and inconsistencies
 */

interface PlayerConnectionState {
  playerId: string;
  nickname: string;
  gameId: string;
  seatNumber: number;
  tableId: number;
  dbTableId: string;
  disconnectedAt: number;
  timeoutId: NodeJS.Timeout;
}

// Connection monitoring for disconnect/reconnect handling
const disconnectedPlayers = new Map<string, PlayerConnectionState>();
const DISCONNECT_TIMEOUT_MS = 5000; // 5 seconds

// Track authenticated users (both in lobby and at tables) - GLOBAL ACROSS ALL CONNECTIONS
const authenticatedUsers = new Map<string, { nickname: string; socketId: string; location: 'lobby' | number }>();

export function registerConsolidatedHandlers(io: Server) {
  // Global error handler with consistent format
  const handleError = (socket: Socket, error: Error, context: string, data?: any) => {
    console.error(`[${new Date().toISOString()}] Socket Error in ${context}:`, {
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
      context,
      data
    });
    
    // Standardized error response structure
    socket.emit('error', {
      message: error.message,
      context,
      timestamp: Date.now(),
      success: false
    });
  };

  // Professional Turn Order Enforcement
  const validateTurnOrder = (gameId: string, playerId: string, action: string): { isValid: boolean; error?: string } => {
    try {
      const gameService = gameManager.getGame(gameId);
      if (!gameService) {
        return { isValid: false, error: 'Game not found' };
      }

      const gameState = gameService.getGameState();
      
      // Check if game is in a playable state
      if (gameState.status !== 'playing') {
        return { isValid: false, error: `Cannot perform ${action}: game is not active (status: ${gameState.status})` };
      }

      // Check if it's a valid phase for actions
      if (gameState.phase === 'finished' || gameState.phase === 'showdown') {
        return { isValid: false, error: `Cannot perform ${action}: hand is ${gameState.phase}` };
      }

      // Get the player
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) {
        return { isValid: false, error: 'Player not found in game' };
      }

      // Check if player is active (not folded)
      if (!player.isActive) {
        return { isValid: false, error: `Cannot perform ${action}: you have folded and are no longer active in this hand` };
      }

      // Check if it's the player's turn (CRITICAL ENFORCEMENT)
      if (gameState.currentPlayerId !== playerId) {
        const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
        const currentPlayerName = currentPlayer ? currentPlayer.name : 'Unknown';
        
        return { 
          isValid: false, 
          error: `OUT OF TURN: It is currently ${currentPlayerName}'s turn to act. Please wait for your turn. (Attempted: ${action})` 
        };
      }

      // Additional action-specific validations
      if (action === 'check') {
        if (gameState.currentBet > player.currentBet) {
          return { 
            isValid: false, 
            error: `Cannot check: there is a bet of ${gameState.currentBet - player.currentBet} to call` 
          };
        }
      }

      if (action === 'call') {
        const callAmount = gameState.currentBet - player.currentBet;
        if (callAmount <= 0) {
          return { 
            isValid: false, 
            error: `Cannot call: no bet to call. Use check instead.` 
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Turn validation error: ${(error as Error).message}` 
      };
    }
  };

  // Broadcast tables update to all clients
  const broadcastTables = () => {
    const tables = tableManager.getAllTables();
    io.emit('tablesUpdate', tables);
  };

  // Broadcast online users count update to all connected clients
  const broadcastOnlineUsersUpdate = () => {
    const totalOnlineUsers = authenticatedUsers.size;
    console.log(`[CONSOLIDATED] Broadcasting online users update - Total: ${totalOnlineUsers}`);
    console.log(`[CONSOLIDATED] Current authenticated users:`, Array.from(authenticatedUsers.keys()));
    io.emit('onlineUsers:update', { total: totalOnlineUsers });
  };

  // Handle player reconnection
  const handlePlayerReconnection = (playerId: string, nickname: string, gameId: string) => {
    const connectionState = disconnectedPlayers.get(playerId);
    if (connectionState) {
      console.log(`[CONSOLIDATED] Player ${nickname} reconnected, canceling timeout`);
      clearTimeout(connectionState.timeoutId);
      disconnectedPlayers.delete(playerId);
      
      // Notify other players of reconnection
      io.to(`game:${gameId}`).emit('player:reconnected', {
        playerId,
        nickname
      });
    }
  };

  // Move disconnected player to observer after timeout
  const movePlayerToObserver = async (connectionState: PlayerConnectionState) => {
    try {
      console.log(`[CONSOLIDATED] Moving disconnected player ${connectionState.nickname} to observers after timeout`);
      
      const gameService = gameManager.getGame(connectionState.gameId);
      if (!gameService) {
        console.log(`[CONSOLIDATED] Game service not found for gameId: ${connectionState.gameId}`);
        return;
      }

      // Remove player from their seat in game service (gameManager is source of truth)
      gameService.removePlayer(connectionState.playerId);

      // Remove from database seat assignment
      await prisma.playerTable.deleteMany({
        where: {
          playerId: connectionState.playerId,
          tableId: connectionState.dbTableId
        }
      });

      // Update user location from seat to observer
      await locationManager.moveToTableObserver(
        connectionState.playerId,
        connectionState.nickname,
        connectionState.tableId
      );

      // Get updated game state from gameManager (source of truth)
      const gameState = gameService.getGameState();

      // Emit updates to all clients in game room
      io.to(`game:${connectionState.gameId}`).emit('location:updated', {
        playerId: connectionState.playerId,
        nickname: connectionState.nickname,
        table: connectionState.tableId,
        seat: null
      });

      io.to(`game:${connectionState.gameId}`).emit('player:removedFromSeat', {
        playerId: connectionState.playerId,
        nickname: connectionState.nickname,
        seatNumber: connectionState.seatNumber,
        reason: 'Disconnected for more than 5 seconds'
      });

      io.to(`game:${connectionState.gameId}`).emit('gameState', gameState);

    } catch (error) {
      console.error('[CONSOLIDATED] Error moving player to observer:', error);
    }
  };

  io.on('connection', (socket: Socket) => {
    console.log(`[CONSOLIDATED] Client connected: ${socket.id}`);
    console.log(`[CONSOLIDATED] Current authenticated users: ${authenticatedUsers.size}`);

    // === ROOM HANDLERS ===
    
    socket.on('joinRoom', (roomName: string) => {
      try {
        console.log(`[CONSOLIDATED] Client ${socket.id} joining room: ${roomName}`);
        socket.join(roomName);
        socket.emit('roomJoined', { room: roomName });
      } catch (error) {
        console.error(`[CONSOLIDATED] Error joining room ${roomName}:`, error);
        handleError(socket, error as Error, 'joinRoom', { roomName });
      }
    });

    socket.on('leaveRoom', (roomName: string) => {
      try {
        console.log(`[CONSOLIDATED] Client ${socket.id} leaving room: ${roomName}`);
        socket.leave(roomName);
        socket.emit('roomLeft', { room: roomName });
      } catch (error) {
        console.error(`[CONSOLIDATED] Error leaving room ${roomName}:`, error);
        handleError(socket, error as Error, 'leaveRoom', { roomName });
      }
    });

    // === LOBBY HANDLERS ===
    
    socket.on('getLobbyTables', () => {
      try {
        console.log('[CONSOLIDATED] getLobbyTables request received');
        const tables = tableManager.getAllTables();
        console.log(`[CONSOLIDATED] Sending ${tables.length} tables to client`);
        socket.emit('tablesUpdate', tables);
      } catch (error) {
        handleError(socket, error as Error, 'getLobbyTables');
      }
    });

    socket.on('userLogin', async ({ nickname }) => {
      try {
        if (!nickname || typeof nickname !== 'string') {
          throw new Error('Invalid nickname');
        }

        console.log(`[CONSOLIDATED] User login event - ${nickname} (socket: ${socket.id})`);
        console.log(`[CONSOLIDATED] Authenticated users before login:`, Array.from(authenticatedUsers.keys()));
        
        // Remove any existing entry for this socket (in case of re-login)
        for (const [key, user] of authenticatedUsers.entries()) {
          if (user.socketId === socket.id) {
            authenticatedUsers.delete(key);
            console.log(`[CONSOLIDATED] Removed existing entry for socket ${socket.id}`);
            break;
          }
        }
        
        // Add or update user in authenticated users map
        authenticatedUsers.set(nickname, {
          nickname,
          socketId: socket.id,
          location: 'lobby'
        });
        
        console.log(`[CONSOLIDATED] Added authenticated user ${nickname} to lobby tracking`);
        console.log(`[CONSOLIDATED] Authenticated users after login:`, Array.from(authenticatedUsers.keys()));

        // Create or update player record
        await prisma.player.upsert({
          where: { id: socket.id },
          update: { nickname },
          create: { id: socket.id, nickname, chips: 1000 }
        });

        // Move to lobby
        await locationManager.moveToLobby(socket.id, nickname);

        socket.emit('loginSuccess', { playerId: socket.id, nickname });
        broadcastTables();
        broadcastOnlineUsersUpdate();
      } catch (error) {
        handleError(socket, error as Error, 'userLogin', { nickname });
      }
    });

    socket.on('userLogout', async () => {
      try {
        console.log(`[CONSOLIDATED] User logout event (socket: ${socket.id})`);
        
        // Remove user from authenticated users map
        for (const [key, user] of authenticatedUsers.entries()) {
          if (user.socketId === socket.id) {
            authenticatedUsers.delete(key);
            console.log(`[CONSOLIDATED] Removed authenticated user ${user.nickname} from tracking`);
            break;
          }
        }

        await locationManager.removeUser(socket.id);
        broadcastTables();
        broadcastOnlineUsersUpdate();
      } catch (error) {
        handleError(socket, error as Error, 'userLogout');
      }
    });

    socket.on('joinTable', async ({ tableId, buyIn, nickname }) => {
      try {
        console.log(`[CONSOLIDATED] Join table request: tableId=${tableId}, buyIn=${buyIn}, nickname=${nickname}`);
        
        if (!tableId || !nickname) {
          throw new Error('Table ID and nickname are required');
        }

        // Get table info
        const lobbyTable = tableManager.getTable(tableId);
        if (!lobbyTable) {
          throw new Error('Table not found');
        }

        // Create/update player
        await prisma.player.upsert({
          where: { id: socket.id },
          update: { nickname },
          create: { id: socket.id, nickname, chips: 1000 }
        });

        // Move to table as observer
        await locationManager.moveToTableObserver(socket.id, nickname, tableId);

        // Update authenticated user location if they're tracked
        if (authenticatedUsers.has(nickname)) {
          const user = authenticatedUsers.get(nickname)!;
          user.location = tableId;
          authenticatedUsers.set(nickname, user);
          console.log(`[CONSOLIDATED] Updated authenticated user ${nickname} location to table ${tableId}`);
        }

        // Create or find database table
        const dbTableName = `${lobbyTable.name} (ID: ${tableId})`;
        let dbTable = await prisma.table.findFirst({
          where: { name: dbTableName }
        });

        if (!dbTable) {
          dbTable = await prisma.table.create({
            data: {
              name: dbTableName,
              maxPlayers: lobbyTable.maxPlayers,
              smallBlind: lobbyTable.smallBlind,
              bigBlind: lobbyTable.bigBlind,
              minBuyIn: lobbyTable.minBuyIn,
              maxBuyIn: lobbyTable.maxBuyIn
            }
          });
        }

        // Find or create game (gameManager is source of truth)
        let existingGame = await prisma.game.findFirst({
          where: {
            tableId: dbTable.id,
            status: { in: ['waiting', 'active'] }
          }
        });

        let gameId: string;
        if (!existingGame) {
          const gameState = await gameManager.createGame(dbTable.id);
          gameId = gameState.id!;
        } else {
          gameId = existingGame.id;
          
          // Ensure GameService exists in memory
          let gameService = gameManager.getGame(gameId);
          if (!gameService) {
            const gameState = await gameManager.createGame(dbTable.id);
            gameId = gameState.id!;
          }
        }

        const gameService = gameManager.getGame(gameId);
        if (!gameService) {
          throw new Error('Failed to initialize game service');
        }

        // Store session data for potential seat taking
        socket.data.buyIn = buyIn || 200;
        socket.data.gameId = gameId;
        socket.data.tableId = tableId;
        socket.data.dbTableId = dbTable.id;
        socket.data.nickname = nickname;
        socket.data.playerId = socket.id;

        // Join game room
        socket.join(`game:${gameId}`);
        gameManager.joinGameRoom(gameId, socket.id);

        // Handle reconnection
        handlePlayerReconnection(socket.id, nickname, gameId);

        // Get current game state from gameManager (source of truth)
        const gameState = gameService.getGameState();

        // Emit success events
        socket.emit('tableJoined', { tableId, role: 'observer', buyIn: buyIn || 0, gameId });
        socket.emit('gameJoined', { gameId, playerId: socket.id, gameState });

        // Emit location update
        io.to(`game:${gameId}`).emit('location:updated', {
          playerId: socket.id,
          nickname,
          table: tableId,
          seat: null
        });

        console.log(`[CONSOLIDATED] Successfully joined ${nickname} as observer to game ${gameId}`);
        
      } catch (error) {
        handleError(socket, error as Error, 'joinTable', { tableId, buyIn, nickname });
        socket.emit('tableError', (error as Error).message);
      }
    });

    socket.on('takeSeat', async ({ seatNumber, buyIn }) => {
      try {
        console.log(`[CONSOLIDATED] Take seat request: seatNumber=${seatNumber}, buyIn=${buyIn}`);
        
        // Validate session data
        const { gameId, tableId, dbTableId, nickname, playerId } = socket.data;
        console.log(`[CONSOLIDATED] Session data check:`, {
          gameId: !!gameId,
          tableId: !!tableId, 
          dbTableId: !!dbTableId,
          nickname: !!nickname,
          playerId: !!playerId,
          socketId: socket.id
        });
        
        if (!gameId || !tableId || !dbTableId || !nickname || !playerId) {
          console.log(`[CONSOLIDATED] Missing session data, attempting to recover...`);
          
          // Try to recover session data from authenticated users
          let recoveredNickname = null;
          for (const [nick, user] of authenticatedUsers.entries()) {
            if (user.socketId === socket.id) {
              recoveredNickname = nick;
              break;
            }
          }
          
          if (recoveredNickname) {
            console.log(`[CONSOLIDATED] Found authenticated user: ${recoveredNickname}, attempting session recovery`);
            
            // Try to find active table/game for this user
            const userLocation = await locationManager.getUserLocation(socket.id);
            if (userLocation && userLocation.table) {
              // Reconstruct session data
              const lobbyTable = tableManager.getTable(userLocation.table);
              if (lobbyTable) {
                // Find database table
                const dbTableName = `${lobbyTable.name} (ID: ${userLocation.table})`;
                const dbTable = await prisma.table.findFirst({
                  where: { name: dbTableName }
                });
                
                if (dbTable) {
                  // Find active game
                  const existingGame = await prisma.game.findFirst({
                    where: {
                      tableId: dbTable.id,
                      status: { in: ['waiting', 'active'] }
                    }
                  });
                  
                  if (existingGame) {
                    // Restore session data
                    socket.data.buyIn = buyIn || 200;
                    socket.data.gameId = existingGame.id;
                    socket.data.tableId = userLocation.table;
                    socket.data.dbTableId = dbTable.id;
                    socket.data.nickname = recoveredNickname;
                    socket.data.playerId = socket.id;
                    
                    console.log(`[CONSOLIDATED] Session data recovered successfully for ${recoveredNickname}`);
                  }
                }
              }
            }
          }
          
          // Final validation after recovery attempt
          const { gameId: finalGameId, tableId: finalTableId, dbTableId: finalDbTableId, nickname: finalNickname, playerId: finalPlayerId } = socket.data;
          if (!finalGameId || !finalTableId || !finalDbTableId || !finalNickname || !finalPlayerId) {
            throw new Error('Invalid session data. Please rejoin the table.');
          }
        }

        // Validate inputs
        if (!seatNumber || seatNumber < 1 || seatNumber > 9) {
          throw new Error('Invalid seat number. Must be between 1 and 9.');
        }

        // Get table for buy-in validation
        const lobbyTable = tableManager.getTable(socket.data.tableId);
        if (!lobbyTable) {
          throw new Error('Table not found');
        }

        if (!buyIn || buyIn < lobbyTable.minBuyIn || buyIn > lobbyTable.maxBuyIn) {
          throw new Error(`Buy-in must be between ${lobbyTable.minBuyIn} and ${lobbyTable.maxBuyIn}`);
        }

        // Check seat availability - but ignore if it's the same player
        const existingPlayerTable = await prisma.playerTable.findFirst({
          where: { tableId: socket.data.dbTableId, seatNumber }
        });

        if (existingPlayerTable && existingPlayerTable.playerId !== socket.data.playerId) {
          throw new Error(`Seat ${seatNumber} is already taken`);
        }

        // Clean up any existing seat for this player at this table
        await prisma.playerTable.deleteMany({
          where: { 
            playerId: socket.data.playerId,
            tableId: socket.data.dbTableId 
          }
        });

        // Get game service (gameManager is source of truth)
        const gameService = gameManager.getGame(socket.data.gameId);
        if (!gameService) {
          throw new Error('Game not found');
        }

        // Create player data
        const playerData = {
          id: socket.data.playerId,
          name: socket.data.nickname,
          chips: buyIn,
          isActive: true,
          isDealer: false,
          currentBet: 0,
          position: seatNumber,
          seatNumber: seatNumber,
          isAway: false,
          cards: [],
          avatar: {
            type: 'default' as const,
            color: '#007bff'
          }
        };

        // Add player to game (gameManager is source of truth)
        gameService.addPlayer(playerData);

        // Create database record
        await prisma.playerTable.create({
          data: {
            playerId: socket.data.playerId,
            tableId: socket.data.dbTableId,
            seatNumber,
            buyIn
          }
        });

        // Update session data
        socket.data.buyIn = buyIn;

        // Update location from observer to seated player
        await locationManager.moveToTableSeat(socket.id, socket.data.nickname, socket.data.tableId, seatNumber);

        // Handle reconnection
        handlePlayerReconnection(socket.data.playerId, socket.data.nickname, socket.data.gameId);

        // Get updated game state from gameManager (source of truth)
        let gameState = gameService.getGameState();

        // **AUTO-START LOGIC**: Check if game should start automatically
        if (gameState.status === 'waiting' && gameState.players.length >= 2) {
          try {
            console.log(`[CONSOLIDATED] Auto-starting game with ${gameState.players.length} players`);
            gameService.startGame();
            gameState = gameService.getGameState(); // Get updated state after start
            console.log(`[CONSOLIDATED] Game auto-started successfully - new phase: ${gameState.phase}`);
          } catch (startError) {
            console.error(`[CONSOLIDATED] Failed to auto-start game:`, startError);
            // Continue with seat assignment even if auto-start fails
          }
        }

        // Emit success events
        socket.emit('seatTaken', { seatNumber, playerId: socket.data.playerId, gameState });
        socket.emit('tableJoined', { tableId: socket.data.tableId, role: 'player', buyIn, gameId: socket.data.gameId });
        socket.emit('gameJoined', { gameId: socket.data.gameId, playerId: socket.data.playerId, gameState });

        // Broadcast updates
        io.to(`game:${socket.data.gameId}`).emit('gameState', gameState);
        io.to(`game:${socket.data.gameId}`).emit('location:updated', {
          playerId: socket.id,
          nickname: socket.data.nickname,
          table: socket.data.tableId,
          seat: seatNumber
        });

        console.log(`[CONSOLIDATED] Successfully seated ${socket.data.nickname} at seat ${seatNumber}`);
        
      } catch (error) {
        handleError(socket, error as Error, 'takeSeat', { seatNumber, buyIn });
        socket.emit('seatError', (error as Error).message);
      }
    });

    // === GAME ACTION HANDLERS === (gameManager is source of truth + Professional Turn Order Enforcement)
    
    socket.on('game:bet', async ({ gameId, playerId, amount }) => {
      try {
        if (!gameId || !playerId || typeof amount !== 'number' || amount <= 0) {
          throw new Error('Invalid bet parameters');
        }

        // PROFESSIONAL TURN ORDER ENFORCEMENT
        const turnValidation = validateTurnOrder(gameId, playerId, 'bet');
        if (!turnValidation.isValid) {
          socket.emit('game:turnOrderViolation', { 
            action: 'bet', 
            error: turnValidation.error,
            gameId,
            playerId,
            timestamp: Date.now()
          });
          return;
        }

        await gameManager.placeBet(gameId, playerId, amount);
        socket.emit('game:actionSuccess', { action: 'bet', gameId, amount });
      } catch (error) {
        handleError(socket, error as Error, 'game:bet', { gameId, playerId, amount });
      }
    });

    socket.on('game:call', async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Invalid call parameters');
        }

        // PROFESSIONAL TURN ORDER ENFORCEMENT
        const turnValidation = validateTurnOrder(gameId, playerId, 'call');
        if (!turnValidation.isValid) {
          socket.emit('game:turnOrderViolation', { 
            action: 'call', 
            error: turnValidation.error,
            gameId,
            playerId,
            timestamp: Date.now()
          });
          return;
        }

        await gameManager.call(gameId, playerId);
        socket.emit('game:actionSuccess', { action: 'call', gameId });
      } catch (error) {
        handleError(socket, error as Error, 'game:call', { gameId, playerId });
      }
    });

    socket.on('game:check', async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Invalid check parameters');
        }

        // PROFESSIONAL TURN ORDER ENFORCEMENT
        const turnValidation = validateTurnOrder(gameId, playerId, 'check');
        if (!turnValidation.isValid) {
          socket.emit('game:turnOrderViolation', { 
            action: 'check', 
            error: turnValidation.error,
            gameId,
            playerId,
            timestamp: Date.now()
          });
          return;
        }

        await gameManager.check(gameId, playerId);
        socket.emit('game:actionSuccess', { action: 'check', gameId });
      } catch (error) {
        handleError(socket, error as Error, 'game:check', { gameId, playerId });
      }
    });

    socket.on('game:fold', async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Invalid fold parameters');
        }

        // PROFESSIONAL TURN ORDER ENFORCEMENT
        const turnValidation = validateTurnOrder(gameId, playerId, 'fold');
        if (!turnValidation.isValid) {
          socket.emit('game:turnOrderViolation', { 
            action: 'fold', 
            error: turnValidation.error,
            gameId,
            playerId,
            timestamp: Date.now()
          });
          return;
        }

        await gameManager.fold(gameId, playerId);
        socket.emit('game:actionSuccess', { action: 'fold', gameId });
      } catch (error) {
        handleError(socket, error as Error, 'game:fold', { gameId, playerId });
      }
    });

    socket.on('game:raise', async ({ gameId, playerId, totalAmount }) => {
      try {
        if (!gameId || !playerId || typeof totalAmount !== 'number' || totalAmount <= 0) {
          throw new Error('Invalid raise parameters');
        }

        // PROFESSIONAL TURN ORDER ENFORCEMENT
        const turnValidation = validateTurnOrder(gameId, playerId, 'raise');
        if (!turnValidation.isValid) {
          socket.emit('game:turnOrderViolation', { 
            action: 'raise', 
            error: turnValidation.error,
            gameId,
            playerId,
            totalAmount,
            timestamp: Date.now()
          });
          return;
        }

        await gameManager.raise(gameId, playerId, totalAmount);
        socket.emit('game:actionSuccess', { action: 'raise', gameId, totalAmount });
      } catch (error) {
        handleError(socket, error as Error, 'game:raise', { gameId, playerId, totalAmount });
      }
    });

    socket.on('game:allIn', async ({ gameId, playerId }) => {
      try {
        if (!gameId || !playerId) {
          throw new Error('Invalid all-in parameters');
        }

        // PROFESSIONAL TURN ORDER ENFORCEMENT
        const turnValidation = validateTurnOrder(gameId, playerId, 'allIn');
        if (!turnValidation.isValid) {
          socket.emit('game:turnOrderViolation', { 
            action: 'allIn', 
            error: turnValidation.error,
            gameId,
            playerId,
            timestamp: Date.now()
          });
          return;
        }

        await gameManager.allIn(gameId, playerId);
        socket.emit('game:actionSuccess', { action: 'allIn', gameId });
      } catch (error) {
        handleError(socket, error as Error, 'game:allIn', { gameId, playerId });
      }
    });

    // Backwards compatibility for generic game:action (with Professional Turn Order Enforcement)
    socket.on('game:action', async ({ gameId, playerId, action, amount, totalAmount }) => {
      try {
        console.log(`[CONSOLIDATED] Generic game action: ${action}`);
        
        // PROFESSIONAL TURN ORDER ENFORCEMENT for all actions
        const turnValidation = validateTurnOrder(gameId, playerId, action);
        if (!turnValidation.isValid) {
          socket.emit('game:turnOrderViolation', { 
            action, 
            error: turnValidation.error,
            gameId,
            playerId,
            amount,
            totalAmount,
            timestamp: Date.now()
          });
          return;
        }
        
        switch (action) {
          case 'bet':
            if (!amount) throw new Error('Amount required for bet');
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
            if (!raiseAmount) throw new Error('Amount required for raise');
            await gameManager.raise(gameId, playerId, raiseAmount);
            socket.emit('game:actionSuccess', { action: 'raise', gameId, totalAmount: raiseAmount });
            break;
          case 'allIn':
            await gameManager.allIn(gameId, playerId);
            socket.emit('game:actionSuccess', { action: 'allIn', gameId });
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        handleError(socket, error as Error, `game:action:${action}`, { gameId, playerId, action, amount, totalAmount });
      }
    });

    // === GAME MANAGEMENT HANDLERS ===
    
    socket.on('game:getState', ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        const gameState = gameManager.getGameState(gameId);
        if (gameState) {
          socket.emit('gameState', gameState);
        } else {
          throw new Error('Game not found');
        }
      } catch (error) {
        handleError(socket, error as Error, 'game:getState', { gameId });
      }
    });

    socket.on('game:start', async ({ gameId }) => {
      try {
        if (!gameId) {
          throw new Error('Game ID is required');
        }

        await gameManager.startGame(gameId);
        socket.emit('game:actionSuccess', { action: 'start', gameId });
      } catch (error) {
        handleError(socket, error as Error, 'game:start', { gameId });
      }
    });

    // === DISCONNECT HANDLING ===
    
    socket.on('disconnect', async (reason) => {
      try {
        console.log(`[CONSOLIDATED] Client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Remove user from authenticated users tracking
        for (const [key, user] of authenticatedUsers.entries()) {
          if (user.socketId === socket.id) {
            authenticatedUsers.delete(key);
            console.log(`[CONSOLIDATED] Removed disconnected user ${user.nickname} from authenticated users tracking`);
            break;
          }
        }
        broadcastOnlineUsersUpdate();
        
        const { gameId, nickname, tableId, dbTableId } = socket.data;

        if (gameId && nickname && tableId && dbTableId) {
          // Check if player has a seat
          const playerTable = await prisma.playerTable.findFirst({
            where: {
              playerId: socket.id,
              tableId: dbTableId
            }
          });

          if (playerTable && playerTable.seatNumber !== null) {
            console.log(`[CONSOLIDATED] Seated player ${nickname} disconnected, starting timeout`);
            
            // Clear existing timeout
            const existingState = disconnectedPlayers.get(socket.id);
            if (existingState) {
              clearTimeout(existingState.timeoutId);
            }

            // Set up new timeout
            const timeoutId = setTimeout(() => {
              const connectionState = disconnectedPlayers.get(socket.id);
              if (connectionState) {
                movePlayerToObserver(connectionState);
              }
            }, DISCONNECT_TIMEOUT_MS);

            // Store connection state
            const connectionState: PlayerConnectionState = {
              playerId: socket.id,
              nickname,
              gameId,
              seatNumber: playerTable.seatNumber,
              tableId,
              dbTableId,
              disconnectedAt: Date.now(),
              timeoutId
            };

            disconnectedPlayers.set(socket.id, connectionState);

            // Notify other players
            io.to(`game:${gameId}`).emit('player:disconnected', {
              playerId: socket.id,
              nickname,
              timeoutSeconds: DISCONNECT_TIMEOUT_MS / 1000
            });
          } else {
            // Observer disconnect - clean up immediately
            await locationManager.removeUser(socket.id);
            if (gameId) {
              gameManager.leaveGameRoom(gameId, socket.id);
            }
          }
        }

        // Clean up table memberships
        const allTables = tableManager.getAllTables();
        for (const table of allTables) {
          tableManager.leaveTable(table.id, socket.id);
        }

        broadcastTables();
        
      } catch (error) {
        console.error('[CONSOLIDATED] Error during disconnect cleanup:', error);
      }
    });

    // Add ping handler for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Send initial state
    try {
      broadcastTables();
      // Send current online users count to the new connection
      const totalOnlineUsers = authenticatedUsers.size;
      socket.emit('onlineUsers:update', { total: totalOnlineUsers });
      console.log(`[CONSOLIDATED] Sent initial online users count to new connection: ${totalOnlineUsers}`);
      // Also broadcast to all to ensure consistency
      broadcastOnlineUsersUpdate();
    } catch (error) {
      console.error('[CONSOLIDATED] Error sending initial state:', error);
    }
  });
} 