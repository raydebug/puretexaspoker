import express from 'express';
import { GameManager } from '../services/gameManager';
import { tableManager } from '../services/TableManager';

const router = express.Router();

// Test-only API endpoints with test_ prefix
// These APIs are only for testing purposes and should not be used in production

/**
 * TEST API: Create a mock game with predefined players
 * POST /api/test_create_mock_game
 */
router.post('/test_create_mock_game', async (req, res) => {
  try {
    const { gameId, players, gameConfig } = req.body;
    
    console.log(`🧪 TEST API: Creating mock game ${gameId} with ${players.length} players`);
    
    // Create mock game state
    const mockGameState = {
      id: gameId || 'test-game-1',
      players: players.map((player: any) => ({
        id: player.id || `test-player-${player.seatNumber}`,
        name: player.nickname,
        seatNumber: player.seatNumber,
        position: player.seatNumber,
        chips: player.chips,
        currentBet: 0,
        isDealer: player.seatNumber === (gameConfig?.dealerPosition || 1),
        isAway: false,
        isActive: true,
        cards: [],
        avatar: {
          type: 'default',
          color: '#007bff'
        }
      })),
      communityCards: [],
      pot: 0,
      currentPlayerId: null,
      currentPlayerPosition: 0,
      dealerPosition: gameConfig?.dealerPosition || 1,
      smallBlindPosition: gameConfig?.smallBlindPosition || 3,
      bigBlindPosition: gameConfig?.bigBlindPosition || 5,
      status: 'waiting',
      phase: 'waiting',
      minBet: gameConfig?.minBet || 10,
      currentBet: 0,
      smallBlind: gameConfig?.smallBlind || 5,
      bigBlind: gameConfig?.bigBlind || 10,
      handEvaluation: undefined,
      winner: undefined,
      isHandComplete: false
    };
    
    // Store in GameManager for testing
    const gameManager = GameManager.getInstance();
    (gameManager as any).testGames = (gameManager as any).testGames || new Map();
    (gameManager as any).testGames.set(gameId, mockGameState);
    
    console.log(`✅ TEST API: Mock game ${gameId} created successfully`);
    
    res.json({
      success: true,
      gameId,
      gameState: mockGameState,
      message: 'Mock game created for testing'
    });
  } catch (error) {
    console.error('❌ TEST API: Error creating mock game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create mock game'
    });
  }
});

/**
 * TEST API: Get mock game state
 * GET /api/test_get_mock_game/:gameId
 */
router.get('/test_get_mock_game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    console.log(`🧪 TEST API: Retrieved mock game ${gameId}`);
    
    res.json({
      success: true,
      gameState
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting mock game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mock game'
    });
  }
});

/**
 * TEST API: Update mock game state
 * PUT /api/test_update_mock_game/:gameId
 */
router.put('/test_update_mock_game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { updates } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Apply updates to game state
    Object.assign(gameState, updates);
    
    console.log(`🧪 TEST API: Updated mock game ${gameId}:`, updates);
    
    res.json({
      success: true,
      gameState,
      message: 'Mock game updated'
    });
  } catch (error) {
    console.error('❌ TEST API: Error updating mock game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mock game'
    });
  }
});

/**
 * TEST API: Simulate player action in mock game
 * POST /api/test_player_action/:gameId
 */
router.post('/test_player_action/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, action, amount } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    const player = gameState.players.find((p: any) => p.id === playerId || p.name === playerId);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found in mock game'
      });
    }
    
    // Simulate player action
    switch (action) {
      case 'call':
        const callAmount = gameState.currentBet - player.currentBet;
        player.currentBet = gameState.currentBet;
        player.chips -= callAmount;
        gameState.pot += callAmount;
        break;
        
      case 'raise':
        const raiseAmount = amount - player.currentBet;
        player.currentBet = amount;
        player.chips -= raiseAmount;
        gameState.pot += raiseAmount;
        gameState.currentBet = amount;
        break;
        
      case 'fold':
        player.isActive = false;
        break;
        
      case 'check':
        // No chips change for check
        break;
        
      case 'bet':
        player.currentBet = amount;
        player.chips -= amount;
        gameState.pot += amount;
        gameState.currentBet = amount;
        break;
    }
    
    console.log(`🧪 TEST API: Player ${playerId} performed ${action} in game ${gameId}`);
    
    res.json({
      success: true,
      gameState,
      action: {
        playerId,
        action,
        amount
      }
    });
  } catch (error) {
    console.error('❌ TEST API: Error simulating player action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate player action'
    });
  }
});

/**
 * TEST API: Advance game phase (preflop -> flop -> turn -> river -> showdown)
 * POST /api/test_advance_phase/:gameId
 */
router.post('/test_advance_phase/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { targetPhase, communityCards } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Update game phase
    gameState.phase = targetPhase;
    
    // Add community cards if provided
    if (communityCards) {
      gameState.communityCards = communityCards;
    }
    
    // Reset current bets for new betting round (except preflop)
    if (targetPhase !== 'preflop') {
      gameState.players.forEach((player: any) => {
        player.currentBet = 0;
      });
      gameState.currentBet = 0;
    }
    
    console.log(`🧪 TEST API: Advanced game ${gameId} to phase ${targetPhase}`);
    
    res.json({
      success: true,
      gameState,
      phase: targetPhase
    });
  } catch (error) {
    console.error('❌ TEST API: Error advancing game phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to advance game phase'
    });
  }
});

/**
 * TEST API: Clean up all test games
 * DELETE /api/test_cleanup_games
 */
router.delete('/test_cleanup_games', async (req, res) => {
  try {
    const gameManager = GameManager.getInstance();
    (gameManager as any).testGames = new Map();
    
    console.log('🧪 TEST API: All test games cleaned up');
    
    res.json({
      success: true,
      message: 'All test games cleaned up'
    });
  } catch (error) {
    console.error('❌ TEST API: Error cleaning up test games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up test games'
    });
  }
});

export default router; 