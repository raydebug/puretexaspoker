import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { prisma } from '../db';
import { tableManager } from '../services/TableManager';
import { locationManager } from '../services/LocationManager';

describe('Observer to Player Transition Bug Fix', () => {
  let httpServer: any;
  let io: Server;
  let clientSocket: any;
  let tableId: number;
  let dbTableId: string;

  beforeAll(async () => {
    // Setup test HTTP server and Socket.IO
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Import and register handlers
    const { registerConsolidatedHandlers } = await import('../socketHandlers/consolidatedHandler');
    registerConsolidatedHandlers(io);

    await new Promise((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as any).port;
        clientSocket = Client(`http://localhost:${port}`);
        clientSocket.on('connect', resolve);
      });
    });
  });

  afterAll(async () => {
    clientSocket.close();
    httpServer.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.gameActionHistory.deleteMany();
    await prisma.gameAction.deleteMany();
    await prisma.cardOrder.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();
    // No gameManager cleanup needed in table-only architecture

    // Create test table
    const table = await prisma.table.create({
      data: {
        name: 'Observer Test Table',
        maxPlayers: 9,
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 40,
        maxBuyIn: 200
      }
    });

    dbTableId = table.id;
    tableId = 1; // Use table 1 which should exist in TableManager by default
  });

  it('should remove player from observers list when taking a seat', async () => {
    const nickname = 'TestObserver';
    let observersUpdateReceived = false;
    let finalObserversList: string[] = [];
    let finalPlayersList: any[] = [];
    let apiObservers: Array<{ playerId: string; nickname: string }> = [];
    let apiPlayers: Array<{ playerId: string; nickname: string; seat: number }> = [];

    // **NEW**: Listen for unified location:usersAtTable API to validate structure
    clientSocket.on('location:usersAtTable', (data: {
      tableId: number;
      totalUsers: number;
      observers: Array<{ playerId: string; nickname: string }>;
      players: Array<{ playerId: string; nickname: string; seat: number }>;
      observersCount: number;
      playersCount: number;
    }) => {
      console.log('🧪 Test received unified location:usersAtTable:', data);
      observersUpdateReceived = true;
      apiObservers = data.observers || [];
      apiPlayers = data.players || [];
      
      // Validate API structure
      expect(data).toHaveProperty('observers');
      expect(data).toHaveProperty('players');
      expect(data).toHaveProperty('observersCount');
      expect(data).toHaveProperty('playersCount');
      expect(Array.isArray(data.observers)).toBe(true);
      expect(Array.isArray(data.players)).toBe(true);
      expect(data.observersCount).toBe(data.observers.length);
      expect(data.playersCount).toBe(data.players.length);
    });

    // Listen for game state updates
    clientSocket.on('gameState', (gameState: any) => {
      console.log('🧪 Test received gameState update:', {
        players: gameState.players.length,
        playerNames: gameState.players.map((p: any) => p.name)
      });
      finalPlayersList = gameState.players;
    });

    // Listen for online users updates (contains observers list)
    clientSocket.on('onlineUsersUpdate', (data: any) => {
      console.log('🧪 Test received onlineUsersUpdate:', data);
      if (data.observers) {
        finalObserversList = data.observers;
      }
    });

    // Step 1: Join table as observer
    await new Promise<void>((resolve) => {
      clientSocket.emit('joinTable', { 
        tableId: tableId, 
        buyIn: 150, 
        nickname: nickname 
      });
      
      clientSocket.once('tableJoined', (data: any) => {
        console.log('🧪 Test: Player joined as observer:', data);
        expect(data.role).toBe('observer');
        resolve();
      });
    });

    // Wait for initial state to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Check that player is in observers list
    const observersBeforeSeat = await prisma.player.findMany({
      where: { table: tableId, seat: null }
    });
    
    expect(observersBeforeSeat.length).toBe(1);
    expect(observersBeforeSeat[0].nickname).toBe(nickname);
    console.log('🧪 Test: Before taking seat - observers in DB:', observersBeforeSeat);

    // Step 3: Take a seat
    await new Promise<void>((resolve) => {
      clientSocket.emit('takeSeat', { 
        seatNumber: 3, 
        buyIn: 150 
      });
      
      clientSocket.once('seatTaken', (data: any) => {
        console.log('🧪 Test: Seat taken successfully:', data);
        expect(data.seatNumber).toBe(3);
        resolve();
      });
    });

    // Wait for all updates to propagate
    await new Promise(resolve => setTimeout(resolve, 200));

    // Step 4: Verify player is removed from observers and added to players
    const observersAfterSeat = await prisma.player.findMany({
      where: { table: tableId, seat: null }
    });

    const playersAfterSeat = await prisma.player.findMany({
      where: { table: tableId, seat: { not: null } }
    });

    const playerTableRecord = await prisma.playerTable.findFirst({
      where: { tableId: dbTableId, seatNumber: 3 }
    });

    console.log('🧪 Test: After taking seat:');
    console.log('  - Observers in DB:', observersAfterSeat);
    console.log('  - Players in DB:', playersAfterSeat);
    console.log('  - PlayerTable record:', playerTableRecord);
    console.log('  - Final observers list from frontend:', finalObserversList);
    console.log('  - Final players list from frontend:', finalPlayersList);
    console.log('  - API observers:', apiObservers);
    console.log('  - API players:', apiPlayers);

    // **DATABASE ASSERTIONS**
    expect(observersAfterSeat.length).toBe(0); // No observers should remain
    expect(playersAfterSeat.length).toBe(1); // One player should be seated
    expect(playersAfterSeat[0].nickname).toBe(nickname);
    expect(playersAfterSeat[0].seat).toBe(3);
    expect(playerTableRecord).toBeTruthy();
    expect(playerTableRecord?.seatNumber).toBe(3);

    // **UNIFIED API ASSERTIONS** - Test the new structure
    expect(apiObservers.length).toBe(0); // No observers in API response
    expect(apiPlayers.length).toBe(1); // One player in API response
    expect(apiPlayers[0].nickname).toBe(nickname);
    expect(apiPlayers[0].seat).toBe(3);
    
    // **NO OVERLAPS**: Ensure player is not in both lists
    const observerNicknames = apiObservers.map(o => o.nickname);
    const playerNicknames = apiPlayers.map(p => p.nickname);
    const hasOverlap = observerNicknames.some(name => playerNicknames.includes(name));
    expect(hasOverlap).toBe(false);
    
    // **NO DUPLICATES**: Check within each list
    const uniqueObserverNames = new Set(observerNicknames);
    const uniquePlayerNames = new Set(playerNicknames);
    expect(uniqueObserverNames.size).toBe(observerNicknames.length);
    expect(uniquePlayerNames.size).toBe(playerNicknames.length);

    // Verify frontend state is updated correctly (legacy checks)
    expect(finalObserversList).not.toContain(nickname); // Should not be in observers
    expect(finalPlayersList.some((p: any) => p.name === nickname)).toBe(true); // Should be in players
  });

  it('should handle multiple players transitioning from observers to seats', async () => {
    const players = ['Observer1', 'Observer2', 'Observer3'];
    const clientSockets: any[] = [];

    try {
      // Create multiple client connections
      for (let i = 0; i < players.length; i++) {
        const port = (httpServer.address() as any).port;
        const socket = Client(`http://localhost:${port}`);
        await new Promise((resolve) => socket.on('connect', resolve));
        clientSockets.push(socket);
      }

      // All players join as observers
      for (let i = 0; i < players.length; i++) {
        await new Promise<void>((resolve) => {
          clientSockets[i].emit('joinTable', { 
            tableId: tableId, 
            buyIn: 150, 
            nickname: players[i] 
          });
          
          clientSockets[i].once('tableJoined', (data: any) => {
            expect(data.role).toBe('observer');
            resolve();
          });
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all are observers initially
      const initialObservers = await prisma.player.findMany({
        where: { table: tableId, seat: null }
      });
      expect(initialObservers.length).toBe(3);

      // Players take seats sequentially
      for (let i = 0; i < players.length; i++) {
        await new Promise<void>((resolve) => {
          clientSockets[i].emit('takeSeat', { 
            seatNumber: i + 1, 
            buyIn: 150 
          });
          
          clientSockets[i].once('seatTaken', (data: any) => {
            expect(data.seatNumber).toBe(i + 1);
            resolve();
          });
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final verification
      const finalObservers = await prisma.player.findMany({
        where: { table: tableId, seat: null }
      });

      const finalPlayers = await prisma.player.findMany({
        where: { table: tableId, seat: { not: null } }
      });

      expect(finalObservers.length).toBe(0); // No observers should remain
      expect(finalPlayers.length).toBe(3); // All should be seated players
      
      for (let i = 0; i < players.length; i++) {
        const playerRecord = finalPlayers.find((p: any) => p.nickname === players[i]);
        expect(playerRecord).toBeTruthy();
        expect(playerRecord?.seat).toBe(i + 1);
      }

    } finally {
      // Clean up all client connections
      clientSockets.forEach(socket => socket.close());
    }
  });

  it('should validate unified API: count consistency, no overlaps, no duplicates', async () => {
    let latestApiResponse: any = null;
    let gameIdForRoom: string | null = null;

    // Create a dedicated socket for API monitoring
    const port = (httpServer.address() as any).port;
    const monitorSocket = Client(`http://localhost:${port}`);
    await new Promise((resolve) => monitorSocket.on('connect', resolve));

    // Listen for location:usersAtTable events and capture the latest
    monitorSocket.on('location:usersAtTable', (data: any) => {
      console.log('🧪 API Monitor received location:usersAtTable:', data);
      latestApiResponse = data;
    });

    // Declare sockets outside try block for cleanup
    const observerSockets: any[] = [];

    try {
      // Step 1: Create first observer to get gameId
      const socket1 = Client(`http://localhost:${port}`);
      await new Promise((resolve) => socket1.on('connect', resolve));
      observerSockets.push(socket1);

      await new Promise<void>((resolve) => {
        socket1.emit('joinTable', { tableId, buyIn: 150, nickname: 'Observer1' });
        socket1.once('tableJoined', (data: any) => {
          gameIdForRoom = data.gameId;
          console.log('🧪 Got gameId for monitor:', gameIdForRoom);
          resolve();
        });
      });

      // Monitor socket joins the game room to receive events
      if (gameIdForRoom) {
        monitorSocket.emit('joinRoom', `game:${gameIdForRoom}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 2: Create remaining observers  
      const observerNames = ['Observer2', 'Observer3'];
      
      for (const name of observerNames) {
        const socket = Client(`http://localhost:${port}`);
        await new Promise((resolve) => socket.on('connect', resolve));
        observerSockets.push(socket);

        await new Promise<void>((resolve) => {
          socket.emit('joinTable', { tableId, buyIn: 150, nickname: name });
          socket.once('tableJoined', () => resolve());
        });
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for event processing
      }

      // Wait for API response after all observers joined
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(latestApiResponse).toBeTruthy();

      console.log('🧪 After observers joined:', {
        observers: latestApiResponse.observers.length,
        players: latestApiResponse.players.length,
        total: latestApiResponse.totalUsers
      });

      // **VALIDATION 1: Count Consistency (Observers Only)**
      expect(latestApiResponse.totalUsers).toBe(latestApiResponse.observersCount + latestApiResponse.playersCount);
      expect(latestApiResponse.observersCount).toBe(3);
      expect(latestApiResponse.playersCount).toBe(0);
      expect(latestApiResponse.totalUsers).toBe(3);

             // Step 2: Move 2 observers to seats (become players)
      
      // First observer takes seat 1
      await new Promise<void>((resolve) => {
        observerSockets[0].emit('takeSeat', { seatNumber: 1, buyIn: 150 });
        observerSockets[0].once('seatTaken', () => resolve());
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second observer takes seat 2  
      await new Promise<void>((resolve) => {
        observerSockets[1].emit('takeSeat', { seatNumber: 2, buyIn: 150 });
        observerSockets[1].once('seatTaken', () => resolve());
      });
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('🧪 After 2 players took seats:', {
        observers: latestApiResponse.observers.length,
        players: latestApiResponse.players.length,
        total: latestApiResponse.totalUsers,
        observerNames: latestApiResponse.observers.map((o: any) => o.nickname),
        playerNames: latestApiResponse.players.map((p: any) => p.nickname)
      });

      // **CRITICAL VALIDATIONS**
      
      // **VALIDATION 1: Count of observers + players = total online users**
      expect(latestApiResponse.observersCount + latestApiResponse.playersCount).toBe(latestApiResponse.totalUsers);
      expect(latestApiResponse.observersCount).toBe(1); // Observer3 still observing
      expect(latestApiResponse.playersCount).toBe(2);   // Observer1, Observer2 now players
      expect(latestApiResponse.totalUsers).toBe(3);     // Total should be 3

      // **VALIDATION 2: No overlap between observers and players lists**
      const observerNicknames = latestApiResponse.observers.map((o: any) => o.nickname);
      const playerNicknames = latestApiResponse.players.map((p: any) => p.nickname);
      
      // Check that no nickname appears in both lists
      const hasOverlap = observerNicknames.some((name: string) => playerNicknames.includes(name));
      expect(hasOverlap).toBe(false);
      
      console.log('🧪 Overlap validation:', {
        observerNicknames,
        playerNicknames,
        hasOverlap
      });

      // **VALIDATION 3: No duplicates within each list**
      
      // Check observers list has no duplicates
      const uniqueObserverNames = new Set(observerNicknames);
      expect(uniqueObserverNames.size).toBe(observerNicknames.length);
      
      // Check players list has no duplicates  
      const uniquePlayerNames = new Set(playerNicknames);
      expect(uniquePlayerNames.size).toBe(playerNicknames.length);
      
      console.log('🧪 Duplicates validation:', {
        observersOriginal: observerNicknames.length,
        observersUnique: uniqueObserverNames.size,
        playersOriginal: playerNicknames.length,
        playersUnique: uniquePlayerNames.size
      });

      // **EXPECTED CONTENT VALIDATION**
      expect(observerNicknames).toContain('Observer3');  // Should still be observer
      expect(playerNicknames).toContain('Observer1');    // Should be player now
      expect(playerNicknames).toContain('Observer2');    // Should be player now

      console.log('✅ All 3 critical validations passed!');

         } finally {
       // Cleanup all sockets
       monitorSocket.close();
       observerSockets.forEach((socket: any) => socket.close());
     }
  });
}); 