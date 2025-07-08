import express from 'express';
import { prisma } from '../db';
import { tableManager } from '../services/TableManager';
import { locationManager } from '../services/LocationManager';

const router = express.Router();

// Get all tables (only the default 3 tables)
router.get('/', async (req, res) => {
  try {
    // Use TableManager to get the default tables
    const tables = tableManager.getAllTables();
    console.log('API: Returning', tables.length, 'tables from TableManager');
    res.status(200).json(tables);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ error: 'Failed to get tables' });
  }
});

// Join a table (only works with default tables 1, 2, 3)
router.post('/:tableId/join', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { playerId, buyIn } = req.body;

    // Only allow joining default tables (1, 2, 3)
    const tableNumber = parseInt(tableId);
    if (tableNumber < 1 || tableNumber > 3) {
      return res.status(400).json({ error: 'Only tables 1, 2, and 3 are available' });
    }

    // Check if table exists in TableManager
    const table = tableManager.getTable(tableNumber);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check if table is full
    const tablePlayers = tableManager.getTablePlayers(tableNumber);
    const seatedPlayers = tablePlayers.filter(p => p.role === 'player');
    if (seatedPlayers.length >= table.maxPlayers) {
      return res.status(400).json({ error: 'Table is full' });
    }

    // Use default buyIn if not provided
    const actualBuyIn = buyIn || table.minBuyIn;

    // Check if buy-in amount is valid
    if (actualBuyIn < table.minBuyIn || actualBuyIn > table.maxBuyIn) {
      return res.status(400).json({ error: 'Invalid buy-in amount' });
    }

    // Join table using TableManager
    const result = tableManager.joinTable(tableNumber, playerId, 'Player');
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ 
      success: true, 
      tableId: tableNumber,
      gameId: tableNumber.toString() // Use table ID as game ID
    });
  } catch (error) {
    console.error('Error joining table:', error);
    res.status(500).json({ error: 'Failed to join table' });
  }
});

// **NEW**: Get detailed monitoring information for all tables
router.get('/monitor', async (req, res) => {
  try {
    const tables = tableManager.getAllTables();
    const tableDetails = [];

    for (const table of tables) {
      // Get observers and players for this table
      const observers = locationManager.getObserversAtTable(table.id);
      const players = locationManager.getPlayersAtTable(table.id);

      // Format observer and player data
      const observersList = observers.map(o => ({
        playerId: o.playerId,
        nickname: o.nickname,
        updatedAt: o.updatedAt
      }));

      const playersList = players.map(p => ({
        playerId: p.playerId,
        nickname: p.nickname,
        seat: p.seat,
        updatedAt: p.updatedAt
      }));

      tableDetails.push({
        // Table basic info
        id: table.id,
        name: table.name,
        gameType: table.gameType,
        stakes: table.stakes,
        maxPlayers: table.maxPlayers,
        minBuyIn: table.minBuyIn,
        maxBuyIn: table.maxBuyIn,
        // Current users
        observers: observersList,
        players: playersList,
        observersCount: observers.length,
        playersCount: players.length,
        totalUsers: observers.length + players.length,
        // Metadata
        lastUpdated: new Date(),
        // Validation flags
        hasValidCounts: (observers.length + players.length) >= 0,
        hasOverlaps: observersList.some(o => playersList.some(p => p.nickname === o.nickname)),
        hasDuplicateObservers: new Set(observersList.map(o => o.nickname)).size !== observersList.length,
        hasDuplicatePlayers: new Set(playersList.map(p => p.nickname)).size !== playersList.length
      });
    }

    res.status(200).json(tableDetails);
  } catch (error) {
    console.error('Error getting table monitor info:', error);
    res.status(500).json({ error: 'Failed to get table monitor info' });
  }
});

// Get specific table (only default tables 1, 2, 3)
router.get('/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const tableNumber = parseInt(tableId);

    // Only allow access to default tables (1, 2, 3)
    if (tableNumber < 1 || tableNumber > 3) {
      return res.status(400).json({ error: 'Only tables 1, 2, and 3 are available' });
    }

    const table = tableManager.getTable(tableNumber);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Add currentGameId to response (using table ID as game ID)
    const currentGameId = tableNumber.toString();
    
    res.status(200).json({
      ...table,
      currentGameId
    });
  } catch (error) {
    console.error('Error getting table:', error);
    res.status(500).json({ error: 'Failed to get table' });
  }
});

// Spectate a table (only default tables 1, 2, 3)
router.post('/:tableId/spectate', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { playerId } = req.body;

    const tableNumber = parseInt(tableId);
    if (tableNumber < 1 || tableNumber > 3) {
      return res.status(400).json({ error: 'Only tables 1, 2, and 3 are available' });
    }

    // Check if table exists in TableManager
    const table = tableManager.getTable(tableNumber);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Join as observer using TableManager
    const result = tableManager.joinTable(tableNumber, playerId, 'Observer');
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ 
      success: true, 
      tableId: tableNumber,
      message: 'Successfully joined as spectator'
    });
  } catch (error) {
    console.error('Error spectating table:', error);
    res.status(500).json({ error: 'Failed to spectate table' });
  }
});

// Get action history for a table
router.get('/:tableId/actions/history', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { handNumber } = req.query;
    const tableNumber = parseInt(tableId);

    // Only allow access to default tables (1, 2, 3)
    if (tableNumber < 1 || tableNumber > 3) {
      return res.status(400).json({ error: 'Only tables 1, 2, and 3 are available' });
    }

    // For now, return empty action history to avoid Prisma client issues
    // TODO: Fix Prisma client and implement proper action history
    console.log(`📊 Table ${tableNumber} action history: returning empty list for now`);

    res.status(200).json({
      success: true,
      actionHistory: [],
      tableId: tableNumber,
      handNumber: handNumber ? parseInt(handNumber as string) : null
    });
  } catch (error) {
    console.error('Error getting table action history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get table action history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 