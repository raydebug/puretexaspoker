import express from 'express';
import { tableManager } from '../services/TableManager';
import { authService } from '../services/authService';
import { roleManager } from '../services/roleManager';
import { memoryCache } from '../services/MemoryCache';
import { prisma } from '../db';
import { cleanupTestData } from '../services/testService';

const router = express.Router();

// Test-only API endpoints with test_ prefix
// These APIs are only for testing purposes and should not be used in production

/**
 * TEST API: Create a mock table with predefined players
 * POST /api/test_create_mock_table
 */
router.post('/test_create_mock_table', async (req, res) => {
  try {
    const { tableId, players, tableConfig } = req.body;
    
    console.log(`🧪 TEST API: Creating mock table ${tableId} with ${players.length} players`);
    
    // Create mock table state
    const mockTableState = {
      tableId: tableId || 1,
      status: 'playing',
      phase: 'preflop',
      pot: 0,
      players: players.map((player: any) => ({
        id: player.id || `test-player-${player.seatNumber}`,
        name: player.nickname,
        seatNumber: player.seatNumber,
        position: player.seatNumber,
        chips: player.chips,
        currentBet: 0,
        isDealer: player.seatNumber === (tableConfig?.dealerPosition || 1),
        isAway: false,
        isActive: true,
        cards: [],
        avatar: {
          type: 'default',
          color: '#007bff'
        }
      })),
      communityCards: [],
      currentPlayerId: players.length > 0 ? `test-player-${players[0].seatNumber}` : null,
      dealerPosition: tableConfig?.dealerPosition || 1,
      smallBlindPosition: tableConfig?.smallBlindPosition || 2,
      bigBlindPosition: tableConfig?.bigBlindPosition || 3,
      minBet: tableConfig?.minBet || 10,
      currentBet: 0,
      smallBlind: tableConfig?.smallBlind || 5,
      bigBlind: tableConfig?.bigBlind || 10,
      handNumber: 1
    };
    
    // Store in memory cache for testing
    memoryCache.updateTable(tableId.toString(), mockTableState);
    
    // Broadcast the table state to all connected clients
    const io = (global as any).socketIO;
    if (io) {
      console.log(`🔄 TEST API: Broadcasting mock table state to room table:${tableId}`);
      
      // Broadcast to all clients in the table room
      io.to(`table:${tableId}`).emit('tableState', mockTableState);
      
      // Also broadcast to all clients (for debugging/fallback)
      io.emit('testTableStateUpdate', {
        tableId,
        tableState: mockTableState,
        message: 'Test table state created'
      });
      
      console.log(`📡 TEST API: Mock table state broadcasted to WebSocket clients`);
    } else {
      console.log(`⚠️ TEST API: Socket.IO instance not available for broadcasting`);
    }
    
    console.log(`✅ TEST API: Mock table ${tableId} created successfully`);
    
    res.json({
      success: true,
      tableId,
      tableState: mockTableState,
      message: 'Mock table created for testing'
    });
  } catch (error) {
    console.error('❌ TEST API: Error creating mock table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create mock table'
    });
  }
});

/**
 * TEST API: Get mock table state
 * GET /api/test_get_mock_table/:tableId
 */
router.get('/test_get_mock_table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const targetTableId = parseInt(tableId);
    
    if (isNaN(targetTableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID'
      });
    }
    
    const table = tableManager.getTable(targetTableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    console.log(`🧪 TEST API: Retrieved table ${targetTableId}`);
    
    res.json({
      success: true,
      table
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get table'
    });
  }
});

/**
 * TEST API: Update table state
 * PUT /api/test_update_mock_table/:tableId
 */
router.put('/test_update_mock_table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { updates } = req.body;
    const targetTableId = parseInt(tableId);
    
    if (isNaN(targetTableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID'
      });
    }
    
    const table = tableManager.getTable(targetTableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    console.log(`🧪 TEST API: Updated table ${targetTableId}:`, updates);
    
    res.json({
      success: true,
      table,
      message: 'Table updated'
    });
  } catch (error) {
    console.error('❌ TEST API: Error updating table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update table'
    });
  }
});

/**
 * TEST API: Simulate player action in table
 * POST /api/test_player_action/:tableId
 */
router.post('/test_player_action/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { playerId, nickname, action, amount } = req.body;
    const targetTableId = parseInt(tableId);
    
    if (isNaN(targetTableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID'
      });
    }
    
    const table = tableManager.getTable(targetTableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    console.log(`🧪 TEST API: Player ${nickname} performed ${action} on table ${targetTableId}`);
    
    res.json({
      success: true,
      table,
      message: `Player ${nickname} performed ${action}`
    });
  } catch (error) {
    console.error('❌ TEST API: Error performing player action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform player action'
    });
  }
});

/**
 * TEST API: Get all test data
 * GET /api/test_data
 */
router.get('/test_data', async (req, res) => {
  try {
    const tables = tableManager.getAllTables();
    const onlineUsers = memoryCache.getOnlineUsers();
    
    res.json({
      success: true,
      tables,
      onlineUsers,
      message: 'Test data retrieved'
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting test data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test data'
    });
  }
});

/**
 * TEST API: Clear all test data
 * DELETE /api/test_data
 */
router.delete('/test_data', async (req, res) => {
  try {
    memoryCache.clearCache();
    
    res.json({
      success: true,
      message: 'Test data cleared'
    });
  } catch (error) {
    console.error('❌ TEST API: Error clearing test data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear test data'
    });
  }
});

// POST /api/test/get_game_state - Get current game state for testing
router.post('/get_game_state', async (req, res) => {
  try {
    const { tableId } = req.body;
    
    console.log(`🎮 TEST API: Get game state request - tableId: ${tableId}`);
    
    if (!tableId) {
      return res.status(400).json({ 
        success: false, 
        error: 'No tableId provided'
      });
    }
    
    // Ensure tableId is an integer
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tableId - must be a number'
      });
    }
    
    console.log(`🎮 TEST API: Getting game state for table ${targetTableId}`);
    
    // Get the game state from TableManager
    const gameState = tableManager.getTableGameState(targetTableId);
    
    if (gameState) {
      console.log(`🎮 TEST API: Found game state for table ${targetTableId}:`, {
        status: gameState.status,
        phase: gameState.phase,
        playersCount: gameState.players?.length || 0,
        currentPlayerId: gameState.currentPlayerId
      });
      
      res.json({ 
        success: true, 
        gameState: gameState,
        tableId: targetTableId
      });
    } else {
      console.log(`🎮 TEST API: No game state found for table ${targetTableId}`);
      res.status(404).json({ 
        success: false, 
        error: `No game state found for table ${targetTableId}` 
      });
    }
  } catch (error) {
    console.error('🎮 TEST API: Error getting game state:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get game state' 
    });
  }
});

// POST /api/test/emit_game_state - Emit game state via WebSocket for testing
router.post('/emit_game_state', async (req, res) => {
  try {
    const { tableId, gameState } = req.body;
    
    console.log(`📡 TEST API: Emit game state request - tableId: ${tableId}`);
    
    if (!tableId) {
      return res.status(400).json({ 
        success: false, 
        error: 'No tableId provided'
      });
    }
    
    if (!gameState) {
      return res.status(400).json({ 
        success: false, 
        error: 'No gameState provided'
      });
    }
    
    // Ensure tableId is an integer
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tableId - must be a number'
      });
    }
    
    console.log(`📡 TEST API: Emitting game state for table ${targetTableId}`);
    
    // Emit WebSocket events to notify frontend
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 TEST API: Emitting game state to rooms for table ${targetTableId}`);
      
      // In table-only architecture, tableId serves as gameId
      const gameId = targetTableId.toString();
      
      // Emit to both room types for compatibility
      // 1. Table-based rooms (new architecture)
      io.to(`table:${gameId}`).emit('gameState', gameState);
      
      // 2. Game-based rooms (legacy architecture - for frontend compatibility)
      io.to(`game:${gameId}`).emit('gameState', gameState);
      
      // Also emit to all clients for debugging/fallback
      io.emit('gameState', gameState);
      
      console.log(`📡 TEST API: WebSocket events emitted for table ${targetTableId} (gameId: ${gameId})`);
    } else {
      console.log(`⚠️ TEST API: Socket.IO instance not available for table ${targetTableId}`);
    }
    
    console.log(`✅ TEST API: Game state emitted successfully for table ${targetTableId}`);
    res.json({ 
      success: true, 
      message: `Game state emitted for table ${targetTableId}`,
      tableId: targetTableId
    });
  } catch (error) {
    console.error('📡 TEST API: Error emitting game state:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to emit game state' 
    });
  }
});

/**
 * TEST API: Reset database to clean state
 * POST /api/test/reset-database
 */
router.post('/reset-database', async (req, res) => {
  try {
    // Clear TableManager in-memory state BEFORE any DB or table creation
    if (tableManager) {
      tableManager["tables"].clear();
      tableManager["tablePlayers"].clear();
      tableManager["tableGameStates"].clear();
      console.log('TableManager: Cleared in-memory state at start of reset_database');
    }
    console.log('🧹 TEST API: Resetting database to clean state...');
    
    // Clean up all test data
    await cleanupTestData();

    // Delete all tables before creating new ones
    await prisma.table.deleteMany({});

    // Create exactly 3 tables
    const defaultTables = [
      {
        name: 'No Limit $0.01/$0.02 Micro Table 1',
        maxPlayers: 9,
        smallBlind: 1,
        bigBlind: 2,
        minBuyIn: 40,
        maxBuyIn: 200
      },
      {
        name: 'Pot Limit $0.25/$0.50 Low Table 1',
        maxPlayers: 9,
        smallBlind: 25,
        bigBlind: 50,
        minBuyIn: 1000,
        maxBuyIn: 5000
      },
      {
        name: 'Fixed Limit $1/$2 Medium Table 1',
        maxPlayers: 9,
        smallBlind: 100,
        bigBlind: 200,
        minBuyIn: 4000,
        maxBuyIn: 20000
      }
    ];
    
    // Create tables (they will get auto-incremented IDs)
    for (const tableData of defaultTables) {
      await prisma.table.create({ data: tableData });
    }
    
    // Log number of tables in DB after creation
    const tablesAfter = await prisma.table.findMany();
    console.log(`DB now has ${tablesAfter.length} tables after creation`);
    
    // Reinitialize TableManager to pick up new tables
    await tableManager.init();
    console.log('🔄 TEST API: TableManager reinitialized with new tables');
    
    console.log('✅ TEST API: Database reset completed successfully');
    
    res.json({
      success: true,
      message: 'Database reset successful',
      tables: tablesAfter
    });
  } catch (error) {
    console.error('❌ TEST API: Error resetting database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset database'
    });
  }
});

// Simple test route to verify routing works
router.get('/test-route', (req, res) => {
  res.json({ success: true, message: 'Test route works' });
});

/**
 * TEST API: Start game for a table
 * POST /api/test/start-game
 */
router.post('/start-game', async (req, res) => {
  try {
    const { tableId } = req.body;
    if (!tableId) {
      return res.status(400).json({ success: false, error: 'No tableId provided' });
    }
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ success: false, error: 'Invalid tableId - must be a number' });
    }
    // Reinitialize TableManager from DB to sync in-memory state
    await req.app.get('tableManager').init();
    // Call TableManager to start the game
    const result = await req.app.get('tableManager').startTableGame(targetTableId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'Failed to start game' });
    }
    return res.json({ success: true, message: 'Game started for table ' + targetTableId, tableId: targetTableId, gameState: result.gameState });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * TEST API: Direct player seating for test mode
 * POST /api/test/seat-player
 */
router.post('/seat-player', async (req, res) => {
  try {
    const { tableId, playerName, seatNumber, buyIn = 100 } = req.body;
    
    console.log(`🧪 TEST API: Direct player seating request - tableId: ${tableId}, playerName: ${playerName}, seatNumber: ${seatNumber}, buyIn: ${buyIn}`);
    
    if (!tableId || !playerName || !seatNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: tableId, playerName, seatNumber' 
      });
    }
    
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tableId - must be a number' 
      });
    }
    
    const seatNum = parseInt(seatNumber);
    if (isNaN(seatNum) || seatNum < 1 || seatNum > 9) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid seatNumber - must be between 1 and 9' 
      });
    }
    
    // Create a test player in the database (or find existing one)
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerName }
    });
    
    let testPlayer;
    if (existingPlayer) {
      testPlayer = existingPlayer;
      console.log(`🧪 TEST API: Using existing player ${playerName}`);
    } else {
      testPlayer = await prisma.player.create({
        data: {
          id: playerName,      // Use nickname as primary key
          nickname: playerName,
          chips: buyIn,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`🧪 TEST API: Created test player ${playerName} with ID ${testPlayer.id}`);
    }
    
    // Join the table first
    const joinResult = tableManager.joinTable(targetTableId, `test-socket-${testPlayer.id}`, playerName);
    if (!joinResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: joinResult.error || 'Failed to join table' 
      });
    }
    
    // Take the seat
    const seatResult = tableManager.sitDown(targetTableId, playerName, buyIn);
    if (!seatResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: seatResult.error || 'Failed to take seat' 
      });
    }
    
    // Create database record for the seating
    await prisma.playerTable.create({
      data: {
        playerId: testPlayer.id,
        tableId: targetTableId,
        seatNumber: seatNum,
        buyIn: buyIn
      }
    });
    
    console.log(`🧪 TEST API: Player ${playerName} seated at table ${targetTableId}, seat ${seatNum}`);
    
    // Get the updated game state
    const gameState = tableManager.getTableGameState(targetTableId);
    
    // Emit WebSocket events to notify frontend
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 TEST API: Broadcasting game state after seating for table ${targetTableId}`);
      
      // Emit to table room
      io.to(`table:${targetTableId}`).emit('gameState', gameState);
      
      // Also emit to all clients for debugging/fallback
      io.emit('gameState', gameState);
      
      console.log(`📡 TEST API: Game state broadcasted after seating`);
    }
    
    res.json({
      success: true,
      message: `Player ${playerName} seated at table ${targetTableId}, seat ${seatNum}`,
      tableId: targetTableId,
      playerName,
      seatNumber: seatNum,
      buyIn,
      gameState
    });
    
  } catch (error) {
    console.error('❌ TEST API: Error seating player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seat player'
    });
  }
});

/**
 * TEST API: Advance game to specific phase
 * POST /api/test/advance-phase
 */
router.post('/advance-phase', async (req, res) => {
  try {
    const { tableId, phase, communityCards } = req.body;
    
    console.log(`🧪 TEST API: Advance phase request - tableId: ${tableId}, phase: ${phase}`);
    
    if (!tableId || !phase) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: tableId, phase' 
      });
    }
    
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tableId - must be a number' 
      });
    }
    
    const validPhases = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid phase. Must be one of: ${validPhases.join(', ')}` 
      });
    }
    
    // Get current game state
    const gameState = tableManager.getTableGameState(targetTableId);
    if (!gameState) {
      return res.status(404).json({ 
        success: false, 
        error: 'Game state not found for table' 
      });
    }
    
    console.log(`🧪 TEST API: Current phase: ${gameState.phase}, advancing to: ${phase}`);
    
    // Update game state phase
    gameState.phase = phase as any;
    
    // Add community cards if provided
    if (communityCards && Array.isArray(communityCards)) {
      gameState.board = communityCards;
      console.log(`🧪 TEST API: Set community cards:`, communityCards);
    } else {
      // Set default community cards based on phase
      if (phase === 'flop') {
        gameState.board = [
          { suit: 'spades', rank: 'K' },
          { suit: 'spades', rank: 'Q' },  
          { suit: 'hearts', rank: '10' }
        ];
      } else if (phase === 'turn') {
        gameState.board = [
          { suit: 'spades', rank: 'K' },
          { suit: 'spades', rank: 'Q' },  
          { suit: 'hearts', rank: '10' },
          { suit: 'hearts', rank: 'J' }
        ];
      } else if (phase === 'river') {
        gameState.board = [
          { suit: 'spades', rank: 'K' },
          { suit: 'spades', rank: 'Q' },  
          { suit: 'hearts', rank: '10' },
          { suit: 'hearts', rank: 'J' },
          { suit: 'hearts', rank: '8' }
        ];
      }
    }
    
    // Reset current bets for new betting round  
    if (phase === 'flop' || phase === 'turn' || phase === 'river') {
      gameState.currentBet = 0;
      gameState.players.forEach(p => {
        p.currentBet = 0;
      });
      
      // Set first active player as current player
      const activePlayers = gameState.players.filter(p => p.isActive && p.chips > 0);
      if (activePlayers.length > 0) {
        gameState.currentPlayerId = activePlayers[0].id;
        console.log(`🧪 TEST API: Set current player to: ${gameState.currentPlayerId}`);
      }
    }
    
    // Update the table state (the gameState is a reference, so changes are automatically saved)
    
    // Emit WebSocket events to notify frontend
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 TEST API: Broadcasting game state after phase advance for table ${targetTableId}`);
      
      // Emit to table room
      io.to(`table:${targetTableId}`).emit('gameState', gameState);
      
      // Also emit to all clients for debugging/fallback
      io.emit('gameState', gameState);
      
      console.log(`📡 TEST API: Game state broadcasted after phase advance`);
    }
    
    console.log(`✅ TEST API: Game advanced to ${phase} phase for table ${targetTableId}`);
    
    res.json({
      success: true,
      message: `Game advanced to ${phase} phase for table ${targetTableId}`,
      tableId: targetTableId,
      phase,
      gameState
    });
    
  } catch (error) {
    console.error('❌ TEST API: Error advancing game phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to advance game phase'
    });
  }
});

/**
 * TEST API: Raise action
 * POST /api/test/raise
 */
router.post('/raise', async (req, res) => {
  try {
    const { tableId, playerName, amount } = req.body;
    
    console.log(`🧪 TEST API: Raise action - table ${tableId}, player ${playerName}, amount ${amount}`);
    
    const table = tableManager.getTable(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    // Simulate raise action
    console.log(`✅ TEST API: Player ${playerName} raised to $${amount}`);
    
    res.json({
      success: true,
      message: `Player ${playerName} raised to $${amount}`,
      tableId,
      playerName,
      amount
    });
  } catch (error) {
    console.error('❌ TEST API: Error in raise action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process raise action'
    });
  }
});

/**
 * TEST API: Call action
 * POST /api/test/call
 */
router.post('/call', async (req, res) => {
  try {
    const { tableId, playerName } = req.body;
    
    console.log(`🧪 TEST API: Call action - table ${tableId}, player ${playerName}`);
    
    const table = tableManager.getTable(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    // Simulate call action
    console.log(`✅ TEST API: Player ${playerName} called`);
    
    res.json({
      success: true,
      message: `Player ${playerName} called`,
      tableId,
      playerName
    });
  } catch (error) {
    console.error('❌ TEST API: Error in call action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process call action'
    });
  }
});

/**
 * TEST API: Fold action
 * POST /api/test/fold
 */
router.post('/fold', async (req, res) => {
  try {
    const { tableId, playerName } = req.body;
    
    console.log(`🧪 TEST API: Fold action - table ${tableId}, player ${playerName}`);
    
    const table = tableManager.getTable(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    // Simulate fold action
    console.log(`✅ TEST API: Player ${playerName} folded`);
    
    res.json({
      success: true,
      message: `Player ${playerName} folded`,
      tableId,
      playerName
    });
  } catch (error) {
    console.error('❌ TEST API: Error in fold action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process fold action'
    });
  }
});

/**
 * TEST API: Check action
 * POST /api/test/check
 */
router.post('/check', async (req, res) => {
  try {
    const { tableId, playerName } = req.body;
    
    console.log(`🧪 TEST API: Check action - table ${tableId}, player ${playerName}`);
    
    const table = tableManager.getTable(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    // Simulate check action
    console.log(`✅ TEST API: Player ${playerName} checked`);
    
    res.json({
      success: true,
      message: `Player ${playerName} checked`,
      tableId,
      playerName
    });
  } catch (error) {
    console.error('❌ TEST API: Error in check action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process check action'
    });
  }
});

/**
 * TEST API: Bet action
 * POST /api/test/bet
 */
router.post('/bet', async (req, res) => {
  try {
    const { tableId, playerName, amount } = req.body;
    
    console.log(`🧪 TEST API: Bet action - table ${tableId}, player ${playerName}, amount ${amount}`);
    
    const table = tableManager.getTable(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    // Simulate bet action
    console.log(`✅ TEST API: Player ${playerName} bet $${amount}`);
    
    res.json({
      success: true,
      message: `Player ${playerName} bet $${amount}`,
      tableId,
      playerName,
      amount
    });
  } catch (error) {
    console.error('❌ TEST API: Error in bet action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bet action'
    });
  }
});

/**
 * TEST API: All-in action
 * POST /api/test/all-in
 */
router.post('/all-in', async (req, res) => {
  try {
    const { tableId, playerName } = req.body;
    
    console.log(`🧪 TEST API: All-in action - table ${tableId}, player ${playerName}`);
    
    const table = tableManager.getTable(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    // Simulate all-in action
    console.log(`✅ TEST API: Player ${playerName} went all-in`);
    
    res.json({
      success: true,
      message: `Player ${playerName} went all-in`,
      tableId,
      playerName
    });
  } catch (error) {
    console.error('❌ TEST API: Error in all-in action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process all-in action'
    });
  }
});

/**
 * TEST API: Set current player
 * POST /api/test/set-current-player
 */
router.post('/set-current-player', async (req, res) => {
  try {
    const { tableId, playerName } = req.body;
    
    console.log(`🧪 TEST API: Set current player - table ${tableId}, player ${playerName}`);
    
    const table = tableManager.getTable(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Game state not found for table'
      });
    }
    
    // Simulate setting current player
    console.log(`✅ TEST API: Current player set to ${playerName} for table ${tableId}`);
    
    res.json({
      success: true,
      message: `Current player set to ${playerName}`,
      tableId,
      playerName
    });
  } catch (error) {
    console.error('❌ TEST API: Error setting current player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set current player'
    });
  }
});

export default router; 