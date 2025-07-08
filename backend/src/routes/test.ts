import express from 'express';
import { PrismaClient } from '@prisma/client';
import { tableManager } from '../services/TableManager';
import { clearDatabase } from '../seed';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/test/start-game - Start a game for testing purposes
router.post('/start-game', async (req, res) => {
  try {
    const { gameId, tableId } = req.body;
    
    console.log(`🎮 TEST API: Start game request - gameId: ${gameId}, tableId: ${tableId}`);
    
    let targetTableId = tableId;
    
    if (!targetTableId && gameId) {
      // If only gameId provided, use it as tableId
      targetTableId = parseInt(gameId);
    }
    
    if (!targetTableId) {
      return res.status(400).json({ 
        success: false, 
        error: 'No tableId provided'
      });
    }
    
    // Ensure tableId is an integer
    targetTableId = parseInt(targetTableId);
    if (isNaN(targetTableId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tableId - must be a number'
      });
    }
    
    console.log(`🎮 TEST API: Starting game for table ${targetTableId}`);
    
    // Get the table from TableManager
    const table = tableManager.getTable(targetTableId);
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: `Table ${targetTableId} not found`
      });
    }
    
    // Start the game
    const result = await tableManager.startTableGame(targetTableId);
    
    if (result.success) {
      console.log(`🎮 TEST API: Game started successfully for table ${targetTableId}`);
      res.json({ 
        success: true, 
        message: `Game started for table ${targetTableId}`,
        tableId: targetTableId
      });
    } else {
      console.log(`🎮 TEST API: Failed to start game for table ${targetTableId}: ${result.error}`);
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('🎮 TEST API: Error starting game:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start game' 
    });
  }
});

// Reset test data
router.post('/reset', async (req, res) => {
  try {
    await clearDatabase();
    res.status(200).json({ message: 'Test data reset successful' });
  } catch (error) {
    console.error('Error resetting test data:', error);
    res.status(500).json({ error: 'Failed to reset test data' });
  }
});

// Reset database for testing
router.post('/reset-database', async (req, res) => {
  try {
    console.log('🧹 TEST API: Resetting database...');
    
    // Clear all player-table associations
    await prisma.playerTable.deleteMany({});
    console.log('🗑️ TEST API: Cleared player-table associations');
    
    // Clear all players
    await prisma.player.deleteMany({});
    console.log('🗑️ TEST API: Cleared players');
    
    // Clear all users
    await prisma.user.deleteMany({});
    console.log('🗑️ TEST API: Cleared users');
    
    // Clear all messages
    await prisma.message.deleteMany({});
    console.log('🗑️ TEST API: Cleared messages');
    
    // Clear all moderation actions
    await prisma.moderationAction.deleteMany({});
    console.log('🗑️ TEST API: Cleared moderation actions');
    
    // Clear all role permissions
    await prisma.rolePermission.deleteMany({});
    console.log('🗑️ TEST API: Cleared role permissions');
    
    // Clear all roles
    await prisma.role.deleteMany({});
    console.log('🗑️ TEST API: Cleared roles');
    
    // Clear all permissions
    await prisma.permission.deleteMany({});
    console.log('🗑️ TEST API: Cleared permissions');
    
    // Clear all tables
    await prisma.table.deleteMany({});
    console.log('🗑️ TEST API: Cleared tables');
    
    // Recreate default tables - use string IDs to match schema
    await prisma.table.createMany({
      data: [
        {
          id: 25,
          name: 'No Limit $0.01/$0.02 Micro Table 1',
          maxPlayers: 9,
          smallBlind: 1,
          bigBlind: 2,
          minBuyIn: 40,
          maxBuyIn: 200
        },
        {
          id: 26,
          name: 'Pot Limit $0.25/$0.50 Low Table 1',
          maxPlayers: 9,
          smallBlind: 25,
          bigBlind: 50,
          minBuyIn: 1000,
          maxBuyIn: 5000
        },
        {
          id: 27,
          name: 'Fixed Limit $1/$2 Medium Table 1',
          maxPlayers: 9,
          smallBlind: 100,
          bigBlind: 200,
          minBuyIn: 4000,
          maxBuyIn: 20000
        }
      ]
    });
    console.log('✅ TEST API: Recreated default tables');
    
    // Reset TableManager
    await tableManager.init();
    console.log('✅ TEST API: Reset TableManager');
    
    res.status(200).json({ 
      success: true,
      message: 'Database reset successful',
      tables: await prisma.table.findMany()
    });
  } catch (error) {
    console.error('🧹 TEST API: Error resetting database:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset database',
      details: (error as Error).message 
    });
  }
});

// Initialize roles endpoint
router.post('/initialize_roles', async (req, res) => {
  try {
    // Mock role initialization - in real app this would set up role system
    console.log('Role system initialization requested...');
    res.json({ success: true, message: 'Role system initialized' });
  } catch (error) {
    console.error('Error initializing roles:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize roles' });
  }
});

// GET /api/test/active-games - Get active games status
router.get('/active-games', async (req, res) => {
  try {
    console.log('🎮 TEST API: Active games status request');
    
    // Get all tables with their player associations
    const tables = await prisma.table.findMany({
      include: {
        playerTables: {
          include: {
            player: true
          }
        }
      }
    });
    
    const activeGames = tables.map(table => ({
      tableId: table.id,
      tableName: table.name,
      playerCount: table.playerTables.length,
      hasActiveGame: table.playerTables.length > 0,
      players: table.playerTables.map((pt: any) => ({
        playerId: pt.playerId,
        playerName: pt.player.nickname,
        seatNumber: pt.seatNumber
      }))
    }));
    
    console.log(`🎮 TEST API: Found ${activeGames.length} tables, ${activeGames.filter(t => t.hasActiveGame).length} with players`);
    
    res.json({
      success: true,
      activeGames,
      totalTables: activeGames.length,
      tablesWithPlayers: activeGames.filter(t => t.hasActiveGame).length
    });
  } catch (error) {
    console.error('🎮 TEST API: Error getting active games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active games status'
    });
  }
});

export default router; 