import { Server, Socket } from 'socket.io';
import { tableManager, TableData } from '../services/TableManager';
import { gameManager } from '../services/gameManager';
import { prisma } from '../db';

interface ClientToServerEvents {
  getLobbyTables: () => void;
  joinTable: (data: { tableId: number; buyIn: number }) => void;
  leaveTable: (data: { tableId: number }) => void;
  sitDown: (data: { tableId: number; buyIn: number }) => void;
  standUp: (data: { tableId: number }) => void;
}

interface ServerToClientEvents {
  tablesUpdate: (tables: TableData[]) => void;
  tableJoined: (data: { tableId: number; role: 'player' | 'observer'; buyIn: number; gameId?: string }) => void;
  tableError: (error: string) => void;
  gameCreated: (data: { gameId: string; tableId: number }) => void;
  gameJoined: (data: { gameId: string; playerId: string; gameState: any }) => void;
  gameState: (gameState: any) => void;
}

export const setupLobbyHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  // Broadcast table updates to all connected clients
  const broadcastTables = () => {
    io.emit('tablesUpdate', tableManager.getAllTables());
  };

  // Handle initial table list request
  socket.on('getLobbyTables', () => {
    console.log('Lobby: getLobbyTables request received');
    const tables = tableManager.getAllTables();
    console.log(`Lobby: Sending ${tables.length} tables to client`);
    socket.emit('tablesUpdate', tables);
  });

  // Handle table join request - this immediately creates a game and adds the player
  socket.on('joinTable', async ({ tableId, buyIn }) => {
    try {
      // Get or create a player for this socket
      const nickname = socket.data.nickname || `Player${socket.id.slice(0, 4)}`;
      
      // First, try to create a player in the database if they don't exist
      const player = await prisma.player.upsert({
        where: { id: socket.id },
        update: { nickname },
        create: {
          id: socket.id,
          nickname,
          chips: buyIn
        }
      });

      // Join the table in the table manager
      const tableResult = tableManager.joinTable(tableId, socket.id, nickname);

      if (!tableResult.success) {
        socket.emit('tableError', tableResult.error || 'Failed to join table');
        return;
      }

      // Get the table info from TableManager to create a corresponding database table
      const lobbyTable = tableManager.getTable(tableId);
      if (!lobbyTable) {
        socket.emit('tableError', 'Table not found');
        return;
      }

      // Create or find a database table that corresponds to this lobby table
      // Use a naming convention to map lobby table ID to database table
      const dbTableName = `${lobbyTable.name} (ID: ${tableId})`;
      
      let dbTable = await prisma.table.findFirst({
        where: { name: dbTableName }
      });

      if (!dbTable) {
        // Create a new database table based on the lobby table
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

      // Join the socket room for this table
      socket.join(`table:${tableId}`);
      socket.data.buyIn = buyIn;
      socket.data.tableId = tableId;
      socket.data.playerId = player.id;
      socket.data.dbTableId = dbTable.id;

      // Check if there's already a game for this database table
      let existingGame = await prisma.game.findFirst({
        where: {
          tableId: dbTable.id,
          status: { in: ['waiting', 'active'] }
        }
      });

      let gameId: string;

      if (!existingGame) {
        // Create a new game for this database table
        const gameState = await gameManager.createGame(dbTable.id);
        gameId = gameState.id!;
        
        // Emit game created event
        socket.emit('gameCreated', { gameId, tableId });
      } else {
        gameId = existingGame.id;
      }

      // Add the player to the game
      const gameService = gameManager.getGame(gameId);
      if (gameService) {
        const playerData = {
          id: player.id,
          name: nickname,
          chips: buyIn,
          isActive: true,
          isDealer: false,
          currentBet: 0,
          position: 0, // Will be updated based on seat
          seatNumber: 1, // Will be updated based on actual seat
          isAway: false,
          cards: [],
          avatar: {
            type: 'default' as const,
            color: '#007bff'
          }
        };

        gameService.addPlayer(playerData);
        
        // Create player-table relationship in database
        await prisma.playerTable.upsert({
          where: {
            tableId_seatNumber: {
              tableId: dbTable.id,
              seatNumber: 1 // TODO: Find next available seat
            }
          },
          update: {
            playerId: player.id,
            buyIn: buyIn
          },
          create: {
            playerId: player.id,
            tableId: dbTable.id,
            seatNumber: 1, // TODO: Find next available seat
            buyIn: buyIn
          }
        });
        
        // Join the game room
        socket.join(`game:${gameId}`);
        gameManager.joinGameRoom(gameId, socket.id);

        // Get updated game state
        const gameState = gameService.getGameState();
        
        // Emit success events
        socket.emit('tableJoined', { tableId, role: 'player', buyIn, gameId });
        socket.emit('gameJoined', { gameId, playerId: player.id, gameState });
        
        // Broadcast to other players in the game
        socket.to(`game:${gameId}`).emit('gameState', gameState);
      }

      broadcastTables();
    } catch (error) {
      console.error('Error joining table:', error);
      socket.emit('tableError', (error as Error).message || 'Failed to join table');
    }
  });

  // Handle table leave request
  socket.on('leaveTable', ({ tableId }) => {
    if (tableManager.leaveTable(tableId, socket.id)) {
      socket.leave(`table:${tableId}`);
      
      // Also leave any associated game
      if (socket.data.gameId) {
        socket.leave(`game:${socket.data.gameId}`);
        gameManager.leaveGameRoom(socket.data.gameId, socket.id);
      }
      
      broadcastTables();
    }
  });

  // Handle sit down request (legacy - now handled by joinTable)
  socket.on('sitDown', async ({ tableId, buyIn }) => {
    // For compatibility, call the same logic as joinTable
    // This is deprecated, clients should use joinTable instead
    socket.emit('tableError', 'sitDown is deprecated, please use joinTable instead');
  });

  // Handle stand up request
  socket.on('standUp', ({ tableId }) => {
    if (tableManager.standUp(tableId, socket.id)) {
      socket.emit('tableJoined', { tableId, role: 'observer', buyIn: 0 });
      broadcastTables();
    }
  });

  // Clean up when socket disconnects
  socket.on('disconnect', () => {
    // Find and leave all tables
    for (const table of tableManager.getAllTables()) {
      if (tableManager.leaveTable(table.id, socket.id)) {
        broadcastTables();
      }
    }
    
    // Leave any game rooms
    if (socket.data.gameId) {
      gameManager.leaveGameRoom(socket.data.gameId, socket.id);
    }
  });
}; 