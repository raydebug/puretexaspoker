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

export default router; 