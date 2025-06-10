import { Server, Socket } from 'socket.io';
import { tableManager, TableData } from '../services/TableManager';
import { gameManager } from '../services/gameManager';
import { prisma } from '../db';
import { locationManager, LocationManager } from '../services/LocationManager';

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
  nicknameError: (data: { message: string; suggestedNames?: string[] }) => void;
  gameCreated: (data: { gameId: string; tableId: number }) => void;
  gameJoined: (data: { gameId: string; playerId: string | null; gameState: any }) => void;
  gameState: (gameState: any) => void;
  seatError: (error: string) => void;
  seatTaken: (data: { seatNumber: number; playerId: string; gameState: any }) => void;
  'location:updated': (data: { playerId: string; nickname: string; location: string }) => void;
  'location:usersAtTable': (data: { tableId: number; observers: string[]; players: { nickname: string; seatNumber: number }[] }) => void;
  'player:disconnected': (data: { playerId: string; nickname: string; timeoutSeconds: number }) => void;
  'player:reconnected': (data: { playerId: string; nickname: string }) => void;
  'player:removedFromSeat': (data: { playerId: string; nickname: string; seatNumber: number; reason: string }) => void;
}

// Connection monitoring state
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

// Track disconnected players across all connections
const disconnectedPlayers = new Map<string, PlayerConnectionState>();
const DISCONNECT_TIMEOUT_MS = 5000; // 5 seconds

export const setupLobbyHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  // Broadcast table updates to all connected clients
  const broadcastTables = () => {
    io.emit('tablesUpdate', tableManager.getAllTables());
  };

  // Helper function to broadcast current users at a table
  const broadcastTableUsers = (tableId: number, gameId: string) => {
    const observers = locationManager.getObserversAtTable(tableId);
    const players = locationManager.getPlayersAtTable(tableId);
    
    const observerNames = observers.map(user => user.nickname);
    const playerData = players.map(user => {
      const location = locationManager.parseLocation(user.location);
      return {
        nickname: user.nickname,
        seatNumber: location.seatNumber!
      };
    });

    io.to(`game:${gameId}`).emit('location:usersAtTable', {
      tableId,
      observers: observerNames,
      players: playerData
    });
    
    console.log(`DEBUG: Broadcasted table ${tableId} users - Observers: ${observerNames.length}, Players: ${playerData.length}`);
  };

  // Helper function to handle player reconnection
  const handlePlayerReconnection = (playerId: string, nickname: string, gameId: string) => {
    const connectionState = disconnectedPlayers.get(playerId);
    if (connectionState) {
      console.log(`DEBUG: Player ${nickname} reconnected, cancelling timeout`);
      
      // Clear the timeout
      clearTimeout(connectionState.timeoutId);
      
      // Remove from disconnected players tracking
      disconnectedPlayers.delete(playerId);
      
      // Notify other players that this player reconnected
      io.to(`game:${gameId}`).emit('player:reconnected', {
        playerId,
        nickname
      });

      console.log(`DEBUG: Successfully cancelled timeout for reconnected player ${nickname}`);
      return true;
    }
    return false;
  };

  // Helper function to move player from seat to observer due to timeout
  const movePlayerToObserver = async (connectionState: PlayerConnectionState) => {
    try {
      console.log(`DEBUG: Moving disconnected player ${connectionState.nickname} to observers after timeout`);
      
      // Get the game service
      const gameService = gameManager.getGame(connectionState.gameId);
      if (!gameService) {
        console.log(`DEBUG: Game service not found for gameId: ${connectionState.gameId}`);
        return;
      }

      // Remove player from their seat in game service
      gameService.removePlayer(connectionState.playerId);

      // Remove from database seat assignment
      await prisma.playerTable.deleteMany({
        where: {
          playerId: connectionState.playerId,
          tableId: connectionState.dbTableId
        }
      });

      // Update user location from seat to observer
      const observerLocation = LocationManager.createTableObserverLocation(connectionState.tableId);
      await locationManager.updateUserLocation(
        connectionState.playerId, 
        connectionState.nickname, 
        observerLocation
      );

      // Get updated game state
      const gameState = gameService.getGameState();

      // Emit location update event
      io.to(`game:${connectionState.gameId}`).emit('location:updated', {
        playerId: connectionState.playerId,
        nickname: connectionState.nickname,
        location: observerLocation
      });

      // Emit events to notify all clients in the game room
      io.to(`game:${connectionState.gameId}`).emit('player:removedFromSeat', {
        playerId: connectionState.playerId,
        nickname: connectionState.nickname,
        seatNumber: connectionState.seatNumber,
        reason: 'Disconnected for more than 5 seconds'
      });

      // Broadcast updated game state
      io.to(`game:${connectionState.gameId}`).emit('gameState', gameState);

      console.log(`DEBUG: Successfully moved ${connectionState.nickname} from seat ${connectionState.seatNumber} to observers`);

    } catch (error) {
      console.error('Error moving player to observer:', error);
    } finally {
      // Remove from disconnected players tracking
      disconnectedPlayers.delete(connectionState.playerId);
    }
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
      
      // First, clean up any existing player records for this socket to prevent constraints
      await prisma.$transaction(async (tx) => {
        // Clean up in proper order to respect foreign key constraints
        await tx.message.deleteMany({ where: { playerId: socket.id } });
        await tx.gameAction.deleteMany({ where: { playerId: socket.id } });
        await tx.playerTable.deleteMany({ where: { playerId: socket.id } });
        await tx.player.deleteMany({ where: { id: socket.id } });
      });
      
      // Create a player in the database - no more unique nickname constraint
      console.log(`DEBUG: Backend creating/updating player in database...`);
      let player;
      try {
        player = await prisma.player.create({
          data: {
            id: socket.id,
            nickname: nicknameToUse,
            chips: buyIn || 0
          }
        });
      } catch (dbError: any) {
        console.error(`DEBUG: Backend database error:`, dbError);
        socket.emit('tableError', `Database error: ${dbError.message || 'Failed to create player'}`);
        return;
      }
      console.log(`DEBUG: Backend player created:`, player);

      // Update user location first (before any table operations)
      const observerLocation = LocationManager.createTableObserverLocation(tableId);
      await locationManager.updateUserLocation(socket.id, player.nickname, observerLocation);
      console.log(`DEBUG: Backend updated ${player.nickname} location to: ${observerLocation} BEFORE table operations`);

      // Join the table in the table manager
      console.log(`DEBUG: Backend joining table in TableManager...`);
      const tableResult = tableManager.joinTable(tableId, socket.id, player.nickname);
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
          const retryResult = tableManager.joinTable(tableId, socket.id, player.nickname);
          console.log(`DEBUG: Backend retry join result:`, retryResult);
          
          if (!retryResult.success) {
            console.error(`DEBUG: Backend table join failed on retry: ${retryResult.error}`);
            socket.emit('tableError', retryResult.error || 'Failed to join table after leaving previous table');
            // Revert location update on failure
            await locationManager.updateUserLocation(socket.id, player.nickname, 'lobby');
            return;
          }
        } else {
          console.error(`DEBUG: Backend table join failed: ${tableResult.error}`);
          socket.emit('tableError', tableResult.error || 'Failed to join table');
          // Revert location update on failure
          await locationManager.updateUserLocation(socket.id, player.nickname, 'lobby');
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
            
            // Clean up in proper order to respect foreign key constraints
            await prisma.$transaction(async (tx) => {
              // Delete in correct order: Messages → GameActions → Games → PlayerTables
              await tx.message.deleteMany({
                where: { 
                  player: { 
                    playerTables: { 
                      some: { tableId: dbTable.id } 
                    } 
                  } 
                }
              });
              await tx.gameAction.deleteMany({ where: { gameId: existingGame.id } });
              await tx.game.delete({ where: { id: existingGame.id } });
              await tx.playerTable.deleteMany({ where: { tableId: dbTable.id } });
            });
            console.log('DEBUG: Backend cleaned up stale game data with proper foreign key ordering');
            
            // Create a fresh game using gameManager
            const gameState = await gameManager.createGame(dbTable.id);
            gameId = gameState.id!;
            console.log(`DEBUG: Backend recreated game with new ID: ${gameId}`);
          } else {
            socket.emit('tableError', 'Failed to create or find game service');
            return;
          }
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
        socket.data.nickname = player.nickname;
        socket.data.playerId = socket.id;
        
        // Join the game room as observer
        socket.join(`game:${gameId}`);
        gameManager.joinGameRoom(gameId, socket.id);

        // Emit location update event (location was already updated earlier)
        io.to(`game:${gameId}`).emit('location:updated', { 
          playerId: socket.id,
          nickname: player.nickname,
          location: observerLocation
        });
        console.log(`DEBUG: Backend location already updated, now emitting location:updated event`);

        // Get current game state
        const gameState = gameService.getGameState();
        
        // **CONNECTION MONITORING**: Check if this player was disconnected and cancel timeout
        handlePlayerReconnection(socket.id, player.nickname, gameId);

        // Emit success events - user joins as observer
        socket.emit('tableJoined', { tableId, role: 'observer', buyIn: buyIn || 0, gameId });
        socket.emit('gameJoined', { gameId, playerId: socket.id, gameState });
        
        console.log(`DEBUG: Backend successfully joined ${player.nickname} as observer to game ${gameId}`);
        
      } else {
        console.error(`DEBUG: Backend gameService is null for gameId: ${gameId}`);
        socket.emit('tableError', 'Failed to join game as observer');
        return;
      }
      
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
      
      // Check if seat is available before trying to take it
      const existingPlayerTable = await prisma.playerTable.findFirst({
        where: {
          tableId: dbTableId,
          seatNumber: seatNumber
        }
      });
      
      if (existingPlayerTable) {
        socket.emit('seatError', `Seat ${seatNumber} is already taken`);
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
      
      // Create player-table relationship in database with error handling
      try {
        await prisma.playerTable.create({
          data: {
            playerId: socket.data.playerId!,
            tableId: dbTableId,
            seatNumber: seatNumber,
            buyIn: buyIn
          }
        });
      } catch (dbError: any) {
        // If seat was taken between our check and create, handle it gracefully
        if (dbError.code === 'P2002' && dbError.meta?.target?.includes('tableId_seatNumber')) {
          console.log(`DEBUG: Backend seat ${seatNumber} was taken by another player during processing`);
          
          // Remove player from game service since DB creation failed
          gameService.removePlayer(playerId);
          
          socket.emit('seatError', `Seat ${seatNumber} was just taken by another player`);
          return;
        } else {
          console.error('DEBUG: Backend database error creating PlayerTable:', dbError);
          
          // Remove player from game service since DB creation failed
          gameService.removePlayer(playerId);
          
          socket.emit('seatError', `Database error: ${dbError.message || 'Failed to take seat'}`);
          return;
        }
      }
      
      // Update stored buy-in for this player
      socket.data.buyIn = buyIn;
      
      // Get updated game state
      const gameState = gameService.getGameState();
      
      // Update user location from observer to player seat
      const playerLocation = LocationManager.createTablePlayerLocation(tableId, seatNumber);
      await locationManager.updateUserLocation(socket.id, nickname, playerLocation);
      
      // Emit location update to notify all clients
      io.to(`game:${gameId}`).emit('location:updated', { 
        playerId: socket.id,
        nickname: nickname,
        location: playerLocation
      });
      console.log(`DEBUG: Backend updated ${nickname} location to: ${playerLocation}`);

      // **CONNECTION MONITORING**: Check if this player was disconnected and cancel timeout
      handlePlayerReconnection(playerId, nickname, gameId);

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

  // Handle client disconnect - start monitoring for timeout
  socket.on('disconnect', async () => {
    console.log(`DEBUG: Player ${socket.id} disconnected, starting timeout monitoring`);
    
    const allTables = tableManager.getAllTables();
    for (const table of allTables) {
      tableManager.leaveTable(table.id, socket.id);
    }
    broadcastTables();

    // Get user's current location before potential timeout handling
    const userLocation = locationManager.getUserLocation(socket.id);
    const gameId = socket.data.gameId;
    const nickname = socket.data.nickname;
    const tableId = socket.data.tableId;
    const dbTableId = socket.data.dbTableId;

    if (gameId && nickname && tableId && dbTableId) {
      try {
        // Find the player's seat assignment in the database
        const playerTable = await prisma.playerTable.findFirst({
          where: {
            playerId: socket.id,
            tableId: dbTableId
          }
        });

        if (playerTable && playerTable.seatNumber !== null) {
          console.log(`DEBUG: Player ${nickname} (${socket.id}) was seated at seat ${playerTable.seatNumber}, starting 5-second timeout`);
          
          // Clear any existing timeout for this player
          const existingState = disconnectedPlayers.get(socket.id);
          if (existingState) {
            clearTimeout(existingState.timeoutId);
          }

          // Set up timeout to move player to observer after 5 seconds
          const timeoutId = setTimeout(() => {
            const connectionState = disconnectedPlayers.get(socket.id);
            if (connectionState) {
              console.log(`DEBUG: Timeout expired for player ${nickname}, moving to observers`);
              movePlayerToObserver(connectionState);
            }
          }, DISCONNECT_TIMEOUT_MS);

          // Store connection state for timeout tracking
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

          // Notify other players that this player is disconnected
          io.to(`game:${gameId}`).emit('player:disconnected', {
            playerId: socket.id,
            nickname,
            timeoutSeconds: DISCONNECT_TIMEOUT_MS / 1000
          });

          console.log(`DEBUG: Set up ${DISCONNECT_TIMEOUT_MS}ms timeout for player ${nickname}`);
        } else {
          console.log(`DEBUG: Player ${nickname} was not seated, removing from location tracking`);
          // If player was just observing, remove immediately from location tracking
          locationManager.removeUser(socket.id);
        }
      } catch (error) {
        console.error('Error setting up disconnect timeout:', error);
        // Fallback: remove user from location tracking
        locationManager.removeUser(socket.id);
      }
    } else {
      // No game context, just remove from location tracking
      locationManager.removeUser(socket.id);
    }
  });
}; 