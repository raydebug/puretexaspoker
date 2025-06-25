import express from 'express';
import { prisma } from '../db';
import { gameManager } from '../services/gameManager';

const router = express.Router();

// Create a new game for a table
router.post('/', async (req, res) => {
  try {
    const { tableId } = req.body;

    if (!tableId) {
      return res.status(400).json({ error: 'Table ID is required' });
    }

    const gameState = await gameManager.createGame(tableId);
    res.status(201).json(gameState);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to create game' });
  }
});

// Start an existing game (deals cards, posts blinds)
router.post('/:gameId/start', async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameState = await gameManager.startGame(gameId);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to start game' });
  }
});

// Get current game state
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Get game from gameManager
    const game = gameManager.getGame(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = game.getGameState();
    return res.json(gameState);
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get seat information for a game
router.get('/:gameId/seats', async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const seats = game.getAllSeats();
    res.status(200).json({ seats });
  } catch (error) {
    console.error('Error getting seat info:', error);
    res.status(500).json({ error: 'Failed to get seat information' });
  }
});

// Reserve a seat in a game
router.post('/:gameId/seats/:seatNumber/reserve', async (req, res) => {
  try {
    const { gameId, seatNumber } = req.params;
    const { playerId, durationMinutes } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const result = game.getSeatManager().reserveSeat(
      parseInt(seatNumber),
      playerId,
      durationMinutes || 5
    );

    if (result.success) {
      res.status(200).json({ message: 'Seat reserved successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error reserving seat:', error);
    res.status(500).json({ error: 'Failed to reserve seat' });
  }
});

// Get turn order for a game
router.get('/:gameId/turn-order', async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = game.getGameState();
    const turnOrder = game.getSeatManager().calculateTurnOrder(gameState.players);
    
    res.status(200).json({
      turnOrder,
      currentPlayerId: gameState.currentPlayerId,
      dealerPosition: gameState.dealerPosition
    });
  } catch (error) {
    console.error('Error getting turn order:', error);
    res.status(500).json({ error: 'Failed to get turn order' });
  }
});

// Place a bet
router.post('/:gameId/bet', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, amount } = req.body;

    if (!playerId || amount === undefined) {
      return res.status(400).json({ error: 'Player ID and amount are required' });
    }

    const gameState = await gameManager.placeBet(gameId, playerId, amount);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to place bet' });
  }
});

// Call
router.post('/:gameId/call', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const gameState = await gameManager.call(gameId, playerId);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error calling:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to call' });
  }
});

// Check
router.post('/:gameId/check', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const gameState = await gameManager.check(gameId, playerId);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error checking:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to check' });
  }
});

// Fold
router.post('/:gameId/fold', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const gameState = await gameManager.fold(gameId, playerId);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error folding:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to fold' });
  }
});

// Deal community cards (progress to next phase)
router.post('/:gameId/deal', async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameState = await gameManager.dealCommunityCards(gameId);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error dealing community cards:', error);
    res.status(400).json({ error: (error as Error).message || 'Failed to deal cards' });
  }
});

// Raise (specific total amount)
router.post('/:gameId/raise', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, totalAmount } = req.body;

    if (!playerId || typeof totalAmount !== 'number') {
      return res.status(400).json({ error: 'Player ID and total amount are required' });
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Raise amount must be positive' });
    }

    const gameState = await gameManager.raise(gameId, playerId, totalAmount);
    res.json(gameState);
  } catch (error) {
    console.error('Error raising:', error);
    res.status(400).json({ error: (error as Error).message || 'Failed to raise' });
  }
});

// All-in
router.post('/:gameId/allIn', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const gameState = await gameManager.allIn(gameId, playerId);
    res.json(gameState);
  } catch (error) {
    console.error('Error going all-in:', error);
    res.status(400).json({ error: (error as Error).message || 'Failed to go all-in' });
  }
});

// Get phase information
router.get('/:gameId/phase', async (req, res) => {
  try {
    const { gameId } = req.params;

    const phaseInfo = await gameManager.getPhaseInfo(gameId);
    res.status(200).json(phaseInfo);
  } catch (error) {
    console.error('Error getting phase info:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to get phase info' });
  }
});

// Start a new hand (after current hand is complete)
router.post('/:gameId/new-hand', async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameState = await gameManager.startNewHand(gameId);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error starting new hand:', error);
    res.status(400).json({ error: (error as Error).message || 'Failed to start new hand' });
  }
});

// Force complete current phase (admin/testing feature)
router.post('/:gameId/force-complete-phase', async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameState = await gameManager.forceCompletePhase(gameId);
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error force completing phase:', error);
    res.status(400).json({ error: (error as Error).message || 'Failed to complete phase' });
  }
});

// Handle game actions
router.post('/:gameId/actions', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { type, amount, playerId } = req.body;

    if (!type || !playerId) {
      return res.status(400).json({ error: 'Missing required fields: type, playerId' });
    }

    // Check if game exists
    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Process the action
    let result;
    switch (type) {
      case 'bet':
        if (amount === undefined) {
          return res.status(400).json({ error: 'Amount required for bet action' });
        }
        result = await gameManager.placeBet(gameId, playerId, amount);
        break;
      case 'check':
        result = await gameManager.check(gameId, playerId);
        break;
      case 'fold':
        result = await gameManager.fold(gameId, playerId);
        break;
      case 'raise':
        if (amount === undefined) {
          return res.status(400).json({ error: 'Amount required for raise action' });
        }
        result = await gameManager.raise(gameId, playerId, amount);
        break;
      case 'allIn':
        result = await gameManager.allIn(gameId, playerId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action type' });
    }

    res.json({
      type,
      amount,
      playerId,
      success: true,
      gameState: game.getGameState()
    });
  } catch (error) {
    console.error('Error processing game action:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get action history for a game
router.get('/:gameId/actions/history', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { handNumber } = req.query;

    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Import gamePersistenceManager
    const { GamePersistenceManager } = await import('../services/gamePersistenceManager');
    const gamePersistenceManager = GamePersistenceManager.getInstance();

    // Get action history using the existing service
    const actionHistory = await gamePersistenceManager.getActionHistory(
      gameId, 
      handNumber ? parseInt(handNumber as string) : undefined
    );

    // Format the response for frontend consumption
    const formattedHistory = actionHistory.map(action => ({
      id: action.id,
      playerId: action.playerId,
      playerName: action.playerName,
      action: action.action,
      amount: action.amount,
      phase: action.phase,
      handNumber: action.handNumber,
      actionSequence: action.actionSequence,
      timestamp: action.timestamp
    }));

    res.json({
      success: true,
      gameId,
      actionHistory: formattedHistory,
      count: formattedHistory.length
    });

  } catch (error) {
    console.error('Error getting action history:', error);
    res.status(500).json({ error: 'Failed to get action history' });
  }
});

export default router; 