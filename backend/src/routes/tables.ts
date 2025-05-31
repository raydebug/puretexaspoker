import express from 'express';
import { prisma } from '../db';

const router = express.Router();

// Create a new table
router.post('/', async (req, res) => {
  try {
    const { name, maxPlayers, smallBlind, bigBlind, minBuyIn, maxBuyIn } = req.body;

    const table = await prisma.table.create({
      data: {
        name: name || 'Default Table',
        maxPlayers: maxPlayers || 9,
        smallBlind: smallBlind || 10,
        bigBlind: bigBlind || 20,
        minBuyIn: minBuyIn || 100,
        maxBuyIn: maxBuyIn || 1000
      }
    });

    res.status(200).json(table);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Get all tables
router.get('/', async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      include: {
        playerTables: true,
        games: {
          where: {
            status: 'active'
          },
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    res.status(200).json(tables);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ error: 'Failed to get tables' });
  }
});

// Join a table
router.post('/:tableId/join', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { playerId, buyIn } = req.body;

    // Check if table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        playerTables: true
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check if table is full
    if (table.playerTables.length >= table.maxPlayers) {
      return res.status(400).json({ error: 'Table is full' });
    }

    // Use default buyIn if not provided
    const actualBuyIn = buyIn || table.minBuyIn;

    // Check if buy-in amount is valid
    if (actualBuyIn < table.minBuyIn || actualBuyIn > table.maxBuyIn) {
      return res.status(400).json({ error: 'Invalid buy-in amount' });
    }

    // Find next available seat
    const occupiedSeats = table.playerTables.map(pt => pt.seatNumber);
    let seatNumber = 0;
    while (occupiedSeats.includes(seatNumber)) {
      seatNumber++;
    }

    // Join table
    const playerTable = await prisma.playerTable.create({
      data: {
        playerId,
        tableId,
        seatNumber,
        buyIn: actualBuyIn
      }
    });

    res.status(200).json({ ...playerTable, gameId: `game-${tableId}` });
  } catch (error) {
    console.error('Error joining table:', error);
    res.status(500).json({ error: 'Failed to join table' });
  }
});

// Get specific table
router.get('/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        playerTables: {
          include: {
            player: true
          }
        },
        games: {
          where: {
            status: 'active'
          },
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Add currentGameId to response
    const currentGameId = table.games.length > 0 ? table.games[0].id : `game-${tableId}`;
    
    res.status(200).json({
      ...table,
      currentGameId,
      players: table.playerTables.length,
      status: table.games.length > 0 ? 'active' : 'waiting'
    });
  } catch (error) {
    console.error('Error getting table:', error);
    res.status(500).json({ error: 'Failed to get table' });
  }
});

// Spectate a table
router.post('/:tableId/spectate', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { playerId } = req.body;

    // Check if table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // For now, just return success - in a real implementation you'd track spectators
    res.status(200).json({ 
      success: true, 
      message: `Player ${playerId} is now spectating table ${tableId}` 
    });
  } catch (error) {
    console.error('Error spectating table:', error);
    res.status(500).json({ error: 'Failed to spectate table' });
  }
});

export default router; 