import express from 'express';
import { clearDatabase } from '../services/testService';

const router = express.Router();

// Basic connection check for tests
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
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

export default router; 