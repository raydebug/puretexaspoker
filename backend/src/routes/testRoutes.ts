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
      smallBlindPosition: gameConfig?.smallBlindPosition || 2,
      bigBlindPosition: gameConfig?.bigBlindPosition || 3,
      status: 'active',
      phase: 'preflop',
      minBet: gameConfig?.minBet || 15,
      currentBet: 0, // Start with no current bet - first action will set it
      smallBlind: gameConfig?.smallBlind || 5,
      bigBlind: gameConfig?.bigBlind || 15,
      handEvaluation: undefined,
      winner: undefined,
      isHandComplete: false
    };
    
    // Store in GameManager for testing
    const gameManager = GameManager.getInstance();
    (gameManager as any).testGames = (gameManager as any).testGames || new Map();
    (gameManager as any).testGames.set(gameId, mockGameState);
    
    // CRITICAL FIX: Broadcast the game state to all connected clients in the game room
    // This makes the mock data visible to the frontend immediately
    const io = (global as any).socketIO;
    if (io) {
      console.log(`🔄 TEST API: Broadcasting mock game state to room game:${gameId}`);
      
      // Broadcast to all clients in the game room
      io.to(`game:${gameId}`).emit('gameState', mockGameState);
      
      // Also broadcast to all clients (for debugging/fallback)
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: mockGameState,
        message: 'Test game state created'
      });
      
      console.log(`📡 TEST API: Mock game state broadcasted to WebSocket clients`);
    } else {
      console.log(`⚠️ TEST API: Socket.IO instance not available for broadcasting`);
    }
    
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
    
    // CRITICAL FIX: Correct poker action logic
    console.log(`🔍 BEFORE ACTION: ${player.name} has ${player.chips} chips, currentBet: ${player.currentBet}, gameCurrentBet: ${gameState.currentBet}, pot: ${gameState.pot}`);
    
    switch (action) {
      case 'call':
        // Call means match the current bet
        let callAmount = Math.max(0, gameState.currentBet - player.currentBet);
        
        // Special case: if no current bet exists, call acts as minimum bet
        if (gameState.currentBet === 0) {
          console.log(`🔍 CALL DEBUG: minBet=${gameState.minBet}, bigBlind=${gameState.bigBlind}`);
          callAmount = gameState.minBet;
          gameState.currentBet = gameState.minBet;
          console.log(`🔍 CALL DEBUG: callAmount set to ${callAmount}, gameCurrentBet set to ${gameState.currentBet}`);
        }
        
        if (callAmount > 0) {
          player.chips -= callAmount;
          player.currentBet += callAmount;
          gameState.pot += callAmount;
        }
        break;
        
      case 'raise':
        // Raise means set current bet to new amount, pay the difference
        const totalRaiseAmount = amount;
        const additionalChips = totalRaiseAmount - player.currentBet;
        if (additionalChips > 0) {
          player.chips -= additionalChips;
          player.currentBet = totalRaiseAmount;
          gameState.pot += additionalChips;
          gameState.currentBet = totalRaiseAmount;
        }
        break;
        
      case 'fold':
        player.isActive = false;
        break;
        
      case 'check':
        // No chips change for check (only valid if no bet to call)
        break;
        
      case 'bet':
        // Bet means put chips in (usually first bet of a round)
        const betAmount = amount;
        if (betAmount > 0) {
          player.chips -= betAmount;
          player.currentBet = betAmount;
          gameState.pot += betAmount;
          gameState.currentBet = betAmount;
        }
        break;
    }
    
    // Force update the game state in the map
    (gameManager as any).testGames.set(gameId, gameState);
    
    console.log(`🔍 AFTER ACTION: ${player.name} has ${player.chips} chips, currentBet: ${player.currentBet}, gameCurrentBet: ${gameState.currentBet}, pot: ${gameState.pot}`);
    
    console.log(`🧪 TEST API: Player ${playerId} performed ${action} in game ${gameId}`);
    
    // CRITICAL FIX: Broadcast the updated game state to all connected clients
    const io = (global as any).socketIO;
    if (io) {
      console.log(`🔄 TEST API: Broadcasting updated game state after ${action} by ${playerId}`);
      
      // Broadcast to all clients in the game room
      io.to(`game:${gameId}`).emit('gameState', gameState);
      
      // Also broadcast test game state update
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: `Player ${playerId} performed ${action}${amount ? ` with amount ${amount}` : ''}`
      });
      
      console.log(`📡 TEST API: Updated game state broadcasted after player action`);
    } else {
      console.log(`⚠️ TEST API: Socket.IO instance not available for broadcasting`);
    }
    
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
 * TEST API: Deal flop (3 community cards)
 * POST /api/test_deal_flop
 */
router.post('/test_deal_flop', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Add 3 community cards for flop
    gameState.communityCards = [
      { rank: 'A', suit: '♠' },
      { rank: 'K', suit: '♥' },
      { rank: 'Q', suit: '♦' }
    ];
    gameState.phase = 'flop';
    
    // Reset current bets for new betting round
    gameState.players.forEach((player: any) => {
      player.currentBet = 0;
    });
    gameState.currentBet = 0;
    
    // Force update the game state
    testGames.set(gameId, gameState);
    
    console.log(`🧪 TEST API: Dealt flop for game ${gameId}`);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: 'Flop dealt'
      });
    }
    
    res.json({
      success: true,
      gameState,
      message: 'Flop dealt'
    });
  } catch (error) {
    console.error('❌ TEST API: Error dealing flop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deal flop'
    });
  }
});

/**
 * TEST API: Deal turn (4th community card)
 * POST /api/test_deal_turn
 */
router.post('/test_deal_turn', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Add turn card
    gameState.communityCards.push({ rank: 'J', suit: '♣' });
    gameState.phase = 'turn';
    
    // Reset current bets for new betting round
    gameState.players.forEach((player: any) => {
      player.currentBet = 0;
    });
    gameState.currentBet = 0;
    
    // Force update the game state
    testGames.set(gameId, gameState);
    
    console.log(`🧪 TEST API: Dealt turn for game ${gameId}`);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: 'Turn dealt'
      });
    }
    
    res.json({
      success: true,
      gameState,
      message: 'Turn dealt'
    });
  } catch (error) {
    console.error('❌ TEST API: Error dealing turn:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deal turn'
    });
  }
});

/**
 * TEST API: Deal river (5th community card)
 * POST /api/test_deal_river
 */
router.post('/test_deal_river', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Add river card
    gameState.communityCards.push({ rank: '10', suit: '♠' });
    gameState.phase = 'river';
    
    // Reset current bets for new betting round
    gameState.players.forEach((player: any) => {
      player.currentBet = 0;
    });
    gameState.currentBet = 0;
    
    // Force update the game state
    testGames.set(gameId, gameState);
    
    console.log(`🧪 TEST API: Dealt river for game ${gameId}`);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: 'River dealt'
      });
    }
    
    res.json({
      success: true,
      gameState,
      message: 'River dealt'
    });
  } catch (error) {
    console.error('❌ TEST API: Error dealing river:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deal river'
    });
  }
});

/**
 * TEST API: Trigger showdown
 * POST /api/test_trigger_showdown
 */
router.post('/test_trigger_showdown', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Set showdown phase
    gameState.phase = 'showdown';
    
    // Assign sample cards to active players for UI display
    const sampleCards = [
      [{ rank: 'A', suit: '♠' }, { rank: 'K', suit: '♥' }],
      [{ rank: 'Q', suit: '♦' }, { rank: 'J', suit: '♣' }],
      [{ rank: '10', suit: '♠' }, { rank: '9', suit: '♥' }],
      [{ rank: '8', suit: '♦' }, { rank: '7', suit: '♣' }],
      [{ rank: '6', suit: '♠' }, { rank: '5', suit: '♥' }]
    ];
    
    let cardIndex = 0;
    gameState.players.forEach((player: any) => {
      if (player.isActive && cardIndex < sampleCards.length) {
        player.cards = sampleCards[cardIndex];
        cardIndex++;
      }
    });
    
    // Determine winner (simplified - first active player wins)
    const activePlayer = gameState.players.find((p: any) => p.isActive);
    if (activePlayer) {
      gameState.winner = activePlayer.id;
      // Award pot to winner
      activePlayer.chips += gameState.pot;
      gameState.pot = 0;
    }
    
    // Force update the game state
    testGames.set(gameId, gameState);
    
    console.log(`🧪 TEST API: Triggered showdown for game ${gameId}`);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: 'Showdown phase'
      });
    }
    
    res.json({
      success: true,
      gameState,
      message: 'Showdown triggered'
    });
  } catch (error) {
    console.error('❌ TEST API: Error triggering showdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger showdown'
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