import { Server, Socket } from 'socket.io';
import { tableManager } from '../services/TableManager';
import { locationManager } from '../services/LocationManager';
import { prisma } from '../db';

/**
 * Enhanced WebSocket Handler for Table-Only Architecture
 * Handles basic table operations: join table, take seat, leave table
 * Includes enhanced game state synchronization and heartbeat monitoring
 */

// Track authenticated users
const authenticatedUsers = new Map<string, { nickname: string; socketId: string; playerId: string; location: 'lobby' | number; lastHeartbeat: number }>();

// Game state synchronization tracking
const gameStateSync = new Map<string, { lastUpdate: number; players: string[]; tableId: number }>();

export function registerConsolidatedHandlers(io: Server) {
  // Global error handler
  const handleError = (socket: Socket, error: Error, context: string) => {
    console.error(`[SOCKET] Error in ${context}:`, error.message);
    socket.emit('error', {
      message: error.message,
      context,
      timestamp: Date.now(),
      success: false
    });
  };

  // Enhanced game state broadcasting with sync tracking
  const broadcastGameState = (tableId: number, gameState: any, reason: string = 'update') => {
    const roomId = `table:${tableId}`;
    const syncKey = `table:${tableId}`;
    
    // Track sync state
    gameStateSync.set(syncKey, {
      lastUpdate: Date.now(),
      players: gameState.players?.map((p: any) => p.name) || [],
      tableId
    });

    console.log(`📡 [SOCKET] Broadcasting game state to ${roomId} (${reason}):`, {
      tableId,
      playersCount: gameState.players?.length || 0,
      currentPlayer: gameState.currentPlayerId,
      phase: gameState.phase,
      pot: gameState.pot
    });

    // Emit to table room
    io.to(roomId).emit('gameState', gameState);
    
    // Also emit to all clients for debugging/fallback
    io.emit('gameState', gameState);
    
    // Emit sync confirmation
    io.to(roomId).emit('gameStateSync', {
      tableId,
      timestamp: Date.now(),
      reason,
      playersCount: gameState.players?.length || 0
    });
  };

  // Heartbeat monitoring
  const startHeartbeatMonitoring = () => {
    setInterval(() => {
      const now = Date.now();
      const heartbeatTimeout = 60000; // 60 seconds
      
      for (const [socketId, user] of authenticatedUsers.entries()) {
        if (now - user.lastHeartbeat > heartbeatTimeout) {
          console.log(`💓 [SOCKET] User ${user.nickname} heartbeat timeout, removing from tracking`);
          authenticatedUsers.delete(socketId);
          
          // Leave table if at one
          if (user.location !== 'lobby') {
            tableManager.leaveTable(user.location, socketId);
            locationManager.removeUser(socketId);
          }
        }
      }
      
      // Clean up stale game state sync records
      for (const [key, sync] of gameStateSync.entries()) {
        if (now - sync.lastUpdate > 300000) { // 5 minutes
          gameStateSync.delete(key);
        }
      }
    }, 30000); // Check every 30 seconds
  };

  // Broadcast tables update to all clients
  const broadcastTables = () => {
    const tables = tableManager.getAllTables();
    io.emit('tablesUpdate', tables);
  };

  // Broadcast online users count update
  const broadcastOnlineUsersUpdate = () => {
    const totalOnlineUsers = authenticatedUsers.size;
    io.emit('onlineUsers:update', { total: totalOnlineUsers });
  };

  // Start heartbeat monitoring
  startHeartbeatMonitoring();

  io.on('connection', (socket: Socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // === HEARTBEAT ===
    socket.on('ping', () => {
      const user = authenticatedUsers.get(socket.id);
      if (user) {
        user.lastHeartbeat = Date.now();
        socket.emit('pong', { timestamp: Date.now() });
      }
    });

    // === AUTHENTICATION ===
    socket.on('authenticate', async ({ nickname }) => {
      try {
        if (!nickname || nickname.trim().length === 0) {
          throw new Error('Nickname is required');
        }

        // Check if user is already authenticated
        const existingUser = authenticatedUsers.get(socket.id);
        if (existingUser) {
          // User is already authenticated - just emit success
          socket.emit('authenticated', { nickname: existingUser.nickname });
          console.log(`[SOCKET] User ${existingUser.nickname} already authenticated`);
          return;
        }

        // Create a new player record in database or find existing one
        const trimmedNickname = nickname.trim();
        let player = await prisma.player.findUnique({
          where: { id: trimmedNickname }
        });
        
        if (!player) {
          player = await prisma.player.create({
            data: { 
              id: trimmedNickname,     // Use nickname as primary key
              nickname: trimmedNickname,
              chips: 1000, // Default chips for new players
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }

        // Store authenticated user with player ID and heartbeat
        authenticatedUsers.set(socket.id, {
          nickname: trimmedNickname,
          socketId: socket.id,
          playerId: player.id, // Store the nickname as player ID
          location: 'lobby',
          lastHeartbeat: Date.now()
        });

        socket.emit('authenticated', { nickname: nickname.trim() });
        broadcastOnlineUsersUpdate();
        
        console.log(`[SOCKET] User authenticated: ${nickname} (Player ID: ${player.id})`);
      } catch (error) {
        handleError(socket, error as Error, 'authenticate');
      }
    });

    // === JOIN TABLE ===
    socket.on('joinTable', async ({ tableId, buyIn = 200, playerName, isTestMode = false }) => {
      try {
        let user = authenticatedUsers.get(socket.id);
        
        // For test mode, create a mock user if not authenticated
        if (!user && isTestMode && playerName) {
          console.log(`[SOCKET] Test mode joinTable for ${playerName} without authentication`);
          user = {
            playerId: `test-${Date.now()}-${Math.random()}`,
            nickname: playerName,
            location: 'lobby',
            socketId: socket.id,
            lastHeartbeat: Date.now()
          };
        } else if (!user) {
          throw new Error('Must authenticate first');
        }

        // Ensure user is defined at this point
        if (!user) {
          throw new Error('User not available');
        }

        // Check if user is already at this table
        if (user.location === tableId) {
          // User is already at this table - just emit success
          socket.emit('tableJoined', { tableId, role: 'observer', buyIn });
          console.log(`[SOCKET] User ${user.nickname} already at table ${tableId}`);
          return;
        }

        // Join table in TableManager
        const result = tableManager.joinTable(tableId, socket.id, user.nickname);
        if (!result.success) {
          throw new Error(result.error || 'Failed to join table');
        }

        // Update user location
        await locationManager.moveToTableObserver(user.playerId, user.nickname, tableId);
        user.location = tableId;

        // Join table room
        socket.join(`table:${tableId}`);

        // Emit success
        socket.emit('tableJoined', { tableId, role: 'observer', buyIn });
        
        // Broadcast table update
        broadcastTables();
        
        console.log(`[SOCKET] User ${user.nickname} joined table ${tableId} as observer`);
      } catch (error) {
        handleError(socket, error as Error, 'joinTable');
      }
    });

    // === TAKE SEAT ===
    socket.on('takeSeat', async ({ seatNumber, buyIn = 200 }) => {
      try {
        const user = authenticatedUsers.get(socket.id);
        if (!user) {
          throw new Error('Must authenticate first');
        }

        // Validate seat number
        if (!seatNumber || seatNumber < 1 || seatNumber > 9) {
          throw new Error('Invalid seat number. Must be between 1 and 9.');
        }

        // Check if player is already seated at this table
        const existingSeat = await prisma.playerTable.findFirst({
          where: {
            playerId: user.playerId, // Already a string (nickname)
            tableId: user.location === 'lobby' ? 0 : (user.location as number) as any
          }
        });

        if (existingSeat) {
          // Player is already seated - just emit success
          socket.emit('seatTaken', { tableId: user.location, seatNumber: existingSeat.seatNumber, buyIn: existingSeat.buyIn });
          socket.emit('alreadySeated', { tableId: user.location, seatNumber: existingSeat.seatNumber, buyIn: existingSeat.buyIn });
          console.log(`[SOCKET] User ${user.nickname} already seated at seat ${existingSeat.seatNumber} at table ${user.location} (playerId: ${user.playerId})`);
          return;
        }

        // Check if seat is already taken by another player
        const seatTaken = await prisma.playerTable.findFirst({
          where: {
            tableId: (user.location === 'lobby' ? 0 : (user.location as number)) as any,
            seatNumber
          }
        });

        if (seatTaken) {
          throw new Error(`Seat ${seatNumber} is already taken`);
        }

        // Validate that user is at a table (not in lobby)
        if (user.location === 'lobby') {
          throw new Error('Must join table as observer before taking a seat');
        }

        // Take seat in TableManager
        const result = tableManager.sitDown(user.location as number, user.nickname, buyIn);
        if (!result.success) {
          throw new Error(result.error || 'Failed to take seat');
        }

        // Update database
        await prisma.playerTable.create({
          data: {
            playerId: user.playerId, // Already a string (nickname)
            tableId: (user.location as number) as any,
            seatNumber,
            buyIn
          }
        });

        // Emit success
        socket.emit('seatTaken', { tableId: user.location, seatNumber, buyIn });
        
        // Broadcast table update
        broadcastTables();
        
        console.log(`[SOCKET] User ${user.nickname} took seat ${seatNumber} at table ${user.location}`);
      } catch (error) {
        handleError(socket, error as Error, 'takeSeat');
      }
    });

    // === AUTO SEAT === (Combines join and seat in one operation)
    socket.on('autoSeat', async ({ tableId, seatNumber, buyIn = 200, playerName, isTestMode = false }) => {
      try {
        let user = authenticatedUsers.get(socket.id);
        
        // For test mode, create a mock user if not authenticated
        if (!user && isTestMode && playerName) {
          console.log(`[SOCKET] Test mode auto-seat for ${playerName} without authentication`);
          user = {
            playerId: `test-${Date.now()}-${Math.random()}`,
            nickname: playerName,
            location: 'lobby',
            socketId: socket.id,
            lastHeartbeat: Date.now()
          };
        } else if (!user) {
          throw new Error('Must authenticate first');
        }

        // Ensure user is defined at this point
        if (!user) {
          throw new Error('User not available');
        }

        console.log(`[SOCKET] Auto-seat request from ${user.nickname}: table ${tableId}, seat ${seatNumber}, buyIn ${buyIn}`);

        // Validate input
        if (!tableId || !seatNumber || seatNumber < 1 || seatNumber > 9) {
          throw new Error('Invalid table ID or seat number');
        }

        if (buyIn <= 0) {
          throw new Error('Buy-in must be positive');
        }

        // Check if player is already seated at this table
        const playerSeat = await prisma.playerTable.findFirst({
          where: {
            playerId: user.playerId, // Already a string (nickname)
            tableId: tableId as any
          }
        });

        if (playerSeat) {
          // Player is already seated - emit success
          console.log(`[SOCKET] Emitting autoSeatSuccess event to socket ${socket.id} for user ${user.nickname} (already seated)`);
          socket.emit('autoSeatSuccess', { 
            tableId, 
            seatNumber: playerSeat.seatNumber, 
            buyIn: playerSeat.buyIn 
          });
          console.log(`[SOCKET] autoSeatSuccess event emitted successfully`);
          console.log(`[SOCKET] User ${user.nickname} already seated at seat ${playerSeat.seatNumber} at table ${tableId}`);
          return;
        }

        // Check if seat is available
        const existingSeat = await prisma.playerTable.findFirst({
          where: {
            tableId: tableId as any,
            seatNumber: seatNumber
          }
        });

        if (existingSeat) {
          throw new Error(`Seat ${seatNumber} is already taken`);
        }

        // Check if player is already at this table as observer
        const table = tableManager.getTable(tableId);
        const tablePlayers = tableManager.getTablePlayers(tableId);
        const isObserver = tablePlayers.some(p => p.nickname === user.nickname && p.role === 'observer');
        
        if (isObserver) {
          console.log(`[SOCKET] User ${user.nickname} already at table ${tableId} as observer, proceeding to seat`);
        } else {
          // Auto-seat: Join table and take seat in one operation
          const joinResult = tableManager.joinTable(tableId, socket.id, user.nickname);
          if (!joinResult.success) {
            throw new Error(joinResult.error || 'Failed to join table');
          }

          console.log(`[SOCKET] User ${user.nickname} joined table ${tableId} as observer`);

          // Update user location
          await locationManager.moveToTableObserver(user.playerId, user.nickname, tableId);
          user.location = tableId;
        }

        // Take seat immediately
        const sitResult = tableManager.sitDown(tableId, user.nickname, buyIn);
        if (!sitResult.success) {
          throw new Error(sitResult.error || 'Failed to take seat');
        }

        console.log(`[SOCKET] User ${user.nickname} took seat ${seatNumber} at table ${tableId}`);

        // Create database record
        await prisma.playerTable.create({
          data: {
            playerId: user.playerId, // Already a string (nickname)
            tableId: tableId as any,
            seatNumber: seatNumber,
            buyIn: buyIn
          }
        });

        // Join table room
        socket.join(`table:${tableId}`);

        // Emit success
        console.log(`[SOCKET] Emitting autoSeatSuccess event to socket ${socket.id} for user ${user.nickname}`);
        socket.emit('autoSeatSuccess', { tableId, seatNumber, buyIn });
        console.log(`[SOCKET] autoSeatSuccess event emitted successfully`);

        // Emit to table room
        socket.to(`table:${tableId}`).emit('playerJoined', {
          tableId,
          player: {
            id: user.nickname,
            nickname: user.nickname,
            seatNumber: seatNumber,
            chips: buyIn
          }
        });

        // Broadcast table update
        broadcastTables();

      } catch (error) {
        console.error(`[SOCKET] Error in autoSeat:`, error);
        socket.emit('autoSeatError', { error: (error as Error).message });
      }
    });

    // === START GAME ===
    socket.on('startGame', async ({ tableId }) => {
      try {
        const user = authenticatedUsers.get(socket.id);
        if (!user) {
          throw new Error('Must authenticate first');
        }

        // Start game in TableManager
        const result = await tableManager.startTableGame(tableId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to start game');
        }

        // Emit enhanced game state to all players at table
        if (result.gameState) {
          broadcastGameState(tableId, result.gameState, 'game_started');
        }

        socket.emit('gameStarted', { tableId });
        
        console.log(`[SOCKET] Game started at table ${tableId}`);
      } catch (error) {
        handleError(socket, error as Error, 'startGame');
      }
    });

    // === PLAYER ACTIONS ===
    socket.on('playerAction', async ({ tableId, action, amount }) => {
      try {
        const user = authenticatedUsers.get(socket.id);
        if (!user) {
          throw new Error('Must authenticate first');
        }

        // Perform action in TableManager
        const result = await tableManager.playerAction(tableId, socket.id, action, amount);
        if (!result.success) {
          throw new Error(result.error || 'Action failed');
        }

        // Emit enhanced updated game state to all players at table
        if (result.gameState) {
          broadcastGameState(tableId, result.gameState, 'player_action');
        }

        socket.emit('actionSuccess', { action, tableId });
        
        console.log(`[SOCKET] User ${user.nickname} performed ${action} at table ${tableId}`);
      } catch (error) {
        handleError(socket, error as Error, 'playerAction');
      }
    });

    // === GAME STATE SYNC REQUEST ===
    socket.on('requestGameState', async ({ tableId }) => {
      try {
        const user = authenticatedUsers.get(socket.id);
        if (!user) {
          throw new Error('Must authenticate first');
        }

        // Get current game state from TableManager
        const gameState = tableManager.getTableGameState(tableId);
        if (gameState) {
          socket.emit('gameState', gameState);
          console.log(`[SOCKET] Sent game state to ${user.nickname} for table ${tableId}`);
        } else {
          socket.emit('gameStateError', { error: 'No game state available' });
        }
      } catch (error) {
        handleError(socket, error as Error, 'requestGameState');
      }
    });

    // === LEAVE TABLE ===
    socket.on('leaveTable', async () => {
      try {
        const user = authenticatedUsers.get(socket.id);
        if (!user) {
          throw new Error('Must authenticate first');
        }

        if (user.location === 'lobby') {
          throw new Error('Not at a table');
        }

        // Leave table in TableManager
        tableManager.leaveTable(user.location, socket.id);

        // Remove from database
        await prisma.playerTable.deleteMany({
          where: { playerId: socket.id }
        });

        // Update location
        await locationManager.removeUser(socket.id);
        user.location = 'lobby';

        // Leave table room
        socket.leave(`table:${user.location}`);

        socket.emit('tableLeft', { tableId: user.location });
        broadcastTables();
        
        console.log(`[SOCKET] User ${user.nickname} left table ${user.location}`);
      } catch (error) {
        handleError(socket, error as Error, 'leaveTable');
      }
    });

    // === DISCONNECT ===
    socket.on('disconnect', async () => {
      try {
        const user = authenticatedUsers.get(socket.id);
        if (user) {
          // Remove from authenticated users
          authenticatedUsers.delete(socket.id);
          
          // Leave table if at one
          if (user.location !== 'lobby') {
            tableManager.leaveTable(user.location, socket.id);
            await locationManager.removeUser(socket.id);
          }
          
          broadcastOnlineUsersUpdate();
          broadcastTables();
          
          console.log(`[SOCKET] User ${user.nickname} disconnected`);
        }
      } catch (error) {
        console.error(`[SOCKET] Error during disconnect:`, error);
      }
    });
  });
} 