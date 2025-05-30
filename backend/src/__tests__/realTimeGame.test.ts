import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { createServer } from 'http';
import { gameManager } from '../services/gameManager';
import { prisma } from '../db';
import { registerGameHandlers } from '../socketHandlers/gameHandler';

describe('Real-time Game Integration', () => {
  let httpServer: any;
  let io: Server;
  let clientSocket: any;
  let tableId: string;
  let playerId1: string;
  let playerId2: string;

  beforeEach(async () => {
    // Clean up database
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();

    // Create test data
    const player1 = await prisma.player.create({
      data: { nickname: 'RealTimePlayer1', chips: 1000 }
    });
    const player2 = await prisma.player.create({
      data: { nickname: 'RealTimePlayer2', chips: 1000 }
    });
    playerId1 = player1.id;
    playerId2 = player2.id;

    const table = await prisma.table.create({
      data: {
        name: 'Real-time Test Table',
        maxPlayers: 6,
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000
      }
    });
    tableId = table.id;

    await prisma.playerTable.createMany({
      data: [
        { playerId: playerId1, tableId, seatNumber: 1, buyIn: 500 },
        { playerId: playerId2, tableId, seatNumber: 2, buyIn: 500 }
      ]
    });

    // Setup Socket.io server
    httpServer = createServer();
    io = new Server(httpServer);
    registerGameHandlers(io);
    
    return new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as any).port;
        clientSocket = Client(`http://localhost:${port}`);
        
        clientSocket.on('connect', () => {
          resolve();
        });
      });
    });
  });

  afterEach(() => {
    httpServer.close();
    clientSocket.close();
  });

  afterAll(async () => {
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();
  });

  it('should connect to socket and receive game state updates', async () => {
    // Create game via GameManager (not through socket)
    const gameState = await gameManager.createGame(tableId);
    const gameId = gameState.id;

    // Set up the socket server for the game manager
    gameManager.setSocketServer(io);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout - no game state received'));
      }, 5000);

      // Join the game room
      clientSocket.emit('game:join', { gameId });

      // Listen for game state updates
      clientSocket.on('gameState', (receivedGameState: any) => {
        try {
          expect(receivedGameState).toHaveProperty('id', gameId);
          expect(receivedGameState).toHaveProperty('players');
          expect(receivedGameState.players).toHaveLength(2);
          clearTimeout(timeout);
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Request current game state
      clientSocket.emit('game:getState', { gameId });
    });
  });

  it('should receive real-time updates when a player action occurs', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const gameId = gameState.id;
    gameManager.setSocketServer(io);
    await gameManager.startGame(gameId);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout - no player action update received'));
      }, 5000);

      // Join the game room
      clientSocket.emit('game:join', { gameId });

      // Listen for game state updates
      let updateCount = 0;
      clientSocket.on('gameState', (receivedGameState: any) => {
        updateCount++;
        // Wait for the update after the call action
        if (updateCount >= 2 && receivedGameState.pot === 20) {
          clearTimeout(timeout);
          resolve();
        }
      });

      // Make a call action via GameManager
      setTimeout(() => {
        gameManager.call(gameId, playerId1);
      }, 100);
    });
  });
}); 