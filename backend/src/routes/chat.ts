import express from 'express';
import { prisma } from '../db';

const router = express.Router();

// Send a chat message
router.post('/messages', async (req, res) => {
  try {
    const { playerId, content } = req.body;

    const message = await prisma.message.create({
      data: {
        playerId,
        content
      },
      include: {
        player: true
      }
    });

    res.status(200).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get chat history
router.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      include: {
        player: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

export default router; 