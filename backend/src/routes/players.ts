import express from 'express';
import { prisma } from '../db';

const router = express.Router();

// Create a new player (for e2e tests)
router.post('/', async (req, res) => {
  try {
    const { nickname, chips } = req.body || {};

    // Validate nickname
    if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
      return res.status(400).json({ error: 'Nickname is required' });
    }

    // Validate chips if provided
    if (chips !== undefined && (typeof chips !== 'number' || chips < 0)) {
      return res.status(400).json({ error: 'Chips must be a positive number' });
    }

    // Check if player already exists
    const existingPlayer = await prisma.player.findUnique({
      where: { nickname: nickname.trim() }
    });

    if (existingPlayer) {
      return res.status(400).json({ error: 'Player with this nickname already exists' });
    }

    // Create new player
    const player = await prisma.player.create({
      data: {
        nickname: nickname.trim(),
        chips: chips || 1000
      }
    });

    res.status(201).json(player);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Register a new player
router.post('/register', async (req, res) => {
  try {
    const { nickname, chips } = req.body;

    // Check if player already exists
    const existingPlayer = await prisma.player.findUnique({
      where: { nickname }
    });

    if (existingPlayer) {
      return res.status(400).json({ error: 'Player with this nickname already exists' });
    }

    // Create new player
    const player = await prisma.player.create({
      data: {
        nickname,
        chips
      }
    });

    res.status(200).json(player);
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ error: 'Failed to register player' });
  }
});

export default router; 