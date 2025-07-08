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
 * POST /api/reset_database
 */
router.post('/reset_database', async (req, res) => {
  try {
    console.log('🧹 TEST API: Resetting database to clean state...');
    
    // Clean up all test data
    await cleanupTestData();
    
    // Create default tables
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
    
    for (const tableData of defaultTables) {
      await prisma.table.create({ data: tableData });
    }
    
    // Reinitialize TableManager to pick up new tables
    await tableManager.init();
    console.log('🔄 TEST API: TableManager reinitialized with new tables');
    
    console.log('✅ TEST API: Database reset completed successfully');
    
    res.json({
      success: true,
      message: 'Database reset successful',
      tables: await prisma.table.findMany()
    });
  } catch (error) {
    console.error('❌ TEST API: Error resetting database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset database'
    });
  }
});

/**
 * TEST API: Start game for a table
 * POST /api/test/start-game
 */
router.post('/start-game', async (req, res) => {
  try {
    const { tableId } = req.body;
    
    console.log(`🚀 TEST API: Start game request - tableId: ${tableId}`);
    
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
    
    console.log(`🚀 TEST API: Starting game for table ${targetTableId}`);
    
    // Get the table from TableManager
    const table = tableManager.getTable(targetTableId);
    
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: `Table ${targetTableId} not found` 
      });
    }
    
    // Check if table has enough players to start
    const seatedPlayers = await prisma.playerTable.findMany({
      where: { tableId: targetTableId as any },
      include: { player: true }
    });
    
    console.log(`🚀 TEST API: Found ${seatedPlayers.length} seated players for table ${targetTableId}`);
    
    if (seatedPlayers.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: `Need at least 2 players to start game. Found ${seatedPlayers.length}` 
      });
    }
    
    // Update table status to playing
    await prisma.table.update({
      where: { id: targetTableId },
      data: {
        status: 'playing' as any,
        phase: 'preflop',
        handNumber: 1,
        pot: 0,
        currentBet: 0,
        minBet: table.bigBlind
      }
    });
    
    // Set dealer position and blinds
    const dealerPosition = 1; // Start with seat 1 as dealer
    const smallBlindPosition = 2;
    const bigBlindPosition = 3;
    
    await prisma.table.update({
      where: { id: targetTableId },
      data: {
        dealerPosition: dealerPosition as any,
        smallBlindPosition: smallBlindPosition as any,
        bigBlindPosition: bigBlindPosition as any,
        currentPlayerId: seatedPlayers[bigBlindPosition - 1]?.playerId || null
      }
    });
    
    // Reinitialize TableManager to pick up changes
    await tableManager.init();
    
    console.log(`✅ TEST API: Game started successfully for table ${targetTableId}`);
    
    // Get updated game state
    const gameState = tableManager.getTableGameState(targetTableId);
    
    // Emit game state via WebSocket
    const io = (global as any).socketIO;
    if (io && gameState) {
      console.log(`📡 TEST API: Emitting game start to table ${targetTableId}`);
      
      // Emit to table room
      io.to(`table:${targetTableId}`).emit('gameState', gameState);
      io.to(`table:${targetTableId}`).emit('gameStarted', {
        tableId: targetTableId,
        gameState
      });
      
      // Also emit to all clients for debugging
      io.emit('gameStarted', {
        tableId: targetTableId,
        gameState
      });
    }
    
    res.json({
      success: true,
      message: `Game started for table ${targetTableId}`,
      tableId: targetTableId,
      gameState,
      seatedPlayers: seatedPlayers.map(sp => ({
        id: sp.playerId,
        name: sp.player.nickname,
        seat: sp.seatNumber,
        chips: sp.buyIn
      }))
    });
  } catch (error) {
    console.error('🚀 TEST API: Error starting game:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start game' 
    });
  }
});

export default router; 