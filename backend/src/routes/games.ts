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

    const gameState = gameManager.getGameState(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ error: 'Failed to get game state' });
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
    res.status(500).json({ error: (error as Error).message || 'Failed to deal cards' });
  }
});

export default router; 