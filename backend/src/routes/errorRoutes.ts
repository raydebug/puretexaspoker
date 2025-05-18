import express from 'express';
import { errorTrackingService } from '../services/errorTrackingService';

const router = express.Router();

// Log a new error
router.post('/errors', (req, res) => {
  try {
    const error = errorTrackingService.trackError(req.body);
    res.json({ success: true, error });
  } catch (e) {
    console.error('Failed to track error:', e);
    res.status(500).json({ success: false, message: 'Failed to track error' });
  }
});

// Get recent errors (protected route)
router.get('/errors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const errors = errorTrackingService.getRecentErrors(limit);
    res.json({ success: true, errors });
  } catch (e) {
    console.error('Failed to get errors:', e);
    res.status(500).json({ success: false, message: 'Failed to get errors' });
  }
});

// Clear old logs (protected route)
router.delete('/errors', (req, res) => {
  try {
    const maxAge = parseInt(req.query.maxAge as string) || 30;
    errorTrackingService.clearOldLogs(maxAge);
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to clear old logs:', e);
    res.status(500).json({ success: false, message: 'Failed to clear old logs' });
  }
});

export default router; 