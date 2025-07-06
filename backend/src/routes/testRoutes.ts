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
    
    const tableState = memoryCache.getTable(tableId);
    
    if (!tableState) {
      return res.status(404).json({
        success: false,
        error: 'Mock table not found'
      });
    }
    
    console.log(`🧪 TEST API: Retrieved mock table ${tableId}`);
    
    res.json({
      success: true,
      tableState
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting mock table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mock table'
    });
  }
});

/**
 * TEST API: Update mock table state
 * PUT /api/test_update_mock_table/:tableId
 */
router.put('/test_update_mock_table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { updates } = req.body;
    
    const tableState = memoryCache.getTable(tableId);
    
    if (!tableState) {
      return res.status(404).json({
        success: false,
        error: 'Mock table not found'
      });
    }
    
    // Apply updates to table state
    Object.assign(tableState, updates);
    
    // Update memory cache
    memoryCache.updateTable(tableId, tableState);
    
    console.log(`🧪 TEST API: Updated mock table ${tableId}:`, updates);
    
    res.json({
      success: true,
      tableState,
      message: 'Mock table updated'
    });
  } catch (error) {
    console.error('❌ TEST API: Error updating mock table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mock table'
    });
  }
});

/**
 * TEST API: Simulate player action in mock table
 * POST /api/test_player_action/:tableId
 */
router.post('/test_player_action/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { playerId, nickname, action, amount } = req.body;
    
    const tableState = memoryCache.getTable(tableId);
    
    if (!tableState) {
      return res.status(404).json({
        success: false,
        error: 'Mock table not found'
      });
    }
    
    // Find player by ID or nickname
    const player = tableState.players.find((p: any) => 
      p.id === playerId || p.name === nickname
    );
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }
    
    // Simulate action
    switch (action) {
      case 'bet':
      case 'raise':
        if (amount && amount > 0) {
          player.chips -= amount;
          player.currentBet = amount;
          tableState.pot += amount;
          tableState.currentBet = amount;
        }
        break;
      case 'call':
        const callAmount = tableState.currentBet - player.currentBet;
        if (callAmount > 0 && player.chips >= callAmount) {
          player.chips -= callAmount;
          player.currentBet = tableState.currentBet;
          tableState.pot += callAmount;
        }
        break;
      case 'fold':
        player.isActive = false;
        break;
      case 'check':
        // Check is always valid if no current bet
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }
    
    // Update memory cache
    memoryCache.updateTable(tableId, tableState);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`table:${tableId}`).emit('tableState', tableState);
    }
    
    console.log(`🧪 TEST API: Player ${player.name} performed ${action} on table ${tableId}`);
    
    res.json({
      success: true,
      tableState,
      message: `Player ${player.name} performed ${action}`
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