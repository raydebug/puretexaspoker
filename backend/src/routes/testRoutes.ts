import express from 'express';
import { tableManager } from '../services/TableManager';
import { authService } from '../services/authService';
import { roleManager } from '../services/roleManager';
import { memoryCache } from '../services/MemoryCache';
import { prisma } from '../db';

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

export default router; 