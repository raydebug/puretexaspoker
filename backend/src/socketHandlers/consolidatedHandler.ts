import { Server, Socket } from 'socket.io';
import { tableManager } from '../services/TableManager';
import { locationManager } from '../services/LocationManager';
import { prisma } from '../db';

/**
 * Simplified WebSocket Handler for Table-Only Architecture
 * Handles basic table operations: join table, take seat, leave table
 */

// Track authenticated users
const authenticatedUsers = new Map<string, { nickname: string; socketId: string; playerId: string; location: 'lobby' | number }>();

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

  io.on('connection', (socket: Socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

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

        // Create a new player record in database (since nickname is not unique)
        const player = await prisma.player.create({
          data: { 
            nickname: nickname.trim(),
            chips: 1000, // Default chips for new players
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Store authenticated user with player ID
        authenticatedUsers.set(socket.id, {
          nickname: nickname.trim(),
          socketId: socket.id,
          playerId: player.id, // Store the actual player ID
          location: 'lobby'
        });

        socket.emit('authenticated', { nickname: nickname.trim() });
        broadcastOnlineUsersUpdate();
        
        console.log(`[SOCKET] User authenticated: ${nickname} (Player ID: ${player.id})`);
      } catch (error) {
        handleError(socket, error as Error, 'authenticate');
      }
    });

    // === JOIN TABLE ===
    socket.on('joinTable', async ({ tableId, buyIn = 200 }) => {
      try {
        const user = authenticatedUsers.get(socket.id);
        if (!user) {
          throw new Error('Must authenticate first');
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
            playerId: String(user.playerId),
            tableId: user.location === 'lobby' ? 0 : (user.location as number)
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
            tableId: user.location === 'lobby' ? 0 : (user.location as number),
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
            playerId: String(user.playerId),
            tableId: user.location as number,
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

        // Emit game state to all players at table
        if (result.gameState) {
          io.to(`table:${tableId}`).emit('gameState', result.gameState);
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

        // Emit updated game state to all players at table
        if (result.gameState) {
          io.to(`table:${tableId}`).emit('gameState', result.gameState);
        }

        socket.emit('actionSuccess', { action, tableId });
        
        console.log(`[SOCKET] User ${user.nickname} performed ${action} at table ${tableId}`);
      } catch (error) {
        handleError(socket, error as Error, 'playerAction');
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