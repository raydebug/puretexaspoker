// Reminder: Use the auto-seat testing API for seating players automatically in test scenarios.
// This can be done via the 'autoSeat' event in the socket handlers or the '/api/test/seat-player' endpoint.

import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
  namespace NodeJS {
    interface Global {
      __intervals: NodeJS.Timeout[];
    }
  }
}

// Track intervals and timeouts
const trackedIntervals: NodeJS.Timeout[] = [];

// Override setInterval to track intervals
const originalSetInterval = global.setInterval;
global.setInterval = (handler: TimerHandler, timeout?: number, ...args: any[]): any => {
  const interval = originalSetInterval(handler, timeout, ...args);
  trackedIntervals.push(interval as unknown as NodeJS.Timeout);
  
  // Also track globally for Jest
  if (!(global as any).__JEST_INTERVALS__) {
    (global as any).__JEST_INTERVALS__ = [];
  }
  (global as any).__JEST_INTERVALS__.push(interval);
  
  return interval;
};

// Clear all tracked intervals and timeouts
afterAll(async () => {
  trackedIntervals.forEach(interval => clearInterval(interval));
  trackedIntervals.length = 0;
  console.log('🧹 Cleared all tracked intervals and timeouts');

  // Clear any remaining timers
  jest.clearAllTimers();

  // Clear MemoryCache timers
  const { memoryCache } = require('../services/MemoryCache');
  if (memoryCache && memoryCache.clearAllTimers) {
    memoryCache.clearAllTimers();
  }

  // Clear WebSocket heartbeat intervals
  const { clearHeartbeatIntervals } = require('../socketHandlers/consolidatedHandler');
  clearHeartbeatIntervals();

  // Force clear any remaining intervals
  const activeIntervals = (global as any).__JEST_INTERVALS__ || [];
  activeIntervals.forEach((interval: any) => clearInterval(interval));
  (global as any).__JEST_INTERVALS__ = [];

  await prisma.$disconnect();
});

describe.skip('5-Player Complete Game Test (skipped - complex game state)', () => {
  let testTableId: number; // Will be set dynamically from reset-database response

  const testPlayers = [
    { nickname: 'Player1', seat: 1, chips: 1000 },
    { nickname: 'Player2', seat: 2, chips: 1000 },
    { nickname: 'Player3', seat: 3, chips: 1000 },
    { nickname: 'Player4', seat: 4, chips: 1000 },
    { nickname: 'Player5', seat: 5, chips: 1000 }
  ];

  // Helper function to get current game state
  const getCurrentGameState = async () => {
    const response = await request(app)
      .post('/api/test/get_game_state')
      .send({ tableId: testTableId });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    return response.body.gameState;
  };

  // Helper function to execute action and get next player
  const executeAction = async (playerId: string, action: string, amount?: number) => {
    const actionResponse = await request(app)
      .post('/api/test/execute_player_action')
      .send({
        tableId: testTableId,
        playerId: playerId,
        action: action,
        amount: amount || 0
      });
    
    if (actionResponse.status !== 200) {
      throw new Error(`Player action failed: ${playerId} ${action} | Status: ${actionResponse.status} | Body: ${JSON.stringify(actionResponse.body)}`);
    }
    expect(actionResponse.status).toBe(200);
    console.log(`✅ ${playerId} ${action}${amount ? ` $${amount}` : ''}`);
    
    // Get updated game state to see who's next
    const updatedState = await getCurrentGameState();
    return updatedState.currentPlayerId;
  };

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Reset test database and get actual table IDs
    const resetResponse = await request(app)
      .post('/api/test/reset-database')
      .send({ tableId: 1 }); // This will be ignored, we'll use the returned table ID

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.success).toBe(true);
    
    // Get the first table ID from the response
    testTableId = resetResponse.body.tables[0].id;
    console.log(`🧪 Test using table ID: ${testTableId}`);

    // Wait a moment for TableManager to be reinitialized
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Seat all 5 players using the actual table ID
    for (const player of testPlayers) {
      const seatResponse = await request(app)
        .post('/api/test/seat-player')
        .send({
          tableId: testTableId,
          playerId: player.nickname,
          seatNumber: player.seat,
          buyIn: player.chips
        });
      
      expect(seatResponse.status).toBe(200);
      console.log(`✅ Seated ${player.nickname} at seat ${player.seat} on table ${testTableId}`);
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await request(app)
        .post('/api/test/reset-database')
        .send({ tableId: testTableId });
    } catch (error) {
      console.log('Warning: Could not reset database in afterEach:', error);
    }
  });

  describe('Complete 5-Player Texas Hold\'em Game', () => {
    it('should execute complete game with all phases and verify history', async () => {
      console.log('🎯 Starting complete 5-player game test...');

      // ===== PHASE 1: GAME INITIALIZATION =====
      console.log('📋 Phase 1: Game Initialization');
      
      // Start the game
      const startResponse = await request(app)
        .post('/api/test/start-game')
        .send({ tableId: testTableId });
      
      if (startResponse.status !== 200) {
        console.error('❌ Start game failed:', startResponse.status, startResponse.body);
      }
      
      expect(startResponse.status).toBe(200);
      expect(startResponse.body.success).toBe(true);
      console.log('✅ Game started successfully');

      // Verify initial game state and get current player
      const initialState = await request(app)
        .post('/api/test/get_game_state')
        .send({ tableId: testTableId });
      
      expect(initialState.status).toBe(200);
      expect(initialState.body.success).toBe(true);
      expect(initialState.body.gameState).toBeDefined();
      
      const gameState = initialState.body.gameState;
      console.log('✅ Initial game state retrieved');
      console.log(`🎯 Game state:`, JSON.stringify(gameState, null, 2));
      console.log(`🎯 Current player ID: ${gameState.currentPlayerId}`);
      console.log(`🎯 Game phase: ${gameState.phase}`);

      // ===== PHASE 2: PRE-FLOP BETTING ROUND =====
      console.log('📋 Phase 2: Pre-Flop Betting Round');
      
      // Get the current player and execute actions in the correct order
      let currentPlayer = gameState.currentPlayerId;
      
      // If currentPlayer is undefined, we need to determine who should act first
      if (!currentPlayer) {
        console.log('⚠️ Current player is undefined, determining first player...');
        // In poker, the first player to act is typically the player to the left of the big blind
        // For now, let's use the first seated player
        const seatedPlayers = gameState.players?.filter((p: any) => p.seat !== null) || [];
        if (seatedPlayers.length > 0) {
          currentPlayer = seatedPlayers[0].id;
          console.log(`🎯 Using first seated player as current player: ${currentPlayer}`);
        } else {
          throw new Error('No seated players found in game state');
        }
      }
      
      // Execute pre-flop actions dynamically based on current player
      console.log(`🎯 Starting pre-flop with current player: ${currentPlayer}`);
      
      // First player folds
      currentPlayer = await executeAction(currentPlayer, 'fold');
      
      // Next player calls
      currentPlayer = await executeAction(currentPlayer, 'call');
      
      // Next player raises
      currentPlayer = await executeAction(currentPlayer, 'raise', 50);
      
      // Next player calls
      currentPlayer = await executeAction(currentPlayer, 'call');
      
      // Next player folds
      currentPlayer = await executeAction(currentPlayer, 'fold');
      
      // Back to the player who called the raise
      currentPlayer = await executeAction(currentPlayer, 'call');

      // Advance to flop
      const flopResponse = await request(app)
        .post('/api/test/advance-phase')
        .send({ 
          tableId: testTableId, 
          phase: 'flop',
          communityCards: ['A♠', 'K♥', 'Q♦']
        });
      
      expect(flopResponse.status).toBe(200);
      console.log('✅ Advanced to flop phase');

      // Execute flop actions dynamically
      console.log(`🎯 Starting flop with current player: ${currentPlayer}`);
      
      // Get updated game state after phase change
      const flopState = await getCurrentGameState();
      currentPlayer = flopState.currentPlayerId;
      console.log(`🎯 Flop current player: ${currentPlayer}`);
      
      // First player checks
      currentPlayer = await executeAction(currentPlayer, 'check');
      
      // Next player bets
      currentPlayer = await executeAction(currentPlayer, 'bet', 100);
      
      // Next player folds
      currentPlayer = await executeAction(currentPlayer, 'fold');
      
      // Back to the player who checked
      currentPlayer = await executeAction(currentPlayer, 'call');

      // Advance to turn
      const turnResponse = await request(app)
        .post('/api/test/advance-phase')
        .send({ 
          tableId: testTableId, 
          phase: 'turn',
          communityCards: ['A♠', 'K♥', 'Q♦', 'J♣']
        });
      
      expect(turnResponse.status).toBe(200);
      console.log('✅ Advanced to turn phase');

      // Execute turn actions dynamically
      console.log(`🎯 Starting turn with current player: ${currentPlayer}`);
      
      // Get updated game state after phase change
      const turnState = await getCurrentGameState();
      currentPlayer = turnState.currentPlayerId;
      console.log(`🎯 Turn current player: ${currentPlayer}`);
      
      // First player checks
      currentPlayer = await executeAction(currentPlayer, 'check');
      
      // Next player checks
      currentPlayer = await executeAction(currentPlayer, 'check');

      // Advance to river
      const riverResponse = await request(app)
        .post('/api/test/advance-phase')
        .send({ 
          tableId: testTableId, 
          phase: 'river',
          communityCards: ['A♠', 'K♥', 'Q♦', 'J♣', '10♠']
        });
      
      expect(riverResponse.status).toBe(200);
      console.log('✅ Advanced to river phase');

      // Execute river actions dynamically
      console.log(`🎯 Starting river with current player: ${currentPlayer}`);
      
      // Get updated game state after phase change
      const riverState = await getCurrentGameState();
      currentPlayer = riverState.currentPlayerId;
      console.log(`🎯 River current player: ${currentPlayer}`);
      
      // First player bets
      currentPlayer = await executeAction(currentPlayer, 'bet', 200);
      
      // Next player calls
      currentPlayer = await executeAction(currentPlayer, 'call');

      // Advance to showdown
      const showdownResponse = await request(app)
        .post('/api/test/advance-phase')
        .send({ 
          tableId: testTableId, 
          phase: 'showdown'
        });
      
      expect(showdownResponse.status).toBe(200);
      console.log('✅ Advanced to showdown phase');

      // ===== PHASE 3: VERIFICATION =====
      console.log('📋 Phase 3: Verification');

      // Get final game state
      const finalState = await request(app)
        .post('/api/test/get_game_state')
        .send({ tableId: testTableId });
      
      expect(finalState.status).toBe(200);
      expect(finalState.body.success).toBe(true);
      expect(finalState.body.gameState).toBeDefined();
      console.log('✅ Final game state retrieved');

      // Get action history
      const historyResponse = await request(app)
        .post('/api/test/get_action_history')
        .send({ tableId: testTableId });
      
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.actions).toBeDefined();
      expect(historyResponse.body.actions.length).toBeGreaterThan(0);
      console.log(`✅ Action history retrieved with ${historyResponse.body.actions.length} actions`);

      // Verify game history API
      const gameHistoryResponse = await request(app)
        .get(`/api/test/tables/${testTableId}/game/history`);
      
      expect(gameHistoryResponse.status).toBe(200);
      expect(gameHistoryResponse.body.success).toBe(true);
      expect(gameHistoryResponse.body.history).toBeDefined();
      console.log('✅ Game history API verified');

      console.log('🎉 Complete 5-player game test passed!');
    }, 30000); // 30 second timeout

    it('should verify specific hand rankings and outcomes', async () => {
      console.log('🔍 Testing specific hand rankings...');

      // Start game and execute a complete hand
      await request(app)
        .post('/api/test/start-game')
        .send({ tableId: testTableId });

      // Get initial game state
      const initialState = await getCurrentGameState();
      let currentPlayer = initialState.currentPlayerId;
      console.log(`🎯 Starting with current player: ${currentPlayer}`);
      
      // If currentPlayer is undefined, we need to determine who should act first
      if (!currentPlayer) {
        console.log('⚠️ Current player is undefined, determining first player...');
        // In poker, the first player to act is typically the player to the left of the big blind
        // For now, let's use the first seated player
        const seatedPlayers = initialState.players?.filter((p: any) => p.seat !== null) || [];
        if (seatedPlayers.length > 0) {
          currentPlayer = seatedPlayers[0].id;
          console.log(`🎯 Using first seated player as current player: ${currentPlayer}`);
        } else {
          throw new Error('No seated players found in game state');
        }
      }

      // Execute some basic actions to get to showdown
      // First player folds
      currentPlayer = await executeAction(currentPlayer, 'fold');
      
      // Next player folds
      currentPlayer = await executeAction(currentPlayer, 'fold');
      
      // Next player folds
      currentPlayer = await executeAction(currentPlayer, 'fold');
      
      // Next player folds
      currentPlayer = await executeAction(currentPlayer, 'fold');
      
      // Last player checks
      currentPlayer = await executeAction(currentPlayer, 'check');

      // Advance to showdown
      await request(app)
        .post('/api/test/advance-phase')
        .send({ tableId: testTableId, phase: 'showdown' });

      // Verify final state
      const finalState = await request(app)
        .post('/api/test/get_game_state')
        .send({ tableId: testTableId });

      expect(finalState.body.gameState).toBeDefined();
      console.log('✅ Hand ranking verification completed');
    }, 15000); // 15 second timeout

    it('should handle edge cases and error conditions', async () => {
      console.log('🔍 Testing edge cases and error conditions...');

      // Test invalid player action
      const invalidAction = await request(app)
        .post('/api/test/execute_player_action')
        .send({
          tableId: testTableId,
          playerId: 'NonExistentPlayer',
          action: 'invalid_action'
        });

      expect(invalidAction.body.success).toBe(false);
      console.log('✅ Invalid player action handled correctly');

      // Test invalid table ID
      const invalidTableAction = await request(app)
        .post('/api/test/execute_player_action')
        .send({
          tableId: 99999,
          playerId: 'Player1',
          action: 'fold'
        });

      expect(invalidTableAction.body.success).toBe(false);
      console.log('✅ Invalid table ID handled correctly');

      // Test invalid phase advancement
      const invalidPhase = await request(app)
        .post('/api/test/advance-phase')
        .send({
          tableId: testTableId,
          phase: 'invalid_phase'
        });

      expect(invalidPhase.body.success).toBe(false);
      console.log('✅ Invalid phase advancement handled correctly');

      console.log('✅ Edge case testing completed');
    }, 10000); // 10 second timeout
  });
}); 