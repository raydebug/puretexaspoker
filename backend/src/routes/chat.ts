import express from 'express';
import { prisma } from '../db';

const router = express.Router();

// In-memory chat storage for performance testing
let chatMessages: Array<{
  id: string;
  content: string;
  playerId: string;
  timestamp: number;
}> = [];

// Create a new chat message
router.post('/messages', async (req, res) => {
  try {
    const { content, playerId } = req.body;

    if (!content || !playerId) {
      return res.status(400).json({ error: 'Content and playerId are required' });
    }

    const message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content,
      playerId,
      timestamp: Date.now()
    };

    // Store in memory for performance test
    chatMessages.push(message);

    // Keep only last 1000 messages to prevent memory issues
    if (chatMessages.length > 1000) {
      chatMessages = chatMessages.slice(-1000);
    }

    res.status(200).json(message);
  } catch (error) {
    console.error('Error creating chat message:', error);
    res.status(500).json({ error: 'Failed to create chat message' });
  }
});

// Get chat messages
router.get('/messages', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const start = Math.max(0, chatMessages.length - parseInt(limit as string) - parseInt(offset as string));
    const end = Math.max(0, chatMessages.length - parseInt(offset as string));
    
    const messages = chatMessages.slice(start, end);
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ error: 'Failed to get chat messages' });
  }
});

export default router; 