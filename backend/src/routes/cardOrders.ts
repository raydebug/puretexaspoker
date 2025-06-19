import express from 'express';
import { PrismaClient } from '@prisma/client';
import { CardOrderService, CardOrderRecord } from '../services/cardOrderService';

const router = express.Router();
const prisma = new PrismaClient();
const cardOrderService = new CardOrderService();

// Get latest 10 card orders
router.get('/latest', async (req, res) => {
  try {
    const cardOrders = await prisma.cardOrder.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        game: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            table: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const formattedOrders = cardOrders.map(order => ({
      id: order.id,
      gameId: order.gameId,
      hash: order.hash,
      isRevealed: order.isRevealed,
      createdAt: order.createdAt,
      tableName: order.game.table.name,
      gameStatus: order.game.status,
      cardOrder: order.isRevealed ? JSON.parse(order.cardOrder) : null,
      seed: order.isRevealed ? order.seed : null
    }));

    res.status(200).json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching card orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch card orders'
    });
  }
});

// Get specific card order by game ID
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const cardOrder = await prisma.cardOrder.findUnique({
      where: { gameId },
      include: {
        game: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            table: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!cardOrder) {
      return res.status(404).json({
        success: false,
        error: 'Card order not found for this game'
      });
    }

    const response = {
      id: cardOrder.id,
      gameId: cardOrder.gameId,
      hash: cardOrder.hash,
      isRevealed: cardOrder.isRevealed,
      createdAt: cardOrder.createdAt,
      tableName: cardOrder.game.table.name,
      gameStatus: cardOrder.game.status,
      cardOrder: cardOrder.isRevealed ? JSON.parse(cardOrder.cardOrder) : null,
      seed: cardOrder.isRevealed ? cardOrder.seed : null
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching card order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch card order'
    });
  }
});

// Download card orders as CSV
router.get('/download', async (req, res) => {
  try {
    const cardOrders = await prisma.cardOrder.findMany({
      where: { isRevealed: true }, // Only revealed orders can be downloaded
      orderBy: { createdAt: 'desc' },
      include: {
        game: {
          select: {
            table: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const records: CardOrderRecord[] = cardOrders.map(order => ({
      id: order.id,
      gameId: order.gameId,
      seed: order.seed,
      cardOrder: JSON.parse(order.cardOrder),
      hash: order.hash,
      isRevealed: order.isRevealed,
      createdAt: order.createdAt
    }));

    const csvContent = cardOrderService.formatCardOrderForDownload(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="card-orders.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error downloading card orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download card orders'
    });
  }
});

// Verify card order hash
router.post('/verify', async (req, res) => {
  try {
    const { gameId, expectedHash } = req.body;

    if (!gameId || !expectedHash) {
      return res.status(400).json({
        success: false,
        error: 'Game ID and expected hash are required'
      });
    }

    const cardOrder = await prisma.cardOrder.findUnique({
      where: { gameId }
    });

    if (!cardOrder) {
      return res.status(404).json({
        success: false,
        error: 'Card order not found for this game'
      });
    }

    if (!cardOrder.isRevealed) {
      return res.status(400).json({
        success: false,
        error: 'Card order has not been revealed yet'
      });
    }

    const isValid = cardOrderService.verifyCardOrder(
      JSON.parse(cardOrder.cardOrder),
      cardOrder.seed,
      gameId,
      expectedHash
    );

    const actualHash = cardOrder.hash;
    const hashMatches = actualHash === expectedHash;

    res.status(200).json({
      success: true,
      data: {
        isValid,
        hashMatches,
        actualHash,
        expectedHash,
        gameId,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying card order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify card order'
    });
  }
});

// Reveal card order (called when game is complete)
router.post('/reveal/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const updatedCardOrder = await prisma.cardOrder.update({
      where: { gameId },
      data: { isRevealed: true }
    });

    res.status(200).json({
      success: true,
      data: {
        gameId,
        isRevealed: true,
        revealedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error revealing card order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reveal card order'
    });
  }
});

export default router; 