import express from 'express';
import { tableManager } from '../services/TableManager';
import { authService } from '../services/authService';
import { roleManager } from '../services/roleManager';
import { memoryCache } from '../services/MemoryCache';
import { prisma } from '../db';
import { cleanupTestData } from '../services/testService';
import { testPrisma, initializeTestDatabase, createTestTables, createTestPlayers } from '../testDb';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);
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
 * TEST API: Get game history for any table (testing only)
 * GET /api/test_game_history/:tableId
 */
router.get('/test_game_history/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { handNumber } = req.query;
    const tableNumber = parseInt(tableId);

    // Allow any table ID for testing purposes
    console.log(`🧪 TEST API: Game history request for table ${tableNumber}`);

    // For now, return empty game history to avoid Prisma client issues
    // TODO: Implement proper game history retrieval for testing
    console.log(`📊 TEST API: Table ${tableNumber} game history: returning empty list for now`);

    res.status(200).json({
      success: true,
      gameHistory: [],
      tableId: tableNumber,
      handNumber: handNumber ? parseInt(handNumber as string) : null
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting table game history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get table game history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * TEST API: Get paginated game history for any table (testing only)
 * GET /api/test_game_history_paginated/:tableId
 */
router.get('/test_game_history_paginated/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const tableNumber = parseInt(tableId);

    console.log(`🧪 TEST API: Paginated game history request for table ${tableNumber}, page ${page}, limit ${limit}`);

    // For now, return empty paginated game history
    res.status(200).json({
      success: true,
      history: [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: 0,
        pages: 0
      },
      tableId: tableNumber
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting paginated game history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get paginated game history'
    });
  }
});

/**
 * TEST API: Get game history UI state (testing only)
 * GET /api/test_game_history_ui/:tableId
 */
router.get('/test_game_history_ui/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const tableNumber = parseInt(tableId);

    console.log(`🧪 TEST API: Game history UI state request for table ${tableNumber}`);

    // Return mock UI state for testing
    res.status(200).json({
      success: true,
      ui: {
        scrollable: true,
        hasScrollbar: false,
        totalGames: 0,
        visibleGames: 0
      },
      tableId: tableNumber
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting game history UI state:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get game history UI state'
    });
  }
});

/**
 * TEST API: Get chronologically ordered game history (testing only)
 * GET /api/test_game_history_ordered/:tableId
 */
router.get('/test_game_history_ordered/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const tableNumber = parseInt(tableId);

    console.log(`🧪 TEST API: Chronologically ordered game history request for table ${tableNumber}`);

    // Return empty ordered game history for testing
    res.status(200).json({
      success: true,
      history: [],
      tableId: tableNumber,
      isOrdered: true
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting ordered game history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get ordered game history'
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
 * TEST API: Initialize in-memory test database
 * POST /api/test/init-memory-db
 */
router.post('/init-memory-db', async (req, res) => {
  try {
    console.log('🧪 TEST API: Initializing in-memory test database...');
    
    // Initialize test database
    await initializeTestDatabase();
    
    // Create test tables
    await createTestTables();
    
    // Create test players
    await createTestPlayers();
    
    console.log('✅ TEST API: In-memory test database initialized successfully');
    
    res.json({
      success: true,
      message: 'In-memory test database initialized successfully'
    });
  } catch (error) {
    console.error('❌ TEST API: Error initializing in-memory database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize in-memory database'
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

    // RESET AUTO-INCREMENT: Use direct SQLite command since Prisma raw queries aren't working
    try {
      const dbPath = process.cwd() + '/prisma/dev.db';
      console.log('🔄 TEST API: Attempting to reset auto-increment using SQLite at:', dbPath);
      const result = await execAsync(`sqlite3 "${dbPath}" "DELETE FROM sqlite_sequence WHERE name = 'Table'"`);
      console.log('🔄 TEST API: Reset table ID auto-increment to start from 1 (via direct SQLite)');
      console.log('🔄 TEST API: SQLite command result:', result);
    } catch (error) {
      console.log('⚠️ TEST API: Could not reset auto-increment sequence via SQLite:', error);
    }

    // Create exactly 3 tables - without explicit IDs so auto-increment will start from 1
    const defaultTables = [
      {
        name: 'No Limit $0.01/$0.02 Micro Table 1',
        maxPlayers: 6,
        smallBlind: 1,
        bigBlind: 2,
        minBuyIn: 40,
        maxBuyIn: 200
      },
      {
        name: 'Pot Limit $0.25/$0.50 Low Table 1',
        maxPlayers: 6,
        smallBlind: 25,
        bigBlind: 50,
        minBuyIn: 1000,
        maxBuyIn: 5000
      },
      {
        name: 'Fixed Limit $1/$2 Medium Table 1',
        maxPlayers: 6,
        smallBlind: 100,
        bigBlind: 200,
        minBuyIn: 4000,
        maxBuyIn: 20000
      }
    ];
    
    // Create tables (they will now get IDs starting from 1)
    for (const tableData of defaultTables) {
      await prisma.table.create({ data: tableData });
    }
    
    // Log number of tables in DB after creation
    const tablesAfter = await prisma.table.findMany();
    console.log(`DB now has ${tablesAfter.length} tables after creation`);
    console.log(`Table IDs: ${tablesAfter.map(t => t.id).join(', ')}`);
    
    // Reinitialize TableManager to pick up new tables
    await tableManager.init();
    console.log('🔄 TEST API: TableManager reinitialized with new tables');
    
    console.log('✅ TEST API: Database reset completed successfully');
    
    // Return the first table ID for testing convenience
    const firstTableId = tablesAfter.length > 0 ? tablesAfter[0].id : null;
    
    res.json({
      success: true,
      message: 'Database reset successful',
      tables: tablesAfter,
      tableId: firstTableId
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
    console.log('🧪 TEST API: Start game request received:', req.body);
    
    const { tableId } = req.body;
    if (!tableId) {
      console.log('❌ TEST API: No tableId provided');
      return res.status(400).json({ success: false, error: 'No tableId provided' });
    }
    
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      console.log('❌ TEST API: Invalid tableId:', tableId);
      return res.status(400).json({ success: false, error: 'Invalid tableId - must be a number' });
    }
    
    console.log('🧪 TEST API: Starting game for table:', targetTableId);
    
    // Skip reinitializing TableManager to preserve in-memory auto-seat data
    console.log('🔄 TEST API: Using current TableManager state (skipping init to preserve auto-seat data)...');
    
    // Debug log to verify TableManager state
    console.log(`🧪 TEST API: Verifying TableManager state before starting game for tableId: ${targetTableId}`);
    const tablePlayers = tableManager.getTablePlayers(targetTableId);
    console.log(`🧪 TEST API: Players at table ${targetTableId}:`, tablePlayers);

    // Use the same global tableManager instance that auto-seat uses
    const result = await tableManager.startTableGame(targetTableId);
    
    console.log('🎮 TEST API: startTableGame result:', result);
    
    if (!result.success) {
      console.log('❌ TEST API: Failed to start game:', result.error);
      return res.status(400).json({ success: false, error: result.error || 'Failed to start game' });
    }
    
    console.log('✅ TEST API: Game started successfully for table:', targetTableId);
    return res.json({ success: true, message: 'Game started for table ' + targetTableId, tableId: targetTableId, gameState: result.gameState });
  } catch (error) {
    console.error('❌ TEST API: Error in start-game endpoint:', error);
    return res.status(500).json({ success: false, error: (error as Error).message });
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
    
    // Emit WebSocket events with field conversion for frontend compatibility
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 TEST API: Broadcasting game state after phase advance for table ${targetTableId}`);
      
      // Apply field conversion for frontend compatibility (same as consolidatedHandler)
      const frontendGameState = {
        ...gameState,
        communityCards: gameState.board || [],  // Map board to communityCards for frontend
        board: undefined  // Remove backend-specific field
      };
      
      console.log(`🔄 TEST API: Phase advance field conversion:`, {
        phase: gameState.phase,
        originalBoard: gameState.board?.map((c: any) => `${c.rank}${c.suit}`) || 'none',
        convertedCommunityCards: frontendGameState.communityCards?.map((c: any) => `${c.rank}${c.suit}`) || 'none'
      });
      
      // Emit to table room
      io.to(`table:${targetTableId}`).emit('gameState', frontendGameState);
      
      // Also emit to all clients for debugging/fallback
      io.emit('gameState', frontendGameState);
      
      console.log(`📡 TEST API: Game state broadcasted after phase advance with field conversion`);
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
    
    // Actually execute the raise action via TableManager
    const result = await tableManager.playerAction(tableId, playerName, 'raise', amount);
    
    if (!result.success) {
      console.log(`❌ TEST API: Raise action failed - ${result.error}`);
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    console.log(`✅ TEST API: Player ${playerName} raised to $${amount} - action executed`);
    
    res.json({
      success: true,
      message: `Player ${playerName} raised to $${amount}`,
      tableId,
      playerName,
      amount,
      gameState: result.gameState
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
    
    // Actually execute the call action via TableManager
    const result = await tableManager.playerAction(tableId, playerName, 'call');
    
    if (!result.success) {
      console.log(`❌ TEST API: Call action failed - ${result.error}`);
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    console.log(`✅ TEST API: Player ${playerName} called - action executed`);
    
    res.json({
      success: true,
      message: `Player ${playerName} called`,
      tableId,
      playerName,
      gameState: result.gameState
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
    
    // Actually execute the bet action via TableManager
    const result = await tableManager.playerAction(tableId, playerName, 'bet', amount);
    
    if (!result.success) {
      console.log(`❌ TEST API: Bet action failed - ${result.error}`);
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    console.log(`✅ TEST API: Player ${playerName} bet $${amount} - action executed`);
    
    res.json({
      success: true,
      message: `Player ${playerName} bet $${amount}`,
      tableId,
      playerName,
      amount,
      gameState: result.gameState
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
    
    const gameState = tableManager.getTableGameState(tableId);
    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'Game state not found for table'
      });
    }
    
    // Actually set the current player in the game state
    gameState.currentPlayerId = playerName;
    console.log(`✅ TEST API: Current player set to ${playerName} for table ${tableId}`);
    
    res.json({
      success: true,
      message: `Current player set to ${playerName}`,
      tableId,
      playerName,
      currentPlayerId: gameState.currentPlayerId
    });
  } catch (error) {
    console.error('❌ TEST API: Error setting current player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set current player'
    });
  }
});

/**
 * TEST API: Execute player action
 * POST /api/test/execute_player_action
 */
router.post('/execute_player_action', async (req, res) => {
  try {
    const { tableId, playerId, action, amount } = req.body;
    
    console.log(`🧪 TEST API: Execute player action - table ${tableId}, player ${playerId}, action ${action}, amount ${amount}`);
    
    if (!tableId || !playerId || !action) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: tableId, playerId, action'
      });
    }
    
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tableId - must be a number' 
      });
    }
    
    // Get the game state
    const gameState = tableManager.getTableGameState(targetTableId);
    if (!gameState) {
      return res.status(404).json({ 
        success: false, 
        error: 'Game state not found for table' 
      });
    }
    
    // Execute the action using TableManager's playerAction method
    const result = await tableManager.playerAction(targetTableId, playerId, action, amount);
    
    if (!result.success) {
      return res.status(400).json({
        success: false, 
        error: result.error || 'Failed to execute action'
      });
    }
    
    console.log(`✅ TEST API: Player ${playerId} executed ${action} successfully`);
    
    res.json({
      success: true,
      message: `Player ${playerId} executed ${action} successfully`,
      tableId: targetTableId,
      playerId,
      action,
      amount,
      gameState: result.gameState
    });
  } catch (error) {
    console.error('❌ TEST API: Error executing player action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute player action'
    });
  }
});



/**
 * TEST API: Get action history
 * POST /api/test/get_action_history
 */
router.post('/get_action_history', async (req, res) => {
  try {
    const { tableId } = req.body;
    
    console.log(`🧪 TEST API: Get action history - table ${tableId}`);
    
    if (!tableId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: tableId'
      });
    }
    
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tableId - must be a number'
      });
    }
    
    // Get action history from database using the correct model name
    const actions = await prisma.tableAction.findMany({
      where: {
        tableId: targetTableId
      },
      orderBy: {
        timestamp: 'asc'
      }
    });
    
    console.log(`✅ TEST API: Retrieved ${actions.length} actions for table ${targetTableId}`);
    
    res.json({
      success: true,
      actions,
      tableId: targetTableId,
      count: actions.length
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting action history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get action history'
    });
  }
});

/**
 * TEST API: Get game history (parity with main API)
 * GET /api/tables/:tableId/game/history
 */
router.get('/tables/:tableId/game/history', async (req, res) => {
  try {
    const { tableId } = req.params;
    if (!tableId) {
      return res.status(400).json({ success: false, error: 'Missing tableId' });
    }
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ success: false, error: 'Invalid tableId' });
    }
    const actions = await prisma.tableAction.findMany({
      where: { tableId: targetTableId },
      orderBy: { timestamp: 'asc' }
    });
    res.json({ success: true, history: actions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get game history' });
  }
});

// POST /api/test/create-test-data - Create test data for testing
router.post('/create-test-data', async (req, res) => {
  try {
    const { players, tables } = req.body;
    
    console.log(`🧪 TEST API: Create test data request received`);
    
    // Create tables
    if (tables && Array.isArray(tables)) {
      for (const table of tables) {
        await prisma.table.create({
          data: {
            name: table.name,
            maxPlayers: table.maxPlayers,
            smallBlind: table.smallBlind,
            bigBlind: table.bigBlind,
            minBuyIn: table.minBuyIn,
            maxBuyIn: table.maxBuyIn,
            status: 'waiting'
          }
        });
      }
    }

    // Create players
    if (players && Array.isArray(players)) {
      for (const player of players) {
        await prisma.player.create({
          data: {
            id: player.id || uuidv4(), // Generate a UUID if not provided
            nickname: player.nickname,
            chips: player.chips
          }
        });
      }
    }

    // Seat players at the table
    if (tables && Array.isArray(tables) && players && Array.isArray(players)) {
      for (const table of tables) {
        const createdTable = await prisma.table.findFirst({ where: { name: table.name } });
        if (createdTable) {
          for (const player of players) {
            await prisma.playerTable.create({
              data: {
                tableId: createdTable.id,
                playerId: player.nickname, // Use nickname as ID
                buyIn: player.chips,
                seatNumber: players.indexOf(player) + 1 // Assign seat numbers sequentially starting from 1
              }
            });
          }
        }
      }
    }

    console.log(`✅ TEST API: Test data created successfully`);
    res.json({ success: true, message: 'Test data created successfully' });
  } catch (error) {
    console.error('❌ TEST API: Error creating test data:', error);
    res.status(500).json({ success: false, error: 'Failed to create test data' });
  }
});

// POST /api/test/start-game - Start a game for a specific table
router.post('/start-game', async (req, res) => {
  try {
    const { tableId } = req.body;
    
    console.log(`🧪 TEST API: Start game request received for tableId: ${tableId}`);
    
    if (!tableId) {
      return res.status(400).json({ success: false, error: 'No tableId provided' });
    }

    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ success: false, error: 'Invalid tableId - must be a number' });
    }

    // Start the game using TableManager
    const result = await req.app.get('tableManager').startTableGame(targetTableId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'Failed to start game' });
    }

    console.log(`✅ TEST API: Game started successfully for table: ${targetTableId}`);
    res.json({ success: true, message: 'Game started successfully', gameState: result.gameState });
  } catch (error) {
    console.error('❌ TEST API: Error starting game:', error);
    res.status(500).json({ success: false, error: 'Failed to start game' });
  }
});

// Use the auto-seat testing API instead
router.post('/auto-seat', async (req, res) => {
  try {
    const { tableId, seatNumber, buyIn = 100, playerName, isTestMode = true } = req.body;
    
    console.log(`🧪 TEST API DIRECT: Auto-seat request for tableId: ${tableId}, seatNumber: ${seatNumber}, playerName: ${playerName}`);
    
    // Validate input
    if (!tableId || !seatNumber || !playerName) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: tableId, seatNumber, playerName' });
    }

    // SIMPLIFIED APPROACH: Add player directly to TableManager for testing
    const targetTableId = parseInt(tableId);
    
    // Get the table's game state
    let gameState = tableManager.getTableGameState(targetTableId);
    
    if (!gameState) {
      // Initialize empty game state for this table
      gameState = {
        id: targetTableId.toString(),
        players: [],
        communityCards: [],
        pot: 0,
        currentPlayerId: null,
        currentPlayerPosition: 0,
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        status: 'waiting',
        phase: 'preflop',
        minBet: 2,
        currentBet: 0,
        smallBlind: 1,
        bigBlind: 2
      };
    }

    // Check if player already exists
    const existingPlayer = gameState.players.find(p => p.name === playerName);
    if (existingPlayer) {
      console.log(`⚠️ TEST API: Player ${playerName} already exists in game state`);
      return res.status(400).json({ success: false, error: `Player ${playerName} already seated` });
    }

    // Add player to game state
    const newPlayer = {
      id: playerName,
      name: playerName,
      seatNumber: parseInt(seatNumber),
      position: parseInt(seatNumber),
      chips: buyIn,
      currentBet: 0,
      isDealer: false,
      isAway: false,
      isActive: true,
      avatar: {
        type: 'default',
        color: '#007bff'
      },
      cards: []
    };

    gameState.players.push(newPlayer);
    gameState.players.sort((a, b) => a.seatNumber - b.seatNumber);

    // CRITICAL: Also register player in TableManager's tablePlayers Map
    const sitDownResult = tableManager.sitDown(targetTableId, playerName, buyIn);
    if (!sitDownResult.success) {
      console.log(`⚠️ TEST API: sitDown failed: ${sitDownResult.error}`);
    } else {
      console.log(`✅ TEST API: Player ${playerName} registered in TableManager`);
    }

    console.log(`✅ TEST API DIRECT: Player ${playerName} added to game state at table ${tableId}, seat ${seatNumber}`);
    console.log(`📊 TEST API: Game state now has ${gameState.players.length} players`);
    console.log(`📊 TEST API: TableManager now sees ${tableManager.getTablePlayers(targetTableId).length} players`);

    // Emit socket event for real-time updates
    const io = (global as any).socketIO;
    if (io) {
      io.to(`table:${tableId}`).emit('gameState', gameState);
      io.to(`table:${tableId}`).emit('playerJoined', {
        tableId: targetTableId,
        player: newPlayer
      });
      console.log(`📡 TEST API: Emitted gameState and playerJoined events for ${playerName}`);
    }

    res.json({ 
      success: true, 
      message: `Player ${playerName} seated at table ${tableId}, seat ${seatNumber}`,
      player: newPlayer,
      gameState: {
        players: gameState.players.length,
        status: gameState.status
      }
    });
  } catch (error) {
    console.error('❌ TEST API: Error in auto-seat endpoint:', error);
    res.status(500).json({ success: false, error: `Auto-seat failed: ${(error as Error).message}` });
  }
});

// DEBUG API: Check TableManager player state
router.get('/debug-table/:tableId', async (req, res) => {
  try {
    const tableId = parseInt(req.params.tableId);
    const players = tableManager.getTablePlayers(tableId);
    const gameState = tableManager.getTableGameState(tableId);
    
    res.json({
      tableId,
      tablePlayers: players,
      gameStatePlayers: gameState?.players || [],
      playerCount: players.length,
      gameStatePlayerCount: gameState?.players?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * TEST API: Seat player endpoint
 * POST /api/test/seat-player
 */
router.post('/seat-player', async (req, res) => {
  try {
    const { tableId, playerId, seatNumber, buyIn } = req.body;
    
    console.log(`🧪 TEST API: Seat player - table ${tableId}, player ${playerId}, seat ${seatNumber}, buyIn ${buyIn}`);
    
    if (!tableId || !playerId || !seatNumber || !buyIn) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: tableId, playerId, seatNumber, buyIn'
      });
    }
    
    const targetTableId = parseInt(tableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tableId - must be a number' 
      });
    }
    
    const targetSeatNumber = parseInt(seatNumber);
    if (isNaN(targetSeatNumber) || targetSeatNumber < 1 || targetSeatNumber > 9) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid seatNumber - must be a number between 1 and 9' 
      });
    }
    
    // First, ensure the player exists in the database
    let player = await prisma.player.findUnique({
      where: { nickname: playerId }
    });
    
    if (!player) {
      // Create the player if they don't exist
      player = await prisma.player.create({
        data: {
          id: playerId,        // Use playerId as the primary key
          nickname: playerId,
          chips: buyIn
        }
      });
      console.log(`✅ TEST API: Created new player ${playerId} with ${buyIn} chips`);
    }
    
    // Check if player is already seated at this table
    const existingPlayerTable = await prisma.playerTable.findFirst({
      where: {
        playerId: player.id,
        tableId: targetTableId
      }
    });
    
    if (existingPlayerTable) {
      console.log(`✅ TEST API: Player ${playerId} already seated at table ${targetTableId}, seat ${existingPlayerTable.seatNumber}`);
      return res.json({
        success: true,
        message: `Player ${playerId} already seated at table ${targetTableId}`,
        seatNumber: existingPlayerTable.seatNumber
      });
    }
    
    // Check if the seat is already taken
    const seatTaken = await prisma.playerTable.findFirst({
      where: {
        tableId: targetTableId,
        seatNumber: targetSeatNumber
      }
    });
    
    if (seatTaken) {
      return res.status(400).json({ 
        success: false, 
        error: `Seat ${targetSeatNumber} is already taken at table ${targetTableId}`
      });
    }
    
    // Create the PlayerTable association
    const playerTable = await prisma.playerTable.create({
      data: {
        playerId: player.id,
        tableId: targetTableId,
        seatNumber: targetSeatNumber,
        buyIn: buyIn
      }
    });
    
    // CRITICAL FIX: Update LocationManager to reflect the player now has a seat
    // This prevents seated players from appearing in the observers list
    const { locationManager } = require('../services/LocationManager');
    locationManager.updateUserLocation(
      player.id,        // playerId 
      player.nickname,  // nickname
      targetTableId,    // tableId
      targetSeatNumber  // seatNumber
    );
    
    console.log(`✅ TEST API: Successfully seated ${playerId} at table ${targetTableId}, seat ${targetSeatNumber}`);
    
    res.json({
      success: true,
      message: `Player ${playerId} seated successfully`,
      tableId: targetTableId,
      playerId: player.id,
      seatNumber: targetSeatNumber,
      buyIn: buyIn
    });
    
  } catch (error) {
    console.error('❌ TEST API: Error seating player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seat player'
    });
  }
});

// POST /api/test/set-player-cards - Set hole cards for players (testing only)
router.post('/set-player-cards', async (req, res) => {
  try {
    const { tableId, playerCards } = req.body;
    
    console.log(`🃏 TEST API: Setting player cards for table ${tableId}:`, playerCards);
    
    // Get the current table game state (which contains the players array)
    const tableGameState = tableManager.getTableGameState(tableId);
    if (!tableGameState) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableId} not found or no active game`
      });
    }
    
    // Update player cards in the table game state
    for (const [playerId, cards] of Object.entries(playerCards as Record<string, any>)) {
      const player = tableGameState.players.find((p: any) => p.id === playerId || p.name.toLowerCase().includes(playerId.replace('test-', '')));
      if (player) {
        player.cards = cards;
        console.log(`✅ Set cards for ${player.name} (${player.id}):`, cards);
      } else {
        console.log(`⚠️ Player ${playerId} not found in table ${tableId}`);
      }
    }
    
    // Emit updated game state with field conversion for frontend compatibility
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 TEST API: Emitting updated game state with player cards for table ${tableId}`);
      
      // Apply field conversion for frontend compatibility (same as consolidatedHandler)
      const frontendGameState = {
        ...tableGameState,
        communityCards: tableGameState.board || [],  // Map board to communityCards for frontend
        board: undefined  // Remove backend-specific field
      };
      
      console.log(`🔄 TEST API: Frontend game state conversion:`, {
        originalBoard: tableGameState.board?.map((c: any) => `${c.rank}${c.suit}`) || 'none',
        convertedCommunityCards: frontendGameState.communityCards?.map((c: any) => `${c.rank}${c.suit}`) || 'none',
        playersWithCards: frontendGameState.players?.filter((p: any) => p.cards?.length > 0).length || 0
      });
      
      // Emit to table-based rooms (table-only architecture)
      io.to(`table:${tableId}`).emit('gameState', frontendGameState);
      
      // Also emit to all clients for debugging/fallback
      io.emit('gameState', frontendGameState);
      
      console.log(`📡 TEST API: WebSocket events emitted for table ${tableId} with player cards`);
    } else {
      console.log(`⚠️ TEST API: Socket.IO instance not available for table ${tableId}`);
    }
    
    res.json({
      success: true,
      message: 'Player cards set successfully',
      tableId: tableId,
      playersUpdated: Object.keys(playerCards)
    });
    
  } catch (error) {
    console.error('❌ TEST API: Error setting player cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set player cards'
    });
  }
});

// API endpoint to manually trigger showdown and winner determination
router.post('/trigger-showdown', async (req, res) => {
  try {
    const { tableId } = req.body;
    
    console.log(`🏆 TEST API: Triggering showdown for table ${tableId}`);
    
    // Get the current table game state
    const tableGameState = tableManager.getTableGameState(tableId);
    if (!tableGameState) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableId} not found or no active game`
      });
    }
    
    // Force phase to showdown and trigger winner determination
    tableGameState.phase = 'showdown';
    console.log(`🎯 Set phase to showdown for table ${tableId}`);
    
    // Manually call the private determineWinner method via reflection
    // Since it's private, we'll trigger phase advancement which calls it
    await (tableManager as any).determineWinner(tableId, tableGameState);
    
    // Emit updated game state
    const io = req.app.get('io');
    if (io) {
      io.to(`table:${tableId}`).emit('gameState', tableGameState);
      console.log(`📡 Emitted showdown game state to table:${tableId}`);
    }
    
    res.json({
      success: true,
      message: 'Showdown triggered successfully',
      tableId: tableId,
      phase: tableGameState.phase
    });
    
  } catch (error) {
    console.error('❌ TEST API: Error triggering showdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger showdown'
    });
  }
});

// Tournament Features Test APIs
/**
 * TEST API: Setup tournament with blind levels
 * POST /api/test_setup_tournament
 */
router.post('/test_setup_tournament', async (req, res) => {
  try {
    const { tableId, blindLevels, players, currentLevel } = req.body;
    
    console.log(`🧪 TEST API: Setting up tournament for table ${tableId}`);
    
    const tournamentState = {
      tableId,
      mode: 'tournament',
      blindLevels: blindLevels || [
        { level: 1, smallBlind: 1, bigBlind: 2, ante: 0, duration: 600 },
        { level: 2, smallBlind: 2, bigBlind: 4, ante: 0, duration: 600 },
        { level: 3, smallBlind: 3, bigBlind: 6, ante: 1, duration: 600 }
      ],
      currentLevel: currentLevel || 0,
      levelStartTime: Date.now(),
      players: players || []
    };
    
    // Store tournament state in memory cache
    memoryCache.set(`tournament_${tableId}`, tournamentState);
    
    res.json({
      success: true,
      tournament: tournamentState,
      message: `Tournament setup for table ${tableId}`
    });
  } catch (error) {
    console.error('Error setting up tournament:', error);
    res.status(500).json({ error: 'Failed to setup tournament' });
  }
});

/**
 * TEST API: Advance blind level
 * POST /api/test_advance_blind_level/:tableId
 */
router.post('/test_advance_blind_level/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const tournamentKey = `tournament_${tableId}`;
    const tournament = memoryCache.get(tournamentKey);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    tournament.currentLevel = Math.min(tournament.currentLevel + 1, tournament.blindLevels.length - 1);
    tournament.levelStartTime = Date.now();
    
    memoryCache.set(tournamentKey, tournament);
    
    const currentBlinds = tournament.blindLevels[tournament.currentLevel];
    
    res.json({
      success: true,
      currentLevel: tournament.currentLevel,
      blinds: currentBlinds,
      message: `Advanced to level ${tournament.currentLevel + 1}`
    });
  } catch (error) {
    console.error('Error advancing blind level:', error);
    res.status(500).json({ error: 'Failed to advance blind level' });
  }
});

// Network Simulation Test APIs
/**
 * TEST API: Simulate network disconnection
 * POST /api/test_simulate_disconnect/:playerId
 */
router.post('/test_simulate_disconnect/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { duration } = req.body;
    
    console.log(`🧪 TEST API: Simulating disconnect for player ${playerId}`);
    
    const disconnectionState = {
      playerId,
      disconnectedAt: Date.now(),
      duration: duration || 30000, // 30 seconds default
      status: 'disconnected'
    };
    
    memoryCache.set(`disconnect_${playerId}`, disconnectionState);
    
    // Auto-reconnect after duration
    setTimeout(() => {
      memoryCache.delete(`disconnect_${playerId}`);
      console.log(`🧪 TEST API: Auto-reconnected player ${playerId}`);
    }, disconnectionState.duration);
    
    res.json({
      success: true,
      disconnection: disconnectionState,
      message: `Simulated disconnect for ${playerId}`
    });
  } catch (error) {
    console.error('Error simulating disconnect:', error);
    res.status(500).json({ error: 'Failed to simulate disconnect' });
  }
});

/**
 * TEST API: Get connection status
 * GET /api/test_connection_status/:playerId
 */
router.get('/test_connection_status/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const disconnectionState = memoryCache.get(`disconnect_${playerId}`);
    
    res.json({
      success: true,
      playerId,
      isConnected: !disconnectionState,
      disconnectionInfo: disconnectionState || null
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

// Chat System Test APIs
/**
 * TEST API: Send test chat message
 * POST /api/test_send_chat_message
 */
router.post('/test_send_chat_message', async (req, res) => {
  try {
    const { tableId, playerId, message, messageType } = req.body;
    
    const chatMessage = {
      id: uuidv4(),
      tableId,
      playerId,
      playerName: `TestPlayer${playerId}`,
      message,
      messageType: messageType || 'public', // public, private, system
      timestamp: Date.now(),
      isVisible: true
    };
    
    // Store in memory cache
    const chatKey = `chat_${tableId}`;
    let chatHistory = memoryCache.get(chatKey) || [];
    chatHistory.push(chatMessage);
    
    // Keep only last 100 messages
    if (chatHistory.length > 100) {
      chatHistory = chatHistory.slice(-100);
    }
    
    memoryCache.set(chatKey, chatHistory);
    
    res.json({
      success: true,
      message: chatMessage,
      chatHistory: chatHistory.slice(-10) // Return last 10 messages
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send chat message' });
  }
});

/**
 * TEST API: Get chat history
 * GET /api/test_get_chat_history/:tableId
 */
router.get('/test_get_chat_history/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { limit = 50 } = req.query;
    
    const chatKey = `chat_${tableId}`;
    const chatHistory = memoryCache.get(chatKey) || [];
    
    const limitedHistory = chatHistory.slice(-parseInt(limit as string));
    
    res.json({
      success: true,
      tableId,
      messages: limitedHistory,
      totalMessages: chatHistory.length
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Error Simulation Test APIs
/**
 * TEST API: Simulate various error conditions
 * POST /api/test_simulate_error
 */
router.post('/test_simulate_error', async (req, res) => {
  try {
    const { errorType, tableId, playerId, customError } = req.body;
    
    let errorResponse;
    
    switch (errorType) {
      case 'invalid_action':
        errorResponse = {
          error: 'INVALID_ACTION',
          message: 'Action not allowed in current game state',
          details: { currentPhase: 'showdown', attemptedAction: 'bet' }
        };
        break;
      
      case 'insufficient_chips':
        errorResponse = {
          error: 'INSUFFICIENT_CHIPS',
          message: 'Not enough chips for this action',
          details: { required: 100, available: 50 }
        };
        break;
      
      case 'table_full':
        errorResponse = {
          error: 'TABLE_FULL',
          message: 'Table has reached maximum capacity',
          details: { maxPlayers: 6, currentPlayers: 6 }
        };
        break;
      
      case 'game_not_found':
        errorResponse = {
          error: 'GAME_NOT_FOUND',
          message: 'Game session not found',
          details: { tableId }
        };
        break;
      
      case 'timeout':
        // Simulate timeout by delaying response
        await new Promise(resolve => setTimeout(resolve, 5000));
        errorResponse = {
          error: 'REQUEST_TIMEOUT',
          message: 'Request timed out',
          details: { timeout: 5000 }
        };
        break;
      
      case 'custom':
        errorResponse = customError;
        break;
      
      default:
        errorResponse = {
          error: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
          details: { errorType }
        };
    }
    
    // Store error for tracking
    const errorKey = `error_${Date.now()}_${Math.random()}`;
    memoryCache.set(errorKey, {
      ...errorResponse,
      simulatedAt: Date.now(),
      tableId,
      playerId
    });
    
    res.status(400).json(errorResponse);
  } catch (error) {
    console.error('Error simulating error:', error);
    res.status(500).json({ error: 'Failed to simulate error' });
  }
});

// Performance Testing APIs
/**
 * TEST API: Create high-load scenario
 * POST /api/test_create_load_scenario
 */
router.post('/test_create_load_scenario', async (req, res) => {
  try {
    const { tableCount, playersPerTable, actionFrequency } = req.body;
    
    const loadScenario: any = {
      id: uuidv4(),
      tableCount: tableCount || 3,
      playersPerTable: playersPerTable || 9,
      actionFrequency: actionFrequency || 1000, // actions per second
      startTime: Date.now(),
      status: 'running',
      tables: []
    };
    
    // Create mock tables with players
    const tables = [];
    for (let i = 1; i <= loadScenario.tableCount; i++) {
      const players = [];
      for (let j = 1; j <= loadScenario.playersPerTable; j++) {
        players.push({
          id: `load_player_${i}_${j}`,
          name: `LoadPlayer${i}_${j}`,
          chips: 1000,
          seat: j
        });
      }
      
      tables.push({
        id: `load_table_${i}`,
        players,
        status: 'active'
      });
    }
    
    loadScenario.tables = tables;
    memoryCache.set(`load_scenario_${loadScenario.id}`, loadScenario);
    
    res.json({
      success: true,
      scenario: loadScenario,
      message: `Created load scenario with ${tableCount} tables`
    });
  } catch (error) {
    console.error('Error creating load scenario:', error);
    res.status(500).json({ error: 'Failed to create load scenario' });
  }
});

// Mobile/Accessibility Test APIs
/**
 * TEST API: Set device simulation
 * POST /api/test_set_device_simulation
 */
router.post('/test_set_device_simulation', async (req, res) => {
  try {
    const { deviceType, screenSize, touchEnabled, orientation } = req.body;
    
    const deviceSimulation = {
      deviceType: deviceType || 'mobile', // mobile, tablet, desktop
      screenSize: screenSize || { width: 375, height: 667 },
      touchEnabled: touchEnabled !== undefined ? touchEnabled : true,
      orientation: orientation || 'portrait', // portrait, landscape
      userAgent: deviceType === 'mobile' ? 'Mobile Safari' : 'Desktop Chrome',
      simulatedAt: Date.now()
    };
    
    memoryCache.set('device_simulation', deviceSimulation);
    
    res.json({
      success: true,
      device: deviceSimulation,
      message: `Device simulation set to ${deviceType}`
    });
  } catch (error) {
    console.error('Error setting device simulation:', error);
    res.status(500).json({ error: 'Failed to set device simulation' });
  }
});

/**
 * TEST API: Get accessibility features status
 * GET /api/test_accessibility_status
 */
router.get('/test_accessibility_status', async (req, res) => {
  try {
    const accessibilityFeatures = {
      screenReaderSupport: true,
      keyboardNavigation: true,
      highContrast: false,
      fontSize: 'normal',
      colorBlindSupport: true,
      ariaLabels: true,
      focusIndicators: true,
      alternativeText: true
    };
    
    res.json({
      success: true,
      accessibility: accessibilityFeatures,
      wcagCompliance: 'AA'
    });
  } catch (error) {
    console.error('Error getting accessibility status:', error);
    res.status(500).json({ error: 'Failed to get accessibility status' });
  }
});

// Game State Recovery Test APIs
/**
 * TEST API: Simulate corrupted game state
 * POST /api/test_corrupt_game_state/:tableId
 */
router.post('/test_corrupt_game_state/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { corruptionType } = req.body;
    
    const corruptedState: any = {
      tableId,
      corruptionType: corruptionType || 'invalid_phase',
      originalState: memoryCache.get(`table_${tableId}`),
      corruptedAt: Date.now(),
      invalidData: null
    };
    
    // Apply corruption based on type
    switch (corruptionType) {
      case 'invalid_phase':
        corruptedState.invalidData = { phase: 'invalid_phase' };
        break;
      case 'missing_players':
        corruptedState.invalidData = { players: [] };
        break;
      case 'negative_chips':
        corruptedState.invalidData = { players: [{ chips: -100 }] };
        break;
      case 'duplicate_cards':
        corruptedState.invalidData = { communityCards: ['AS', 'AS', 'KH'] };
        break;
    }
    
    memoryCache.set(`corrupted_${tableId}`, corruptedState);
    
    res.json({
      success: true,
      corruption: corruptedState,
      message: `Simulated ${corruptionType} corruption for table ${tableId}`
    });
  } catch (error) {
    console.error('Error corrupting game state:', error);
    res.status(500).json({ error: 'Failed to corrupt game state' });
  }
});

/**
 * TEST API: Recover from corrupted state
 * POST /api/test_recover_game_state/:tableId
 */
router.post('/test_recover_game_state/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const corruptedState = memoryCache.get(`corrupted_${tableId}`);
    
    if (!corruptedState) {
      return res.status(404).json({ error: 'No corrupted state found' });
    }
    
    const recoveryResult = {
      tableId,
      recoveredAt: Date.now(),
      originalState: corruptedState.originalState,
      recoveryMethod: 'state_restoration',
      success: true
    };
    
    // Restore original state
    if (corruptedState.originalState) {
      memoryCache.set(`table_${tableId}`, corruptedState.originalState);
    }
    
    // Clear corruption marker
    memoryCache.delete(`corrupted_${tableId}`);
    
    res.json({
      success: true,
      recovery: recoveryResult,
      message: `Recovered game state for table ${tableId}`
    });
  } catch (error) {
    console.error('Error recovering game state:', error);
    res.status(500).json({ error: 'Failed to recover game state' });
  }
});

/**
 * DUMMY API: Deal hole cards (for UI testing)
 * POST /api/test/deal-hole-cards
 */
router.post('/deal-hole-cards', async (req, res) => {
  try {
    const { tableId, players } = req.body;
    console.log(`🧪 DUMMY API: Deal hole cards for table ${tableId}`);
    
    // Simulate dealing cards
    const dealtCards = players.map((player: any) => ({
      playerName: player.name,
      seat: player.seat,
      cards: player.cards || [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' }
      ]
    }));
    
    // Store in memory cache for potential retrieval
    memoryCache.set(`hole_cards_${tableId}`, {
      tableId,
      dealtAt: Date.now(),
      players: dealtCards
    });
    
    res.json({
      success: true,
      message: 'Hole cards dealt successfully',
      tableId,
      cards: dealtCards.length * 2,
      players: dealtCards
    });
  } catch (error) {
    console.error('Error dealing hole cards:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to deal hole cards' 
    });
  }
});

/**
 * DUMMY API: Enable betting controls (for UI testing)
 * POST /api/test/enable-betting-controls
 */
router.post('/enable-betting-controls', async (req, res) => {
  try {
    const { tableId, currentPlayer, availableActions } = req.body;
    console.log(`🧪 DUMMY API: Enable betting controls for table ${tableId}, player ${currentPlayer}`);
    
    const bettingState = {
      tableId,
      currentPlayer,
      availableActions: availableActions || ['check', 'bet', 'fold', 'call', 'raise'],
      enabledAt: Date.now(),
      minBet: 2,
      maxBet: 100,
      currentBet: 0
    };
    
    // Store betting state
    memoryCache.set(`betting_controls_${tableId}`, bettingState);
    
    res.json({
      success: true,
      message: 'Betting controls enabled',
      tableId,
      currentPlayer,
      actions: bettingState.availableActions,
      bettingState
    });
  } catch (error) {
    console.error('Error enabling betting controls:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to enable betting controls' 
    });
  }
});

/**
 * DUMMY API: Deal community cards (for UI testing)
 * POST /api/test/deal-community-cards
 */
router.post('/deal-community-cards', async (req, res) => {
  try {
    const { tableId, phase, cards } = req.body;
    console.log(`🧪 DUMMY API: Deal community cards for table ${tableId}, phase ${phase}`);
    
    const communityCards = cards || [
      { suit: 'hearts', rank: '9' },
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'clubs', rank: 'A' }
    ];
    
    const communityState = {
      tableId,
      phase: phase || 'flop',
      cards: communityCards,
      dealtAt: Date.now()
    };
    
    // Store community cards state
    memoryCache.set(`community_cards_${tableId}`, communityState);
    
    // Emit to WebSocket for UI update
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 DUMMY API: Broadcasting community cards to table:${tableId}`);
      io.to(`table:${tableId}`).emit('communityCardsDealt', {
        tableId,
        phase,
        communityCards,
        board: communityCards
      });
      
      // Also emit general gameState update
      io.to(`table:${tableId}`).emit('gameState', {
        tableId,
        phase,
        communityCards,
        board: communityCards,
        status: 'playing'
      });
    }
    
    res.json({
      success: true,
      message: `Community cards dealt for ${phase}`,
      tableId,
      phase,
      cards: communityCards.length,
      communityCards
    });
  } catch (error) {
    console.error('Error dealing community cards:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to deal community cards' 
    });
  }
});

/**
 * DUMMY API: Show player cards in UI (for UI testing)
 * POST /api/test/show-player-cards
 */
router.post('/show-player-cards', async (req, res) => {
  try {
    const { tableId, playerId, cards, visible } = req.body;
    console.log(`🧪 DUMMY API: Show player cards for ${playerId} at table ${tableId}`);
    
    const playerCards = cards || [
      { suit: 'hearts', rank: 'A' },
      { suit: 'spades', rank: 'K' }
    ];
    
    // Emit to WebSocket for UI update
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 DUMMY API: Broadcasting player cards to table:${tableId}`);
      io.to(`table:${tableId}`).emit('playerCardsUpdate', {
        tableId,
        playerId,
        cards: playerCards,
        visible: visible !== false
      });
    }
    
    res.json({
      success: true,
      message: `Player cards shown for ${playerId}`,
      tableId,
      playerId,
      cards: playerCards,
      visible: visible !== false
    });
  } catch (error) {
    console.error('Error showing player cards:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to show player cards' 
    });
  }
});

/**
 * DUMMY API: Create UI buttons/controls (for UI testing)
 * POST /api/test/create-ui-buttons
 */
router.post('/create-ui-buttons', async (req, res) => {
  try {
    const { tableId, playerId, buttons } = req.body;
    console.log(`🧪 DUMMY API: Create UI buttons for ${playerId} at table ${tableId}`);
    
    const defaultButtons = buttons || [
      { id: 'btn-fold', text: 'Fold', action: 'fold', enabled: true },
      { id: 'btn-check', text: 'Check', action: 'check', enabled: true },
      { id: 'btn-call', text: 'Call', action: 'call', enabled: true },
      { id: 'btn-bet', text: 'Bet', action: 'bet', enabled: true },
      { id: 'btn-raise', text: 'Raise', action: 'raise', enabled: true }
    ];
    
    // Emit to WebSocket for UI update
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 DUMMY API: Broadcasting UI buttons to table:${tableId}`);
      io.to(`table:${tableId}`).emit('uiButtonsUpdate', {
        tableId,
        playerId,
        buttons: defaultButtons,
        showButtons: true
      });
    }
    
    res.json({
      success: true,
      message: `UI buttons created for ${playerId}`,
      tableId,
      playerId,
      buttons: defaultButtons
    });
  } catch (error) {
    console.error('Error creating UI buttons:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create UI buttons' 
    });
  }
});

/**
 * DUMMY API: Update pot display (for UI testing)
 * POST /api/test/update-pot-display
 */
router.post('/update-pot-display', async (req, res) => {
  try {
    const { tableId, potAmount, chips, playerChips } = req.body;
    console.log(`🧪 DUMMY API: Update pot display for table ${tableId}, pot: ${potAmount}`);
    
    const potData = {
      tableId,
      pot: potAmount || 25,
      chips: chips || [
        { color: 'red', value: 5, count: 3 },
        { color: 'blue', value: 10, count: 1 }
      ],
      playerChips: playerChips || {
        'UITestPlayer': 95,
        'DummyPlayer2': 90
      },
      updatedAt: Date.now()
    };
    
    // Store pot state
    memoryCache.set(`pot_display_${tableId}`, potData);
    
    // Emit to WebSocket for UI update
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 DUMMY API: Broadcasting pot display to table:${tableId}`);
      io.to(`table:${tableId}`).emit('potUpdate', potData);
      
      // Also emit game state update
      io.to(`table:${tableId}`).emit('gameState', {
        tableId,
        pot: potData.pot,
        players: Object.entries(potData.playerChips).map(([name, chips]) => ({
          name,
          chips,
          id: name
        }))
      });
    }
    
    res.json({
      success: true,
      message: `Pot display updated for table ${tableId}`,
      ...potData
    });
  } catch (error) {
    console.error('Error updating pot display:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update pot display' 
    });
  }
});

/**
 * DUMMY API: Create visible UI elements (for UI testing)
 * POST /api/test/create-visible-elements
 */
router.post('/create-visible-elements', async (req, res) => {
  try {
    const { tableId, elementTypes } = req.body;
    console.log(`🧪 DUMMY API: Create visible UI elements for table ${tableId}`);
    
    const elements = elementTypes || [
      'poker-table',
      'player-seats',
      'action-buttons',
      'card-area',
      'pot-area',
      'chip-stacks',
      'game-info'
    ];
    
    const uiElementsData: Record<string, any> = {
      'poker-table': { seats: 6, maxPlayers: 6 },
      'player-seats': { occupied: 2, available: 4 },
      'action-buttons': { count: 5, enabled: 3 },
      'card-area': { holeCards: 2, communityCards: 3 },
      'pot-area': { amount: 25, chips: 8 },
      'chip-stacks': { players: 2, totalChips: 200 },
      'game-info': { phase: 'flop', round: 1 }
    };

    const uiElements = {
      tableId,
      elements: elements.map((type: string) => ({
        type,
        id: `ui-${type}`,
        visible: true,
        data: uiElementsData[type] || {}
      })),
      createdAt: Date.now()
    };
    
    // Store UI elements state
    memoryCache.set(`ui_elements_${tableId}`, uiElements);
    
    // Emit to WebSocket for UI update
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 DUMMY API: Broadcasting visible UI elements to table:${tableId}`);
      io.to(`table:${tableId}`).emit('uiElementsUpdate', uiElements);
    }
    
    res.json({
      success: true,
      message: `UI elements created for table ${tableId}`,
      ...uiElements
    });
  } catch (error) {
    console.error('Error creating visible UI elements:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create visible UI elements' 
    });
  }
});

export default router; 