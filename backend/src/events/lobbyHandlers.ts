import { Server, Socket } from 'socket.io';
import { tableManager, TableData } from '../services/TableManager';
import { prisma } from '../db';
import { locationManager, LocationManager } from '../services/LocationManager';

interface ClientToServerEvents {
  getLobbyTables: () => void;
  joinTable: (data: { tableId: number; buyIn?: number; nickname?: string }) => void;
  leaveTable: (data: { tableId: number }) => void;
  sitDown: (data: { tableId: number; buyIn: number }) => void;
  standUp: (data: { tableId: number }) => void;
  takeSeat: (data: { seatNumber: number; buyIn: number }) => void;
  updateUserLocation: (data: { tableId: number; nickname: string }) => void;
  userLogin: (data: { nickname: string }) => void;
  userLogout: () => void;
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
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
  'location:updated': (data: { playerId: string; nickname: string; table: number | null; seat: number | null }) => void;
  'location:usersAtTable': (data: { tableId: number; totalUsers: number }) => void;
  'player:disconnected': (data: { playerId: string; nickname: string; timeoutSeconds: number }) => void;
  'player:reconnected': (data: { playerId: string; nickname: string }) => void;
  'player:removedFromSeat': (data: { playerId: string; nickname: string; seatNumber: number; reason: string }) => void;
  'onlineUsers:update': (data: { total: number }) => void;
  roomJoined: (data: { room: string }) => void;
  roomLeft: (data: { room: string }) => void;
  roomError: (data: { room: string; error: string }) => void;
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

// Track authenticated users (both in lobby and at tables) - GLOBAL ACROSS ALL CONNECTIONS
const authenticatedUsers = new Map<string, { nickname: string; socketId: string; location: 'lobby' | number }>();

export const setupLobbyHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  // Broadcast table updates to all connected clients
  const broadcastTables = () => {
    io.emit('tablesUpdate', tableManager.getAllTables());
  };

  // Broadcast online users count update to all connected clients
  const broadcastOnlineUsersUpdate = () => {
    const totalOnlineUsers = authenticatedUsers.size;
    console.log(`🔍 BACKEND: Broadcasting online users update - Total: ${totalOnlineUsers}`);
    console.log(`🔍 BACKEND: Current authenticated users:`, Array.from(authenticatedUsers.keys()));
    io.emit('onlineUsers:update', { total: totalOnlineUsers });
  };

  // Helper function to broadcast current users at a table
  const broadcastTableUsers = (tableId: number, gameId: string) => {
    const observers = locationManager.getObserversAtTable(tableId);
    const players = locationManager.getPlayersAtTable(tableId);
    
    const totalUsers = observers.length + players.length;
    
    io.to(`game:${gameId}`).emit('location:usersAtTable', {
      tableId,
      totalUsers
    });
    
    console.log(`DEBUG: Broadcasted table ${tableId} users - Total: ${totalUsers}`);
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
  // In table-only architecture, this is handled by TableManager
  const movePlayerToObserver = async (connectionState: PlayerConnectionState) => {
    try {
      console.log(`DEBUG: Moving disconnected player ${connectionState.nickname} to observers after timeout`);
      
      // In table-only architecture, player management is handled by TableManager
      // This function is kept for compatibility but the actual logic is in TableManager
      console.log(`DEBUG: Player timeout handled by TableManager for ${connectionState.nickname}`);

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

  // Handle user login event to track authenticated lobby users
  socket.on('userLogin', ({ nickname }) => {
    console.log(`🔍 BACKEND: User login event - ${nickname} (socket: ${socket.id})`);
    console.log(`🔍 BACKEND: Authenticated users before login:`, Array.from(authenticatedUsers.keys()));
    
    // Remove any existing entry for this socket (in case of re-login)
    for (const [key, user] of authenticatedUsers.entries()) {
      if (user.socketId === socket.id) {
        authenticatedUsers.delete(key);
        console.log(`🔍 BACKEND: Removed existing entry for socket ${socket.id}`);
        break;
      }
    }
    
    // Add or update user in authenticated users map
    authenticatedUsers.set(nickname, {
      nickname,
      socketId: socket.id,
      location: 'lobby'
    });
    
    console.log(`🔍 BACKEND: Added authenticated user ${nickname} to lobby tracking`);
    console.log(`🔍 BACKEND: Authenticated users after login:`, Array.from(authenticatedUsers.keys()));
    broadcastOnlineUsersUpdate();
  });

  // Handle user logout event
  socket.on('userLogout', () => {
    console.log(`DEBUG: User logout event (socket: ${socket.id})`);
    
    // Remove user from authenticated users map
    for (const [key, user] of authenticatedUsers.entries()) {
      if (user.socketId === socket.id) {
        authenticatedUsers.delete(key);
        console.log(`DEBUG: Removed authenticated user ${user.nickname} from tracking`);
        break;
      }
    }
    
    broadcastOnlineUsersUpdate();
  });

  // Handle immediate location update when join button is clicked in lobby
  socket.on('updateUserLocation', async ({ tableId, nickname }) => {
    console.log(`🎯 BACKEND: Received immediate location update - ${nickname} → table ${tableId} (observer)`);
    
    try {
      // Get or create player in database if not exists
      let player;
      try {
        player = await prisma.player.upsert({
          where: { id: socket.id },
          update: { nickname },
          create: {
            id: socket.id,
            nickname,
            chips: 0
          }
        });
        console.log(`🎯 BACKEND: Player ready for location update:`, player);
      } catch (dbError: any) {
        console.error(`🎯 BACKEND: Failed to create/update player for location update:`, dbError);
        return;
      }

      // Clean up any existing instances of this nickname to prevent duplicates
      locationManager.removeUserByNickname(nickname);
      
      // Update user location immediately in backend - move to table observer
      await locationManager.moveToTableObserver(socket.id, nickname, tableId);
      console.log(`🎯 BACKEND: Successfully updated ${nickname} to observe table ${tableId} IMMEDIATELY`);

      // In table-only architecture, session data is set up in joinTable handler
      console.log(`🎯 BACKEND: Session data will be set up in joinTable handler for ${nickname}`);

      // Update authenticated user location if they're tracked
      if (authenticatedUsers.has(nickname)) {
        const user = authenticatedUsers.get(nickname)!;
        user.location = tableId;
        authenticatedUsers.set(nickname, user);
        console.log(`DEBUG: Updated authenticated user ${nickname} location to table ${tableId}`);
      }

      // NOTE: location:updated event will be emitted by the joinTable handler instead
      console.log(`🎯 BACKEND: Skipping location:updated emission here - will be handled by joinTable handler for ${nickname}`);

    } catch (error: any) {
      console.error('🎯 BACKEND: Error in immediate location update:', error);
      console.error('🎯 BACKEND: Error stack:', error.stack);
    }
  });

  // Handle table join request - this immediately creates a game and adds the player
  socket.on('joinTable', async ({ tableId, buyIn, nickname }) => {
    console.log(`DEBUG: Backend received joinTable event - tableId: ${tableId}, buyIn: ${buyIn}, nickname: ${nickname}`);
    console.log(`DEBUG: Backend socket.id: ${socket.id}`);
    console.log(`DEBUG: Backend joinTable handler STARTING...`);
    
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
      
      // Create or update a player in the database - no more unique nickname constraint
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
        console.error(`DEBUG: Backend database error:`, dbError);
        socket.emit('tableError', `Database error: ${dbError.message || 'Failed to create/update player'}`);
        return;
      }
      console.log(`DEBUG: Backend player created:`, player);

      // Update user location first (before any table operations) - move to table observer
      await locationManager.moveToTableObserver(socket.id, player.nickname, tableId);
      console.log(`DEBUG: Backend updated ${player.nickname} to observe table ${tableId} BEFORE table operations`);

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
            await locationManager.moveToLobby(socket.id, player.nickname);
            return;
          }
        } else {
          console.error(`DEBUG: Backend table join failed: ${tableResult.error}`);
          socket.emit('tableError', tableResult.error || 'Failed to join table');
          // Revert location update on failure
          await locationManager.moveToLobby(socket.id, player.nickname);
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

      // In table-only architecture, we don't create games using gameManager
      // Instead, we just join the table and let TableManager handle game state
      const gameId = tableId.toString(); // Use tableId as gameId
      console.log(`DEBUG: Backend using table-only architecture - gameId: ${gameId}`);
      
      // Store session data for the table
      socket.data.buyIn = buyIn;
      socket.data.gameId = gameId;
      socket.data.tableId = tableId;
      socket.data.dbTableId = dbTable.id;
      socket.data.nickname = player.nickname;
      socket.data.playerId = socket.id;
      
      console.log(`DEBUG: Backend session data SET for socket ${socket.id}:`, {
        buyIn: socket.data.buyIn,
        gameId: socket.data.gameId,
        tableId: socket.data.tableId,
        dbTableId: socket.data.dbTableId,
        nickname: socket.data.nickname,
        playerId: socket.data.playerId
      });
      
      // Join the game room as observer
      socket.join(`game:${gameId}`);
      socket.join(`table:${gameId}`); // Also join table room for compatibility
      
      // Get current table game state from TableManager
      const tableGameState = tableManager.getTableGameState(tableId);
      if (tableGameState) {
        console.log(`DEBUG: Backend found existing table game state for table ${tableId}`);
        
        // Emit location update event
        io.to(`game:${gameId}`).emit('location:updated', { 
          playerId: socket.id,
          nickname: player.nickname,
          table: tableId,
          seat: null
        });
        
        // Emit success events - user joins as observer
        socket.emit('tableJoined', { tableId, role: 'observer', buyIn: buyIn || 0, gameId });
        socket.emit('gameJoined', { gameId, playerId: socket.id, gameState: tableGameState });
        
        console.log(`DEBUG: Backend successfully joined ${player.nickname} as observer to table ${tableId}`);
      } else {
        console.log(`DEBUG: Backend no existing table game state for table ${tableId} - creating minimal state`);
        
        // Create minimal game state for observer
        const minimalGameState = {
          id: gameId,
          tableId: tableId,
          status: 'waiting' as const,
          phase: 'waiting' as const,
          pot: 0,
          players: [],
          communityCards: [],
          currentPlayerId: null,
          dealerPosition: 0,
          smallBlindPosition: 1,
          bigBlindPosition: 2,
          currentBet: 0,
          minBet: 0,
          handNumber: 1
        };
        
        // Emit location update event
        io.to(`game:${gameId}`).emit('location:updated', { 
          playerId: socket.id,
          nickname: player.nickname,
          table: tableId,
          seat: null
        });
        
        // Emit success events - user joins as observer
        socket.emit('tableJoined', { tableId, role: 'observer', buyIn: buyIn || 0, gameId });
        socket.emit('gameJoined', { gameId, playerId: socket.id, gameState: minimalGameState });
        
        console.log(`DEBUG: Backend successfully joined ${player.nickname} as observer to table ${tableId} with minimal state`);
      }
      
    } catch (error) {
      console.error('Error joining table:', error);
      socket.emit('tableError', (error as Error).message || 'Failed to join table');
    }
  });

  // Handle table leave request
  socket.on('leaveTable', ({ tableId }) => {
    console.log(`DEBUG: Backend received leaveTable event - tableId: ${tableId}, socket: ${socket.id}`);
    
    if (tableId === 0) {
      // Special case: tableId 0 means "leave all tables and clear session"
      console.log(`DEBUG: Backend clearing all session data for socket ${socket.id}`);
      
      // Leave all tables
      const allTables = tableManager.getAllTables();
      for (const table of allTables) {
        if (tableManager.leaveTable(table.id, socket.id)) {
          socket.leave(`table:${table.id}`);
        }
      }
      
      // Clear session data
      if (socket.data.gameId) {
        socket.leave(`game:${socket.data.gameId}`);
        // In table-only architecture, room management is handled by TableManager
      }
      
      // Clear all socket session data
      socket.data.buyIn = undefined;
      socket.data.gameId = undefined;
      socket.data.tableId = undefined;
      socket.data.dbTableId = undefined;
      socket.data.nickname = undefined;
      socket.data.playerId = undefined;
      
      // Move user to lobby in location manager
      // Try to get nickname from user's current location or just use socket ID
      const userLocation = locationManager.getUserLocation(socket.id);
      const nickname = userLocation?.nickname || `Player${socket.id.slice(0, 4)}`;
      locationManager.moveToLobby(socket.id, nickname);
      
      console.log(`DEBUG: Backend session cleared for socket ${socket.id}`);
      broadcastTables();
      return;
    }
    
    // Normal table leave logic
    if (tableManager.leaveTable(tableId, socket.id)) {
      socket.leave(`table:${tableId}`);
      
      // Also leave any associated game
      if (socket.data.gameId) {
        socket.leave(`game:${socket.data.gameId}`);
        // In table-only architecture, room management is handled by TableManager
        
        // Clear session data when leaving table
        socket.data.buyIn = undefined;
        socket.data.gameId = undefined;
        socket.data.tableId = undefined;
        socket.data.dbTableId = undefined;
        socket.data.nickname = undefined;
        socket.data.playerId = undefined;
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

  // Handle room joining requests
  socket.on('joinRoom', (roomName: string) => {
    console.log(`DEBUG: Backend received joinRoom event - room: ${roomName}, socket: ${socket.id}`);
    try {
      socket.join(roomName);
      socket.emit('roomJoined', { room: roomName });
      console.log(`DEBUG: Backend socket ${socket.id} joined room: ${roomName}`);
    } catch (error) {
      console.error(`DEBUG: Backend error joining room ${roomName}:`, error);
      socket.emit('roomError', { room: roomName, error: (error as Error).message });
    }
  });

  // Handle room leaving requests
  socket.on('leaveRoom', (roomName: string) => {
    console.log(`DEBUG: Backend received leaveRoom event - room: ${roomName}, socket: ${socket.id}`);
    try {
      socket.leave(roomName);
      socket.emit('roomLeft', { room: roomName });
      console.log(`DEBUG: Backend socket ${socket.id} left room: ${roomName}`);
    } catch (error) {
      console.error(`DEBUG: Backend error leaving room ${roomName}:`, error);
      socket.emit('roomError', { room: roomName, error: (error as Error).message });
    }
  });

  // Handle take seat request (when observer wants to take a specific seat)
  socket.on('takeSeat', async ({ seatNumber, buyIn }) => {
    console.log(`DEBUG: Backend received takeSeat event - seatNumber: ${seatNumber}, buyIn: ${buyIn}`);
    console.log(`DEBUG: Backend takeSeat handler called on socket ID: ${socket.id}`);
    
    try {
      // Validate we have the required data from when they joined as observer
      let gameId = socket.data.gameId;
      let tableId = socket.data.tableId;
      let dbTableId = socket.data.dbTableId;
      let nickname = socket.data.nickname;
      let playerId = socket.data.playerId;
      
      console.log(`DEBUG: Backend session data check:`, {
        gameId: !!gameId,
        tableId: !!tableId,
        dbTableId: !!dbTableId,
        nickname: !!nickname,
        playerId: !!playerId,
        values: { gameId, tableId, dbTableId, nickname, playerId }
      });
      
      if (!gameId || !tableId || !dbTableId || !nickname || !playerId) {
        console.log(`DEBUG: Backend missing session data - attempting to reconstruct from user location`);
        
        // CRITICAL FIX: Reconstruct session data from user's current location
        const userLocation = locationManager.getUserLocation(socket.id);
        if (!userLocation || userLocation.table === null) {
          console.log(`DEBUG: Backend cannot reconstruct - user not at any table`);
          socket.emit('seatError', 'Invalid session data. Please rejoin the table.');
          return;
        }
        
        // Get player info from database
        const player = await prisma.player.findUnique({
          where: { id: socket.id }
        });
        
        if (!player) {
          console.log(`DEBUG: Backend cannot reconstruct - player not found in database`);
          socket.emit('seatError', 'Invalid session data. Please rejoin the table.');
          return;
        }
        
        // Reconstruct missing session data
        const reconstructedTableId = userLocation.table;
        const reconstructedNickname = player.nickname;
        const reconstructedPlayerId = socket.id;
        
        // Find the corresponding database table and game
        const lobbyTable = tableManager.getTable(reconstructedTableId);
        if (!lobbyTable) {
          console.log(`DEBUG: Backend cannot reconstruct - lobby table ${reconstructedTableId} not found`);
          socket.emit('seatError', 'Invalid session data. Please rejoin the table.');
          return;
        }
        
        const dbTableName = `${lobbyTable.name} (ID: ${reconstructedTableId})`;
        const dbTable = await prisma.table.findFirst({
          where: { name: dbTableName }
        });
        
        if (!dbTable) {
          console.log(`DEBUG: Backend cannot reconstruct - database table not found`);
          socket.emit('seatError', 'Invalid session data. Please rejoin the table.');
          return;
        }
        
        // Find existing game for this table
        const existingGame = await prisma.game.findFirst({
          where: {
            tableId: dbTable.id,
            status: { in: ['waiting', 'active'] }
          }
        });
        
        if (!existingGame) {
          console.log(`DEBUG: Backend cannot reconstruct - no active game for table`);
          socket.emit('seatError', 'Invalid session data. Please rejoin the table.');
          return;
        }
        
        // Reconstruct session data
        socket.data.gameId = existingGame.id;
        socket.data.tableId = reconstructedTableId;
        socket.data.dbTableId = dbTable.id;
        socket.data.nickname = reconstructedNickname;
        socket.data.playerId = reconstructedPlayerId;
        socket.data.buyIn = buyIn; // Use the provided buyIn
        
        console.log(`DEBUG: Backend successfully reconstructed session data:`, {
          gameId: socket.data.gameId,
          tableId: socket.data.tableId,
          dbTableId: socket.data.dbTableId,
          nickname: socket.data.nickname,
          playerId: socket.data.playerId,
          buyIn: socket.data.buyIn
        });
        
        // Update variables for the rest of the function
        gameId = socket.data.gameId;
        tableId = socket.data.tableId;
        dbTableId = socket.data.dbTableId;
        nickname = socket.data.nickname;
        playerId = socket.data.playerId;
      }
      
      // Get the table info for buy-in validation
      const lobbyTable = tableManager.getTable(tableId);
      if (!lobbyTable) {
        socket.emit('seatError', 'Table not found');
        return;
      }
      
      // DISABLED FOR TESTING: Buy-in validation temporarily disabled
      // if (!buyIn || buyIn < lobbyTable.minBuyIn || buyIn > lobbyTable.maxBuyIn) {
      //   socket.emit('seatError', `Buy-in must be between ${lobbyTable.minBuyIn} and ${lobbyTable.maxBuyIn}`);
      //   return;
      // }
      
      // Basic validation: just ensure buyIn is a positive number
      if (!buyIn || buyIn <= 0) {
        socket.emit('seatError', 'Buy-in must be a positive number');
        return;
      }
      
      // In table-only architecture, we use TableManager instead of gameManager
      const tableGameState = tableManager.getTableGameState(tableId);
      if (!tableGameState) {
        socket.emit('seatError', 'Table not found');
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
      
      // Clean up any existing instances of this nickname to prevent duplicates
      locationManager.removeUserByNickname(nickname);
      
      // In table-only architecture, player management is handled by TableManager
      // The player is already added to the table via the joinTable process
      console.log(`DEBUG: Backend player ${nickname} already added to table ${tableId} via joinTable`);
      
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
          
          // In table-only architecture, player removal is handled by TableManager
          console.log(`DEBUG: Backend player removal handled by TableManager for ${nickname}`);
          
          socket.emit('seatError', `Seat ${seatNumber} was just taken by another player`);
          return;
        } else {
          console.error('DEBUG: Backend database error creating PlayerTable:', dbError);
          
          // In table-only architecture, player removal is handled by TableManager
          console.log(`DEBUG: Backend player removal handled by TableManager for ${nickname}`);
          
          socket.emit('seatError', `Database error: ${dbError.message || 'Failed to take seat'}`);
          return;
        }
      }
      
      // Update stored buy-in for this player
      socket.data.buyIn = buyIn;
      
      // Get updated game state from TableManager
      let gameState = tableManager.getTableGameState(tableId);
      if (!gameState) {
        socket.emit('seatError', 'Table game state not found');
        return;
      }
      
      // **AUTO-START LOGIC DISABLED FOR TESTING**: Manual start only
      // Use the test API endpoint /api/test/start-game to manually start games
      console.log(`DEBUG: Game has ${gameState.players.length} players (status: ${gameState.status})`);
      console.log(`DEBUG: Auto-start disabled - use manual start for testing`);
      
      // if (gameState.status === 'waiting' && gameState.players.length >= 2) {
      //   try {
      //     console.log(`DEBUG: Auto-starting game with ${gameState.players.length} players`);
      //     gameService.startGame();
      //     gameState = gameService.getGameState(); // Get updated state after start
      //     console.log(`DEBUG: Game auto-started successfully - new phase: ${gameState.phase}`);
      //   } catch (startError) {
      //     console.error(`DEBUG: Failed to auto-start game:`, startError);
      //     // Continue with seat assignment even if auto-start fails
      //   }
      // }
      
      // Update user location from observer to player seat
      await locationManager.moveToTableSeat(socket.id, nickname, tableId, seatNumber);
      
      // Emit location update to notify all clients
      io.to(`game:${gameId}`).emit('location:updated', { 
        playerId: socket.id,
        nickname: nickname,
        table: tableId,
        seat: seatNumber
      });
      console.log(`DEBUG: Backend updated ${nickname} location to table ${tableId}, seat ${seatNumber}`);

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
    
    // Remove user from authenticated users tracking
    for (const [key, user] of authenticatedUsers.entries()) {
      if (user.socketId === socket.id) {
        authenticatedUsers.delete(key);
        console.log(`DEBUG: Removed disconnected user ${user.nickname} from authenticated users tracking`);
        break;
      }
    }
    broadcastOnlineUsersUpdate();
    
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