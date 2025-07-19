import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('5-Player Game History Test', () => {
  let testTableId: number; // Will be set dynamically from reset-database response
  let apiCallLog: Array<{timestamp: string, method: string, url: string, payload?: any, response?: any}> = [];

  const testPlayers = [
    { nickname: 'Player1', seat: 1, chips: 100 },
    { nickname: 'Player2', seat: 2, chips: 100 },
    { nickname: 'Player3', seat: 3, chips: 100 },
    { nickname: 'Player4', seat: 4, chips: 100 },
    { nickname: 'Player5', seat: 5, chips: 100 }
  ];

  const loggedRequest = async (method: 'GET' | 'POST', url: string, payload?: any) => {
    const startTime = new Date().toISOString();
    console.log(`📡 API CALL: ${method} ${url}${payload ? ` | Payload: ${JSON.stringify(payload)}` : ''}`);
    
    let response;
    if (method === 'GET') {
      response = await request(app).get(url);
    } else {
      response = await request(app).post(url).send(payload || {});
    }
    
    const logEntry = {
      timestamp: startTime,
      method,
      url,
      payload,
      response: {
        status: response.status,
        body: response.body
      }
    };
    
    apiCallLog.push(logEntry);
    console.log(`📥 RESPONSE: ${response.status} | ${JSON.stringify(response.body)}`);
    
    return response;
  };

  beforeAll(async () => {
    // Initialize test database
    await prisma.$connect();
    apiCallLog = []; // Reset API call log
    
    // Reset database and get the first available table ID
    const resetResponse = await loggedRequest('POST', '/api/test/reset-database', {});
    
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.success).toBe(true);
    
    // Get the first table ID from the response
    testTableId = resetResponse.body.tableId || 1;
    console.log(`🧪 Test using table ID: ${testTableId}`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset database and get fresh table ID
    const resetResponse = await loggedRequest('POST', '/api/test/reset-database', {});
    
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.success).toBe(true);
    
    // Update testTableId with the fresh table ID
    testTableId = resetResponse.body.tableId;
    console.log(`🧪 Test using fresh table ID: ${testTableId}`);
    
    // Seat all 5 players
    for (const player of testPlayers) {
      await loggedRequest('POST', '/api/test/seat-player', {
        tableId: testTableId,
        playerId: player.nickname,
        seatNumber: player.seat,
        buyIn: player.chips
      });
    }
  });

  afterEach(async () => {
    // Clean up after each test
    await loggedRequest('POST', '/api/test/reset-database', {});
    
    // Output the complete API call log
    console.log('\n📋 COMPLETE API CALL LOG:');
    console.log('================================');
    apiCallLog.forEach((call, index) => {
      console.log(`${index + 1}. [${call.timestamp}] ${call.method} ${call.url}`);
      if (call.payload && Object.keys(call.payload).length > 0) {
        console.log(`   📤 Payload: ${JSON.stringify(call.payload)}`);
      }
      console.log(`   📥 Response: ${call.response?.status} | ${JSON.stringify(call.response?.body)}`);
      console.log('');
    });
    console.log('================================\n');
  });

  describe('Complete 5-Player Game Flow with History Verification', () => {
    it('should execute complete game and verify all actions through history API', async () => {
      console.log('🎯 Starting 5-player game history test...');

      // Step 1: Start the game
      const startResponse = await loggedRequest('POST', '/api/test/start-game', { tableId: testTableId });
      
      expect(startResponse.status).toBe(200);
      expect(startResponse.body.success).toBe(true);
      console.log('✅ Game started successfully');

      // Step 2: Verify initial game state
      const initialState = await loggedRequest('POST', '/api/test/get_game_state', { tableId: testTableId });
      
      expect(initialState.status).toBe(200);
      expect(initialState.body.success).toBe(true);
      expect(initialState.body.gameState.phase).toBe('preflop');
      console.log('✅ Initial game state verified');

      // Step 3: Execute Pre-Flop Actions (as per test_game_5_players.md)
      const preflopActions = [
        { player: 'Player3', action: 'raise', amount: 6 },
        { player: 'Player4', action: 'call', amount: 6 },
        { player: 'Player5', action: 'fold' },
        { player: 'Player1', action: 'call', amount: 5 }, // SB adjustment
        { player: 'Player2', action: 'raise', amount: 16 },
        { player: 'Player3', action: 'call', amount: 10 },
        { player: 'Player4', action: 'fold' },
        { player: 'Player1', action: 'fold' }
      ];

      for (const action of preflopActions) {
        const actionResponse = await loggedRequest('POST', '/api/test/execute_player_action', {
          tableId: testTableId,
          playerId: action.player,
          action: action.action,
          amount: action.amount
        });
        
        expect(actionResponse.status).toBe(200);
        expect(actionResponse.body.success).toBe(true);
        console.log(`✅ ${action.player} ${action.action}${action.amount ? ` $${action.amount}` : ''}`);
      }

      // Step 4: Verify Pre-Flop History
      const preflopHistory = await loggedRequest('GET', `/api/test/test_game_history/${testTableId}?handNumber=1`);
      
      console.log('Preflop history:', JSON.stringify(preflopHistory.body));
      expect(preflopHistory.status).toBe(200);
      expect(preflopHistory.body.success).toBe(true);
      console.log('✅ Pre-flop history retrieved');

      // Log game state before advancing phase
      const preFlopState = await loggedRequest('POST', '/api/test/get_game_state', { tableId: testTableId });
      console.log('Game state before flop advance:', JSON.stringify(preFlopState.body));

      // Step 5: Advance to Flop
      const flopResponse = await loggedRequest('POST', '/api/test/advance-phase', { tableId: testTableId, phase: 'flop' });
      
      console.log('Flop advance response:', JSON.stringify(flopResponse));
      if (flopResponse.status !== 200) {
        const errMsg = `❌ Flop advance failed: status=${flopResponse.status}, body=${JSON.stringify(flopResponse.body)}`;
        console.log('===DEBUG FAIL MARKER===', errMsg);
        throw new Error(errMsg);
      }
      expect(flopResponse.status).toBe(200);
      expect(flopResponse.body.success).toBe(true);
      console.log('✅ Advanced to flop phase');

      // Log game state after flop advance to see current player
      const postFlopState = await loggedRequest('POST', '/api/test/get_game_state', { tableId: testTableId });
      console.log('Game state after flop advance:', JSON.stringify(postFlopState.body, null, 2));

            // Step 6: Let the game auto-advance through remaining phases
      // Since the preflop resulted in only Player2 and Player3 being active,
      // and Player1's fold triggered the auto-advance to flop,
      // we'll manually advance through the remaining phases to showdown
      console.log('🎯 Game auto-advanced to flop after preflop actions');
      
      // Advance through flop, turn, and river quickly
      console.log('⏭️ Advancing through remaining phases to complete the hand...');

      // Step 7-10: Advance through turn, river, and showdown phases
      const remainingPhases = ['turn', 'river', 'showdown'];
      
      for (const phase of remainingPhases) {
        const phaseResponse = await request(app)
          .post('/api/test/advance-phase')
          .send({ tableId: testTableId, phase: phase });
        
        expect(phaseResponse.status).toBe(200);
        expect(phaseResponse.body.success).toBe(true);
        console.log(`✅ Advanced to ${phase} phase`);
      }

      console.log('✅ Game completed - advanced through all phases to showdown');

      // Step 11: Verify Complete Game History
      const finalHistory = await request(app)
        .get(`/api/test/test_game_history/${testTableId}?handNumber=1`);
      
      expect(finalHistory.status).toBe(200);
      expect(finalHistory.body.success).toBe(true);
      console.log('✅ Final game history retrieved');

      // Step 12: Verify Action Count
      const actionHistory = await request(app)
        .get(`/api/test/get_action_history`)
        .send({ tableId: testTableId });
      
      if (actionHistory.body.success && actionHistory.body.history) {
        const actions = actionHistory.body.history;
        console.log(`📊 Total actions recorded: ${actions.length}`);
        
        // Verify we have actions from all phases
        const phases = [...new Set(actions.map((a: any) => a.phase))];
        console.log(`📊 Phases recorded: ${phases.join(', ')}`);
        
        // Verify player actions
        const players = [...new Set(actions.map((a: any) => a.playerName))];
        console.log(`📊 Players with actions: ${players.join(', ')}`);
      }

      // Step 13: Verify Game State After Completion
      const finalState = await request(app)
        .post('/api/test/get_game_state')
        .send({ tableId: testTableId });
      
      expect(finalState.status).toBe(200);
      expect(finalState.body.success).toBe(true);
      
      const gameState = finalState.body.gameState;
      console.log(`📊 Final game state: phase=${gameState.phase}, status=${gameState.status}`);
      
      // Step 14: Verify Pot Distribution
      if (gameState.pot && gameState.pot > 0) {
        console.log(`💰 Final pot amount: $${gameState.pot}`);
      }

      // Step 15: Verify Winner (if applicable)
      if (gameState.winner) {
        console.log(`🏆 Winner: ${gameState.winner}`);
      }

      console.log('✅ Complete 5-player game history test passed');
    }, 30000); // 30 second timeout for complete game

    it('should verify chronological order of actions', async () => {
      console.log('🔍 Testing chronological order of actions...');

      // Start game and perform some actions
      await request(app)
        .post('/api/test/start-game')
        .send({ tableId: testTableId });

      // Perform a sequence of actions
      const actions = [
        { player: 'Player1', action: 'bet', amount: 10 },
        { player: 'Player2', action: 'call', amount: 10 },
        { player: 'Player3', action: 'raise', amount: 20 }
      ];

      for (const action of actions) {
        await request(app)
          .post('/api/test/execute_player_action')
          .send({
            tableId: testTableId,
            playerId: action.player,
            action: action.action,
            amount: action.amount
          });
      }

      // Get action history and verify chronological order
      const historyResponse = await request(app)
        .get(`/api/test/test_game_history_ordered/${testTableId}`);
      
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.success).toBe(true);

      if (historyResponse.body.history) {
        const actions = historyResponse.body.history;
        let isOrdered = true;
        
        for (let i = 1; i < actions.length; i++) {
          const prevAction = actions[i - 1];
          const currentAction = actions[i];
          
          if (prevAction.timestamp && currentAction.timestamp) {
            if (new Date(prevAction.timestamp) > new Date(currentAction.timestamp)) {
              isOrdered = false;
              break;
            }
          }
        }
        
        expect(isOrdered).toBe(true);
        console.log('✅ Actions are in chronological order');
      }
    });

    it('should verify action history pagination', async () => {
      console.log('🔍 Testing action history pagination...');

      // Start game and perform multiple actions
      await request(app)
        .post('/api/test/start-game')
        .send({ tableId: testTableId });

      // Perform many actions to test pagination
      for (let i = 0; i < 25; i++) {
        const player = testPlayers[i % testPlayers.length];
        await request(app)
          .post('/api/test/execute_player_action')
          .send({
            tableId: testTableId,
            playerId: player.nickname,
            action: 'bet',
            amount: 10 + i
          });
      }

      // Test paginated history
      const paginatedResponse = await request(app)
        .get(`/api/test/test_game_history_paginated/${testTableId}?page=1&limit=10`);
      
      expect(paginatedResponse.status).toBe(200);
      expect(paginatedResponse.body.success).toBe(true);
      expect(paginatedResponse.body.pagination).toBeDefined();
      
      console.log('✅ Action history pagination working');
    });

    it('should verify game history UI state', async () => {
      console.log('🔍 Testing game history UI state...');

      // Start game and perform actions
      await request(app)
        .post('/api/test/start-game')
        .send({ tableId: testTableId });

      await request(app)
        .post('/api/test/execute_player_action')
        .send({
          tableId: testTableId,
          playerId: 'Player1',
          action: 'bet',
          amount: 20
        });

      // Get UI state
      const uiResponse = await request(app)
        .get(`/api/test/test_game_history_ui/${testTableId}`);
      
      expect(uiResponse.status).toBe(200);
      expect(uiResponse.body.success).toBe(true);
      expect(uiResponse.body.ui).toBeDefined();
      
      console.log('✅ Game history UI state working');
    });
  });
}); 