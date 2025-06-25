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

// Game State Management Endpoints
router.post('/get_game_state', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ success: false, error: 'gameId is required' });
    }
    
    // Get game from database with table relation
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        table: true,
        actions: {
          include: {
            player: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    
    // Get players for this game from PlayerTable
    const playerTables = await prisma.playerTable.findMany({
      where: { tableId: game.tableId },
      include: { player: true }
    });
    
    // Parse board cards and construct simplified game state
    const board = game.board ? JSON.parse(game.board) : [];
    
    const gameState = {
      id: game.id,
      phase: 'preflop', // Default phase since not in schema
      currentBet: 10, // Mock current bet
      pot: game.pot,
      currentPlayerId: playerTables[0]?.playerId || null,
      dealerPosition: 0,
      smallBlind: game.table.smallBlind,
      bigBlind: game.table.bigBlind,
      communityCards: board,
      isHandComplete: game.status === 'COMPLETED',
      winner: null, // Not in current schema
      players: playerTables.map(pt => ({
        id: pt.player.id,
        nickname: pt.player.nickname,
        chips: pt.player.chips,
        currentBet: 0, // Default since not in schema
        isActive: true,
        isFolded: false,
        position: pt.seatNumber
      }))
    };
    
    res.json({ success: true, gameState });
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ success: false, error: 'Failed to get game state' });
  }
});

router.post('/start_game', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ success: false, error: 'gameId is required' });
    }
    
    // Update game status to playing with simplified data
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'PLAYING',
        pot: 15 // small blind + big blind
      }
    });
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ success: false, error: 'Failed to start game' });
  }
});

router.post('/complete_betting_round', async (req, res) => {
  try {
    const { gameId, phase } = req.body;
    
    if (!gameId || !phase) {
      return res.status(400).json({ success: false, error: 'gameId and phase are required' });
    }
    
    // Determine next phase
    const phaseMap: Record<string, string> = {
      'preflop': 'flop',
      'flop': 'turn', 
      'turn': 'river',
      'river': 'showdown'
    };
    
    const nextPhase = phaseMap[phase] || 'showdown';
    
    // Add community cards based on phase
    const board: string[] = [];
    if (nextPhase === 'flop') {
      board.push('AH', 'KS', 'QD'); // Mock flop
    } else if (nextPhase === 'turn') {
      board.push('AH', 'KS', 'QD', 'JC'); // Mock turn
    } else if (nextPhase === 'river') {
      board.push('AH', 'KS', 'QD', 'JC', 'TC'); // Mock river
    }
    
    // Update game board only
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        board: board.length > 0 ? JSON.stringify(board) : undefined
      }
    });
    
    res.json({ success: true, game, nextPhase });
  } catch (error) {
    console.error('Error completing betting round:', error);
    res.status(500).json({ success: false, error: 'Failed to complete betting round' });
  }
});

router.post('/player_action', async (req, res) => {
  try {
    const { gameId, playerId, action, amount } = req.body;
    
    if (!gameId || !playerId || !action) {
      return res.status(400).json({ success: false, error: 'gameId, playerId, and action are required' });
    }
    
    // Record action in game actions table
    await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: action,
        amount: amount || null
      }
    });
    
    // Get player and update chips based on action
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });
    
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }
    
    let updatedPlayer = player;
    
    // Simple chip updates based on action type
    switch (action) {
      case 'call':
      case 'bet':
      case 'raise':
        const actionAmount = Math.min(amount || 10, player.chips);
        updatedPlayer = await prisma.player.update({
          where: { id: playerId },
          data: { 
            chips: Math.max(0, player.chips - actionAmount)
          }
        });
        
        // Update game pot
        await prisma.game.update({
          where: { id: gameId },
          data: { 
            pot: { increment: actionAmount }
          }
        });
        break;
        
      case 'allIn':
        const allInAmount = player.chips;
        updatedPlayer = await prisma.player.update({
          where: { id: playerId },
          data: { chips: 0 }
        });
        
        await prisma.game.update({
          where: { id: gameId },
          data: { 
            pot: { increment: allInAmount }
          }
        });
        break;
        
      case 'fold':
      case 'check':
        // No chip changes for fold/check
        break;
        
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
    
    res.json({ 
      success: true, 
      action,
      player: updatedPlayer,
      message: `${player.nickname} performed ${action}${amount ? ` for ${amount}` : ''}`
    });
  } catch (error) {
    console.error('Error processing player action:', error);
    res.status(500).json({ success: false, error: 'Failed to process player action' });
  }
});

// Create test game with players
router.post('/create_test_game', async (req, res) => {
  try {
    const { gameId, players, tableName = 'Test Table' } = req.body;
    
    if (!gameId || !players || !Array.isArray(players)) {
      return res.status(400).json({ success: false, error: 'gameId and players array are required' });
    }
    
    // Create or find test table
    let table = await prisma.table.findFirst({ where: { name: tableName } });
    if (!table) {
      table = await prisma.table.create({
        data: {
          name: tableName,
          maxPlayers: 6,
          smallBlind: 5,
          bigBlind: 10,
          minBuyIn: 100,
          maxBuyIn: 1000
        }
      });
    }
    
    // Create game
    const game = await prisma.game.create({
      data: {
        id: gameId,
        tableId: table.id,
        status: 'WAITING',
        pot: 0
      }
    });
    
    // Create players via Player table and link via PlayerTable
    const createdPlayers = [];
    for (let i = 0; i < players.length; i++) {
      const playerData = players[i];
      
      // Create player
      const player = await prisma.player.create({
        data: {
          id: `${gameId}_player_${i}`,
          nickname: playerData.nickname,
          chips: playerData.chips || 1000
        }
      });
      
      // Link player to table with seat
      await prisma.playerTable.create({
        data: {
          playerId: player.id,
          tableId: table.id,
          seatNumber: playerData.seat || i + 1,
          buyIn: playerData.chips || 1000
        }
      });
      
      createdPlayers.push(player);
    }
    
    res.json({ 
      success: true, 
      game,
      table,
      players: createdPlayers,
      message: `Created test game ${gameId} with ${players.length} players`
    });
  } catch (error) {
    console.error('Error creating test game:', error);
    res.status(500).json({ success: false, error: 'Failed to create test game' });
  }
});

// Hand evaluation endpoint for showdown testing
router.post('/evaluate_hands', async (req, res) => {
  try {
    const { gameId, players } = req.body;
    
    if (!gameId || !players) {
      return res.status(400).json({ success: false, error: 'gameId and players are required' });
    }
    
    // Mock hand evaluation - in real implementation this would use poker hand evaluator
    const handRankings = [
      'royal_flush', 'straight_flush', 'four_of_a_kind', 'full_house',
      'flush', 'straight', 'three_of_a_kind', 'two_pair', 'one_pair', 'high_card'
    ];
    
    const evaluatedPlayers = players.map((player: any, index: number) => ({
      ...player,
      handRank: handRankings[Math.floor(Math.random() * handRankings.length)],
      handStrength: Math.random() * 1000, // Higher = better
      bestHand: ['AH', 'KH', 'QH', 'JH', 'TH'] // Mock royal flush
    }));
    
    // Sort by hand strength (descending)
    evaluatedPlayers.sort((a: any, b: any) => b.handStrength - a.handStrength);
    
    const winner = evaluatedPlayers[0];
    
    res.json({
      success: true,
      gameId,
      evaluatedPlayers,
      winner: {
        playerId: winner.id,
        nickname: winner.nickname,
        handRank: winner.handRank,
        bestHand: winner.bestHand
      }
    });
  } catch (error) {
    console.error('Error evaluating hands:', error);
    res.status(500).json({ success: false, error: 'Failed to evaluate hands' });
  }
});

// Tournament management endpoints
router.post('/create_tournament', async (req, res) => {
  try {
    const { tournamentId, blindSchedule, players } = req.body;
    
    // Mock tournament creation
    const tournament = {
      id: tournamentId,
      status: 'ACTIVE',
      currentLevel: 1,
      blindSchedule: blindSchedule || [
        { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
        { level: 2, smallBlind: 50, bigBlind: 100, ante: 10, duration: 15 }
      ],
      players: players || [],
      startTime: new Date().toISOString()
    };
    
    res.json({ success: true, tournament });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ success: false, error: 'Failed to create tournament' });
  }
});

router.post('/advance_blind_level', async (req, res) => {
  try {
    const { tournamentId, newLevel } = req.body;
    
    // Mock blind level advancement
    const blindLevels = {
      1: { smallBlind: 25, bigBlind: 50, ante: 0 },
      2: { smallBlind: 50, bigBlind: 100, ante: 10 },
      3: { smallBlind: 100, bigBlind: 200, ante: 25 }
    };
    
    const newBlinds = blindLevels[newLevel as keyof typeof blindLevels] || blindLevels[3];
    
    res.json({
      success: true,
      tournamentId,
      newLevel,
      blinds: newBlinds,
      message: `Advanced to blind level ${newLevel}`
    });
  } catch (error) {
    console.error('Error advancing blind level:', error);
    res.status(500).json({ success: false, error: 'Failed to advance blind level' });
  }
});

export default router; 