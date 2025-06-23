import express from 'express';
import { clearDatabase } from '../services/testService';
import { PrismaClient } from '@prisma/client';
import { CardOrderService } from '../services/cardOrderService';

const router = express.Router();
const prisma = new PrismaClient();
const cardOrderService = new CardOrderService();

// Basic connection check for tests
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Card transparency test endpoints
router.post('/create-card-order', async (req, res) => {
  try {
    const { gameId, isRevealed = false, testData = true } = req.body;
    
    // Create a test game if it doesn't exist
    let game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      game = await prisma.game.create({
        data: {
          id: gameId,
          tableId: 'test-table-1',
          status: 'waiting',
          pot: 0
        }
      });
    }
    
    // Create card order (simplified for testing)
    const cardOrder = await prisma.cardOrder.create({
      data: {
        gameId,
        seed: 'test-seed-' + Date.now(),
        cardOrder: JSON.stringify(['AH', 'KS', 'QD', 'JC', 'TC']), // Mock card order
        hash: 'test-hash-' + gameId,
        isRevealed
      }
    });
    
    res.json({ success: true, cardOrder });
  } catch (error) {
    console.error('Error creating card order:', error);
    res.status(500).json({ success: false, error: 'Failed to create card order' });
  }
});

router.post('/create-revealed-card-orders', async (req, res) => {
  try {
    const { count = 3, testData = true } = req.body;
    
    const createdOrders = [];
    
    for (let i = 1; i <= count; i++) {
      const gameId = `test-game-${Date.now()}-${i}`;
      
      // Create test table and game
      let table = await prisma.table.findFirst({ where: { name: 'Test Table' } });
      if (!table) {
        table = await prisma.table.create({
          data: {
            name: 'Test Table',
            maxPlayers: 6,
            smallBlind: 5,
            bigBlind: 10,
            minBuyIn: 100,
            maxBuyIn: 1000
          }
        });
      }
      
      const game = await prisma.game.create({
        data: {
          id: gameId,
          tableId: table.id,
          status: 'COMPLETED',
          pot: 0
        }
      });
      
      // Generate and create revealed card order
      const { seed, cardOrder, hash } = cardOrderService.generateCardOrder(gameId);
      
      const cardOrderRecord = await prisma.cardOrder.create({
        data: {
          gameId,
          cardOrder: JSON.stringify(cardOrder),
          seed,
          hash,
          isRevealed: true
        }
      });
      
      createdOrders.push({
        id: cardOrderRecord.id,
        gameId: cardOrderRecord.gameId,
        hash: cardOrderRecord.hash,
        isRevealed: cardOrderRecord.isRevealed
      });
    }
    
    res.json({
      success: true,
      data: createdOrders
    });
  } catch (error) {
    console.error('Error creating revealed card orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create revealed card orders'
    });
  }
});

router.post('/create-completed-game', async (req, res) => {
  try {
    const { gameId, isRevealed = true, testData = true } = req.body;
    
    // Create a test completed game
    let game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      game = await prisma.game.create({
        data: {
          id: gameId,
          tableId: 'test-table-1',
          status: 'completed',
          pot: 150,
          board: JSON.stringify(['AH', 'KS', 'QD', 'JC', 'TC'])
        }
      });
    }
    
    // Create card order
    const cardOrder = await prisma.cardOrder.create({
      data: {
        gameId,
        seed: 'test-seed-' + Date.now(),
        cardOrder: JSON.stringify(['AH', 'KS', 'QD', 'JC', 'TC']), // Mock card order
        hash: 'test-hash-' + gameId,
        isRevealed
      }
    });
    
    res.json({ success: true, game, cardOrder });
  } catch (error) {
    console.error('Error creating completed game:', error);
    res.status(500).json({ success: false, error: 'Failed to create completed game' });
  }
});

router.post('/generate-deterministic-deck', async (req, res) => {
  try {
    const { seed, gameId } = req.body;
    
    if (!seed || !gameId) {
      return res.status(400).json({
        success: false,
        error: 'Seed and gameId are required'
      });
    }
    
    // Generate deterministic card order using provided seed
    const { cardOrder, hash } = cardOrderService.generateCardOrder(gameId);
    
    res.json({
      success: true,
      data: {
        gameId,
        seed: seed, // Use the provided seed for consistency with test
        cardOrder,
        hash,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating deterministic deck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate deterministic deck'
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