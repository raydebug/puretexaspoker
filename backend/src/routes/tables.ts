import express from 'express';
import { prisma } from '../db';

const router = express.Router();

// Create a new table
router.post('/', async (req, res) => {
  try {
    const { name, maxPlayers, smallBlind, bigBlind, minBuyIn, maxBuyIn } = req.body;

    const table = await prisma.table.create({
      data: {
        name,
        maxPlayers,
        smallBlind,
        bigBlind,
        minBuyIn,
        maxBuyIn
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

    // Check if buy-in amount is valid
    if (buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
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
        buyIn
      }
    });

    res.status(200).json(playerTable);
  } catch (error) {
    console.error('Error joining table:', error);
    res.status(500).json({ error: 'Failed to join table' });
  }
});

export default router; 