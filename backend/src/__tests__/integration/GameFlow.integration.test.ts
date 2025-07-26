import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as clientIo, Socket as ClientSocket } from 'socket.io-client';
import { tableManager } from '../../services/TableManager';
import { registerConsolidatedHandlers } from '../../socketHandlers/consolidatedHandler';

/**
 * TDD Integration Tests for Complete Game Flow
 * Tests the full poker game cycle from join to showdown
 */
describe('Game Flow Integration Tests - TDD', () => {
  let server: any;
  let io: Server;
  let clientSockets: ClientSocket[] = [];
  let port: number;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });
    
    registerConsolidatedHandlers(io);
    
    httpServer.listen(() => {
      port = (httpServer.address() as any).port;
      server = httpServer;
      done();
    });
  });

  afterAll((done) => {
    clientSockets.forEach(socket => socket.disconnect());
    io.close();
    server.close(done);
  });

  beforeEach(async () => {
    // Clear any existing connections
    clientSockets.forEach(socket => socket.disconnect());
    clientSockets = [];
    
    // Reset table manager state
    await tableManager.init();
  });

  // Helper function to create authenticated client
  const createAuthenticatedClient = (nickname: string): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const client = clientIo(`http://localhost:${port}`, {
        transports: ['websocket']
      });

      client.on('connect', () => {
        client.emit('authenticate', { nickname });
      });

      client.on('authenticated', () => {
        clientSockets.push(client);
        resolve(client);
      });

      client.on('error', reject);
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  };

  describe('RED Phase - Full Game Flow Requirements', () => {
    it('should fail to start game with insufficient players', async () => {
      const client = await createAuthenticatedClient('Player1');
      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // Join table and take seat
      await new Promise<void>((resolve) => {
        client.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
        client.on('autoSeatSuccess', () => resolve());
      });

      // Try to start game with only 1 player
      await new Promise<void>((resolve) => {
        client.emit('startGame', { tableId });
        client.on('error', (error) => {
          expect(error.message).toBe('Need at least 2 players to start');
          resolve();
        });
      });
    });

    it('should require authentication before joining table', async () => {
      const client = clientIo(`http://localhost:${port}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => {
          const tables = tableManager.getAllTables();
          client.emit('joinTable', { tableId: tables[0].id });
        });

        client.on('error', (error) => {
          expect(error.message).toBe('Must authenticate first');
          client.disconnect();
          resolve();
        });
      });
    });

    it('should prevent taking occupied seats', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // Player 1 takes seat 1
      await new Promise<void>((resolve) => {
        client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
        client1.on('autoSeatSuccess', () => resolve());
      });

      // Player 2 tries to take the same seat
      await new Promise<void>((resolve) => {
        client2.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
        client2.on('autoSeatError', (error) => {
          expect(error.error).toContain('already taken');
          resolve();
        });
      });
    });
  });

  describe('GREEN Phase - Successful Game Flow', () => {
    it('should complete full 2-player game cycle', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;
      let gameState: any = null;

      // Both players join and take seats
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
          client1.on('autoSeatSuccess', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.emit('autoSeat', { tableId, seatNumber: 2, buyIn: 1000 });
          client2.on('autoSeatSuccess', () => resolve());
        })
      ]);

      // Start game
      await new Promise<void>((resolve) => {
        client1.emit('startGame', { tableId });
        
        const gameStateHandler = (state: any) => {
          gameState = state;
          if (state.status === 'playing' && state.phase === 'preflop') {
            resolve();
          }
        };
        
        client1.on('gameState', gameStateHandler);
        client2.on('gameState', gameStateHandler);
      });

      expect(gameState).toBeTruthy();
      expect(gameState.status).toBe('playing');
      expect(gameState.phase).toBe('preflop');
      expect(gameState.players).toHaveLength(2);
      expect(gameState.pot).toBeGreaterThan(0); // Blinds posted

      // Complete preflop betting round
      await new Promise<void>((resolve) => {
        const actionHandler = (state: any) => {
          gameState = state;
          if (state.phase === 'flop') {
            resolve();
          }
        };

        client1.on('gameState', actionHandler);
        client2.on('gameState', actionHandler);

        // Current player calls, then check/check
        if (gameState.currentPlayerId === 'Player1') {
          client1.emit('playerAction', { tableId, action: 'call' });
        } else {
          client2.emit('playerAction', { tableId, action: 'call' });
        }
      });

      expect(gameState.phase).toBe('flop');
      expect(gameState.board).toHaveLength(3); // Flop cards dealt
    });

    it('should handle player actions correctly', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // Setup game
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
          client1.on('autoSeatSuccess', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.emit('autoSeat', { tableId, seatNumber: 2, buyIn: 1000 });
          client2.on('autoSeatSuccess', () => resolve());
        })
      ]);

      await new Promise<void>((resolve) => {
        client1.emit('startGame', { tableId });
        client1.on('gameState', (state) => {
          if (state.status === 'playing') resolve();
        });
      });

      // Test fold action
      await new Promise<void>((resolve) => {
        client1.on('gameState', (state) => {
          const foldedPlayer = state.players.find((p: any) => !p.isActive);
          if (foldedPlayer) {
            expect(foldedPlayer.name).toBe('Player1');
            resolve();
          }
        });

        client1.emit('playerAction', { tableId, action: 'fold' });
      });
    });

    it('should maintain game state consistency across clients', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;
      const gameStates: any[] = [];

      // Setup game
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
          client1.on('autoSeatSuccess', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.emit('autoSeat', { tableId, seatNumber: 2, buyIn: 1000 });
          client2.on('autoSeatSuccess', () => resolve());
        })
      ]);

      // Capture game states from both clients
      client1.on('gameState', (state) => gameStates.push({ client: 1, state }));
      client2.on('gameState', (state) => gameStates.push({ client: 2, state }));

      await new Promise<void>((resolve) => {
        client1.emit('startGame', { tableId });
        setTimeout(() => resolve(), 1000); // Wait for state sync
      });

      // Verify both clients received identical game states
      const client1States = gameStates.filter(g => g.client === 1);
      const client2States = gameStates.filter(g => g.client === 2);

      expect(client1States.length).toBeGreaterThan(0);
      expect(client2States.length).toBeGreaterThan(0);

      // Compare latest states
      const latestState1 = client1States[client1States.length - 1].state;
      const latestState2 = client2States[client2States.length - 1].state;

      expect(latestState1.pot).toBe(latestState2.pot);
      expect(latestState1.currentPlayerId).toBe(latestState2.currentPlayerId);
      expect(latestState1.phase).toBe(latestState2.phase);
    });
  });

  describe('REFACTOR Phase - Advanced Game Scenarios', () => {
    it('should handle all-in scenarios correctly', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // Setup with small stacks for all-in scenario
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 100 });
          client1.on('autoSeatSuccess', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.emit('autoSeat', { tableId, seatNumber: 2, buyIn: 100 });
          client2.on('autoSeatSuccess', () => resolve());
        })
      ]);

      let gameState: any;
      await new Promise<void>((resolve) => {
        client1.emit('startGame', { tableId });
        client1.on('gameState', (state) => {
          gameState = state;
          if (state.status === 'playing') resolve();
        });
      });

      // Player goes all-in
      await new Promise<void>((resolve) => {
        client1.on('gameState', (state) => {
          const allInPlayer = state.players.find((p: any) => p.chips === 0);
          if (allInPlayer) {
            expect(allInPlayer.name).toBe('Player1');
            expect(state.pot).toBe(100); // All chips in pot
            resolve();
          }
        });

        client1.emit('playerAction', { tableId, action: 'allIn' });
      });
    });

    it('should handle disconnection and reconnection', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // Setup game
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
          client1.on('autoSeatSuccess', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.emit('autoSeat', { tableId, seatNumber: 2, buyIn: 1000 });
          client2.on('autoSeatSuccess', () => resolve());
        })
      ]);

      await new Promise<void>((resolve) => {
        client1.emit('startGame', { tableId });
        client1.on('gameState', (state) => {
          if (state.status === 'playing') resolve();
        });
      });

      // Disconnect player 1
      client1.disconnect();

      // Wait for disconnect handling
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reconnect player 1
      const reconnectedClient = await createAuthenticatedClient('Player1');
      
      // Request current game state
      await new Promise<void>((resolve) => {
        reconnectedClient.emit('requestGameState', { tableId });
        reconnectedClient.on('gameState', (state) => {
          expect(state.status).toBe('playing');
          expect(state.players.some((p: any) => p.name === 'Player1')).toBe(true);
          resolve();
        });
      });
    });

    it('should handle rapid sequential actions', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // Setup game
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
          client1.on('autoSeatSuccess', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.emit('autoSeat', { tableId, seatNumber: 2, buyIn: 1000 });
          client2.on('autoSeatSuccess', () => resolve());
        })
      ]);

      await new Promise<void>((resolve) => {
        client1.emit('startGame', { tableId });
        client1.on('gameState', (state) => {
          if (state.status === 'playing') resolve();
        });
      });

      // Send rapid actions (should be handled sequentially)
      const actions = ['call', 'check', 'bet'];
      const actionPromises = actions.map((action, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            client1.emit('playerAction', { 
              tableId, 
              action, 
              amount: action === 'bet' ? 100 : undefined 
            });
            resolve();
          }, index * 100);
        });
      });

      await Promise.all(actionPromises);

      // Verify actions were processed correctly
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // Game state should be consistent
          client1.emit('requestGameState', { tableId });
          client1.on('gameState', (state) => {
            expect(state.status).toBe('playing');
            resolve();
          });
        }, 1000);
      });
    });

    it('should validate betting amounts and rules', async () => {
      const [client1, client2] = await Promise.all([
        createAuthenticatedClient('Player1'),
        createAuthenticatedClient('Player2')
      ]);

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // Setup game
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.emit('autoSeat', { tableId, seatNumber: 1, buyIn: 1000 });
          client1.on('autoSeatSuccess', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.emit('autoSeat', { tableId, seatNumber: 2, buyIn: 1000 });
          client2.on('autoSeatSuccess', () => resolve());
        })
      ]);

      await new Promise<void>((resolve) => {
        client1.emit('startGame', { tableId });
        client1.on('gameState', (state) => {
          if (state.status === 'playing') resolve();
        });
      });

      // Try invalid bet (more than player has)
      await new Promise<void>((resolve) => {
        client1.on('error', (error) => {
          expect(error.message).toContain('Not enough chips');
          resolve();
        });

        client1.emit('playerAction', { 
          tableId, 
          action: 'bet', 
          amount: 2000 // More than player's 1000 chips
        });
      });

      // Try acting out of turn
      await new Promise<void>((resolve) => {
        client2.on('error', (error) => {
          expect(error.message).toContain('Not your turn');
          resolve();
        });

        // Assume client1 is current player, client2 tries to act
        client2.emit('playerAction', { tableId, action: 'check' });
      });
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle multiple simultaneous connections', async () => {
      const playerCount = 5;
      const clients = await Promise.all(
        Array.from({ length: playerCount }, (_, i) => 
          createAuthenticatedClient(`Player${i + 1}`)
        )
      );

      const tables = tableManager.getAllTables();
      const tableId = tables[0].id;

      // All players join table simultaneously
      await Promise.all(
        clients.map((client, index) => 
          new Promise<void>((resolve) => {
            client.emit('autoSeat', { 
              tableId, 
              seatNumber: index + 1, 
              buyIn: 1000 
            });
            client.on('autoSeatSuccess', () => resolve());
          })
        )
      );

      // Verify all players are seated
      const finalTable = tableManager.getTable(tableId);
      expect(finalTable?.players).toBe(playerCount);

      // Clean up additional clients
      clients.slice(2).forEach(client => client.disconnect());
    });
  });
});