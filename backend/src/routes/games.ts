import express from 'express';
import { prisma } from '../db';

const router = express.Router();

// Start a new game
router.post('/', async (req, res) => {
  try {
    const { tableId } = req.body;

    // Check if there's already an active game
    const activeGame = await prisma.game.findFirst({
      where: {
        tableId,
        status: 'active'
      }
    });

    if (activeGame) {
      return res.status(400).json({ error: 'Table already has an active game' });
    }

    // Create new game
    const game = await prisma.game.create({
      data: {
        tableId,
        status: 'active',
        pot: 0
      }
    });

    res.status(200).json(game);
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Place a bet
router.post('/:gameId/bet', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, amount } = req.body;

    // Check if game exists and is active
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game || game.status !== 'active') {
      return res.status(404).json({ error: 'Game not found or not active' });
    }

    // Record the bet action
    const action = await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: 'bet',
        amount
      }
    });

    // Update game pot
    await prisma.game.update({
      where: { id: gameId },
      data: {
        pot: game.pot + amount
      }
    });

    res.status(200).json(action);
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// Fold
router.post('/:gameId/fold', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    // Check if game exists and is active
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game || game.status !== 'active') {
      return res.status(404).json({ error: 'Game not found or not active' });
    }

    // Record the fold action
    const action = await prisma.gameAction.create({
      data: {
        gameId,
        playerId,
        type: 'fold'
      }
    });

    res.status(200).json(action);
  } catch (error) {
    console.error('Error folding:', error);
    res.status(500).json({ error: 'Failed to fold' });
  }
});

// Deal cards
router.post('/:gameId/deal', async (req, res) => {
  try {
    const { gameId } = req.params;

    // Check if game exists and is active
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game || game.status !== 'active') {
      return res.status(404).json({ error: 'Game not found or not active' });
    }

    // Generate a deck of cards (simplified for example)
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const shuffledDeck = deck.sort(() => Math.random() - 0.5);

    // Update game with deck
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        deck: JSON.stringify(shuffledDeck)
      }
    });

    res.status(200).json(updatedGame);
  } catch (error) {
    console.error('Error dealing cards:', error);
    res.status(500).json({ error: 'Failed to deal cards' });
  }
});

export default router; 