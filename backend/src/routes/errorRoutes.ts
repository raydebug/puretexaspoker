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
    const limitParam = req.query.limit as string;
    const limit = limitParam !== undefined ? parseInt(limitParam) : 100;
    const errors = errorTrackingService.getRecentErrors(isNaN(limit) ? 100 : limit);
    res.json({ success: true, errors });
  } catch (e) {
    console.error('Failed to get errors:', e);
    res.status(500).json({ success: false, message: 'Failed to get errors' });
  }
});

// Clear old logs (protected route)
router.delete('/errors', (req, res) => {
  try {
    const maxAgeParam = req.query.maxAge as string;
    const maxAge = maxAgeParam !== undefined ? parseInt(maxAgeParam) : 30;
    errorTrackingService.clearOldLogs(isNaN(maxAge) ? 30 : maxAge);
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to clear old logs:', e);
    res.status(500).json({ success: false, message: 'Failed to clear old logs' });
  }
});

export default router; 