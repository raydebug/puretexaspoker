import { Server, Socket } from 'socket.io';
import { tableManager, TableData } from '../services/TableManager';
import { gameManager } from '../services/gameManager';
import { prisma } from '../db';

interface ClientToServerEvents {
  getLobbyTables: () => void;
  joinTable: (data: { tableId: number; buyIn?: number; nickname?: string }) => void;
  leaveTable: (data: { tableId: number }) => void;
  sitDown: (data: { tableId: number; buyIn: number }) => void;
  standUp: (data: { tableId: number }) => void;
  takeSeat: (data: { seatNumber: number; buyIn: number }) => void;
}

interface ServerToClientEvents {
  tablesUpdate: (tables: TableData[]) => void;
  tableJoined: (data: { tableId: number; role: 'player' | 'observer'; buyIn: number; gameId?: string }) => void;
  tableError: (error: string) => void;
  gameCreated: (data: { gameId: string; tableId: number }) => void;
  gameJoined: (data: { gameId: string; playerId: string | null; gameState: any }) => void;
  gameState: (gameState: any) => void;
  seatError: (error: string) => void;
  seatTaken: (data: { seatNumber: number; playerId: string; gameState: any }) => void;
  'observer:joined': (data: { observer: string }) => void;
  'observer:left': (data: { observer: string }) => void;
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
  socket.on('joinTable', async ({ tableId, buyIn, nickname }) => {
    console.log(`DEBUG: Backend received joinTable event - tableId: ${tableId}, buyIn: ${buyIn}, nickname: ${nickname}`);
    console.log(`DEBUG: Backend socket.id: ${socket.id}`);
    
    try {
      // Get or create a player for this socket
      const nicknameToUse = nickname || `Player${socket.id.slice(0, 4)}`;
      console.log(`DEBUG: Backend using nickname: ${nicknameToUse}`);
      
      // First, try to create a player in the database if they don't exist
      console.log(`DEBUG: Backend creating/updating player in database...`);
      let player;
      try {
        player = await prisma.player.upsert({
          where: { id: socket.id },
          update: { 
            nickname: nicknameToUse,
            chips: buyIn || 0 
          },
          create: {
            id: socket.id,
            nickname: nicknameToUse,
            chips: buyIn || 0
          }
        });
      } catch (dbError: any) {
        // Handle unique constraint errors for nickname
        if (dbError.code === 'P2002' && dbError.meta?.target?.includes('nickname')) {
          console.log(`DEBUG: Backend nickname "${nicknameToUse}" already exists, using fallback`);
          const fallbackNickname = `Player${socket.id.slice(0, 6)}`;
          try {
            player = await prisma.player.upsert({
              where: { id: socket.id },
              update: { 
                nickname: fallbackNickname,
                chips: buyIn || 0 
              },
              create: {
                id: socket.id,
                nickname: fallbackNickname,
                chips: buyIn || 0
              }
            });
          } catch (fallbackError) {
            console.error(`DEBUG: Backend fallback database error:`, fallbackError);
            socket.emit('tableError', 'Database error: Could not create player');
            return;
          }
        } else {
          console.error(`DEBUG: Backend database error:`, dbError);
          socket.emit('tableError', 'Database error: Failed to create player');
          return;
        }
      }
      console.log(`DEBUG: Backend player upserted:`, player);

      // Join the table in the table manager
      console.log(`DEBUG: Backend joining table in TableManager...`);
      const tableResult = tableManager.joinTable(tableId, socket.id, nicknameToUse);
      console.log(`DEBUG: Backend TableManager join result:`, tableResult);

      if (!tableResult.success) {
        // If already joined another table, try to leave first and retry
        if (tableResult.error?.includes('Already joined another table')) {
          console.log(`DEBUG: Backend leaving current tables and retrying join...`);
          
          // Leave all tables first
          const allTables = tableManager.getAllTables();
          for (const table of allTables) {
            tableManager.leaveTable(table.id, socket.id);
          }
          
          // Retry the join
          const retryResult = tableManager.joinTable(tableId, socket.id, nicknameToUse);
          console.log(`DEBUG: Backend retry join result:`, retryResult);
          
          if (!retryResult.success) {
            console.error(`DEBUG: Backend table join failed on retry: ${retryResult.error}`);
            socket.emit('tableError', retryResult.error || 'Failed to join table after leaving previous table');
            return;
          }
        } else {
          console.error(`DEBUG: Backend table join failed: ${tableResult.error}`);
          socket.emit('tableError', tableResult.error || 'Failed to join table');
          return;
        }
      }

      // Get the table info from TableManager to create a corresponding database table
      const lobbyTable = tableManager.getTable(tableId);
      if (!lobbyTable) {
        console.error(`DEBUG: Backend table not found in TableManager: ${tableId}`);
        socket.emit('tableError', 'Table not found');
        return;
      }
      console.log(`DEBUG: Backend found lobby table:`, lobbyTable);

      // Create or find a database table that corresponds to this lobby table
      // Use a naming convention to map lobby table ID to database table
      const dbTableName = `${lobbyTable.name} (ID: ${tableId})`;
      console.log(`DEBUG: Backend looking for database table: ${dbTableName}`);
      
      let dbTable = await prisma.table.findFirst({
        where: { name: dbTableName }
      });

      if (!dbTable) {
        console.log(`DEBUG: Backend creating new database table...`);
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
      console.log(`DEBUG: Backend database table:`, dbTable);

      // Join the socket room for this table
      socket.join(`table:${tableId}`);
      socket.data.buyIn = buyIn;
      socket.data.tableId = tableId;
      socket.data.playerId = socket.id;
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
        console.log(`DEBUG: Backend creating new game for table ${dbTable.id}...`);
        // Create a new game for this database table
        const gameState = await gameManager.createGame(dbTable.id);
        gameId = gameState.id!;
        console.log(`DEBUG: Backend created game with ID: ${gameId}`);
        
        // Emit game created event
        socket.emit('gameCreated', { gameId, tableId });
      } else {
        gameId = existingGame.id;
        console.log(`DEBUG: Backend found existing database game with ID: ${gameId}`);
        
        // Check if GameService exists in memory for this game
        let gameService = gameManager.getGame(gameId);
        console.log(`DEBUG: GameManager.getGame called with gameId: ${gameId}`);
        console.log(`DEBUG: GameManager.getGame returning:`, gameService ? 'GAME_SERVICE' : 'NULL');
        
        if (!gameService) {
          // Check if it's an existing game without GameService (server restart)
          if (existingGame) {
            console.log('DEBUG: Backend GameService not in memory, recreating for existing game...');
            
            // First clear any existing player-table relationships for this table
            await prisma.playerTable.deleteMany({
              where: { tableId: dbTable.id }
            });
            console.log('DEBUG: Backend cleared existing player-table relationships');
            
            // Delete the stale database record first
            await prisma.game.delete({
              where: { id: existingGame.id }
            });
            console.log('DEBUG: Backend deleted stale database game record');
            
            // Create a fresh game using gameManager
            const gameState = await gameManager.createGame(dbTable.id);
            gameId = gameState.id!;
            console.log(`DEBUG: Backend recreated game with new ID: ${gameId}`);
          }
          
          socket.emit('tableError', 'Failed to create or find game service');
          return;
        }
      }

      // Add the user as an observer first (observer-first flow)
      let gameService = gameManager.getGame(gameId);
      console.log(`DEBUG: Backend gameService found:`, !!gameService);
      
      if (gameService) {
        // Store the buy-in amount and other data for when they select a seat
        socket.data.buyIn = buyIn;
        socket.data.gameId = gameId;
        socket.data.dbTableId = dbTable.id;
        socket.data.nickname = nicknameToUse;
        socket.data.playerId = socket.id;
        
        // Join the game room as observer
        socket.join(`game:${gameId}`);
        gameManager.joinGameRoom(gameId, socket.id);

        // Emit observer joined event to all clients in the game room (including the observer themselves)
        io.to(`game:${gameId}`).emit('observer:joined', { observer: nicknameToUse });
        console.log(`DEBUG: Backend emitted observer:joined event for ${nicknameToUse} in game:${gameId}`);

        // Get current game state
        const gameState = gameService.getGameState();
        
        // Emit success events - user joins as observer
        console.log(`DEBUG: Backend about to emit tableJoined as observer - tableId: ${tableId}, gameId: ${gameId}`);
        socket.emit('tableJoined', { tableId, role: 'observer', buyIn: 0, gameId });
        
        console.log(`DEBUG: Backend about to emit gameJoined as observer - gameId: ${gameId}`);
        console.log(`DEBUG: Backend gameState being sent:`, gameState);
        socket.emit('gameJoined', { gameId, playerId: socket.data.playerId!, gameState });
        
        console.log(`DEBUG: Backend user ${nicknameToUse} joined as observer successfully`);
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

  // Handle take seat request (when observer wants to take a specific seat)
  socket.on('takeSeat', async ({ seatNumber, buyIn }) => {
    console.log(`DEBUG: Backend received takeSeat event - seatNumber: ${seatNumber}, buyIn: ${buyIn}`);
    
    try {
      // Validate we have the required data from when they joined as observer
      const gameId = socket.data.gameId;
      const tableId = socket.data.tableId;
      const dbTableId = socket.data.dbTableId;
      const nickname = socket.data.nickname;
      const playerId = socket.data.playerId;
      
      if (!gameId || !tableId || !dbTableId || !nickname || !playerId) {
        socket.emit('seatError', 'Invalid session data. Please rejoin the table.');
        return;
      }
      
      // Get the table info for buy-in validation
      const lobbyTable = tableManager.getTable(tableId);
      if (!lobbyTable) {
        socket.emit('seatError', 'Table not found');
        return;
      }
      
      // Validate buy-in amount
      if (!buyIn || buyIn < lobbyTable.minBuyIn || buyIn > lobbyTable.maxBuyIn) {
        socket.emit('seatError', `Buy-in must be between ${lobbyTable.minBuyIn} and ${lobbyTable.maxBuyIn}`);
        return;
      }
      
      // Get the game service
      const gameService = gameManager.getGame(gameId);
      if (!gameService) {
        socket.emit('seatError', 'Game not found');
        return;
      }
      
      // Create player data
      const playerData = {
        id: playerId,
        name: nickname,
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
      
      console.log(`DEBUG: Backend attempting to add player to seat ${seatNumber}:`, playerData);
      
      // Add player to the game
      gameService.addPlayer(playerData);
      
      // Create player-table relationship in database
      await prisma.playerTable.create({
        data: {
          playerId: socket.data.playerId!,
          tableId: dbTableId,
          seatNumber: seatNumber,
          buyIn: buyIn
        }
      });
      
      // Update stored buy-in for this player
      socket.data.buyIn = buyIn;
      
      // Get updated game state
      const gameState = gameService.getGameState();
      
      // Emit success events
      // **CRITICAL BUG FIX**: Remove player from observers list when they take a seat
      console.log(`DEBUG: Backend removing ${nickname} from observers when taking seat`);
      io.to(`game:${gameId}`).emit("observer:left", { observer: nickname });

      console.log(`DEBUG: Backend successfully seated player in seat ${seatNumber}`);
      socket.emit('seatTaken', { seatNumber, playerId, gameState });
      socket.emit('tableJoined', { tableId, role: 'player', buyIn, gameId });
      socket.emit('gameJoined', { gameId, playerId: socket.data.playerId!, gameState });
      
      // Broadcast to other players in the game
      io.to(`game:${gameId}`).emit('gameState', gameState);
      
      console.log(`DEBUG: Backend seat taking completed successfully`);
      
    } catch (error) {
      console.error('Error taking seat:', error);
      socket.emit('seatError', (error as Error).message || 'Failed to take seat');
    }
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    const allTables = tableManager.getAllTables();
    for (const table of allTables) {
      tableManager.leaveTable(table.id, socket.id);
    }
    broadcastTables();
  });
}; 