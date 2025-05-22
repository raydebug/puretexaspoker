import express from 'express';
import { prisma } from '../db';

const router = express.Router();

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