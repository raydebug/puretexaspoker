import express from 'express';
import { prisma } from '../db';
import { tableManager } from '../services/TableManager';
import { locationManager } from '../services/LocationManager';
import { gameManager } from '../services/gameManager';

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

// **NEW**: Get detailed monitoring information for all tables
router.get('/monitor', async (req, res) => {
  try {
    const tables = tableManager.getAllTables();
    const tableDetails = [];

    for (const table of tables) {
      // Get observers and players for this table
      const observers = locationManager.getObserversAtTable(table.id);
      const players = locationManager.getPlayersAtTable(table.id);

      // Get game information if exists
      let gameInfo = null;
      try {
        // Find active game for this table
        const dbTable = await prisma.table.findFirst({
          where: { name: { contains: `(ID: ${table.id})` } },
          include: {
            games: {
              where: { status: { in: ['waiting', 'active'] } },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        if (dbTable && dbTable.games.length > 0) {
          const game = dbTable.games[0];
          const gameService = gameManager.getGame(game.id);
          
          if (gameService) {
            const gameState = gameService.getGameState();
                         gameInfo = {
               id: game.id,
               status: gameState.status,
               phase: gameState.phase,
               pot: gameState.pot,
               currentPlayerId: gameState.currentPlayerId,
               playersCount: gameState.players.length,
               communityCards: gameState.communityCards.length
             };
          }
        }
      } catch (gameError) {
        console.log(`No game found for table ${table.id}:`, gameError);
      }

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
        
        // Game state
        gameInfo,
        
        // Metadata
        lastUpdated: new Date(),
        
        // Validation flags
        hasValidCounts: (observers.length + players.length) >= 0,
        hasOverlaps: observersList.some(o => playersList.some(p => p.nickname === o.nickname)),
        hasDuplicateObservers: new Set(observersList.map(o => o.nickname)).size !== observersList.length,
        hasDuplicatePlayers: new Set(playersList.map(p => p.nickname)).size !== playersList.length
      });
    }

    // Sort by total users (most active first)
    tableDetails.sort((a, b) => b.totalUsers - a.totalUsers);

    res.json({
      success: true,
      timestamp: new Date(),
      tablesCount: tableDetails.length,
      tables: tableDetails,
      summary: {
        totalTables: tableDetails.length,
        activeTables: tableDetails.filter(t => t.totalUsers > 0).length,
        totalObservers: tableDetails.reduce((sum, t) => sum + t.observersCount, 0),
        totalPlayers: tableDetails.reduce((sum, t) => sum + t.playersCount, 0),
        totalUsers: tableDetails.reduce((sum, t) => sum + t.totalUsers, 0),
        tablesWithGames: tableDetails.filter(t => t.gameInfo !== null).length,
        tablesWithIssues: tableDetails.filter(t => t.hasOverlaps || t.hasDuplicateObservers || t.hasDuplicatePlayers).length
      }
    });
  } catch (error) {
    console.error('Error getting table monitoring data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get table monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific table - placed after /monitor to avoid route conflicts
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