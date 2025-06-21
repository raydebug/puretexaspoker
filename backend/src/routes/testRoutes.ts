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
      currentPlayerId: players.length > 0 ? `test-player-${players[0].seatNumber}` : null,
      currentPlayerPosition: 0,
      dealerPosition: gameConfig?.dealerPosition || 1,
      smallBlindPosition: gameConfig?.smallBlindPosition || 2,
      bigBlindPosition: gameConfig?.bigBlindPosition || 3,
      status: 'active',
      phase: 'preflop',
      minBet: gameConfig?.minBet || 10,
      currentBet: 0, // Start with no current bet - first action will set it
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
    const { playerId, nickname, action, amount } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Find player by ID or nickname
    const player = gameState.players.find((p: any) => 
      p.id === playerId || p.name === playerId || p.name === nickname || p.nickname === nickname
    );
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: `Player not found in mock game: ${playerId || nickname}`
      });
    }
    
    // ENHANCED: Support professional poker action logic including all-in
    console.log(`🔍 BEFORE ACTION: ${player.name} has ${player.chips} chips, currentBet: ${player.currentBet}, gameCurrentBet: ${gameState.currentBet}, pot: ${gameState.pot}`);
    
    // Set current player if not set
    if (!gameState.currentPlayerId && gameState.players.length > 0) {
      const firstActivePlayer = gameState.players.find((p: any) => p.isActive);
      if (firstActivePlayer) {
        gameState.currentPlayerId = firstActivePlayer.id;
        console.log(`🎯 Setting initial current player to: ${firstActivePlayer.name} (${firstActivePlayer.id})`);
      }
    }
    
    // Validate action amount for betting actions
    const validateBetAmount = (betAmount: number) => {
      if (betAmount < gameState.minBet && betAmount !== player.chips) {
        throw new Error(`Bet amount ${betAmount} is below minimum bet ${gameState.minBet}`);
      }
      if (betAmount > player.chips) {
        throw new Error(`Bet amount ${betAmount} exceeds player chips ${player.chips}`);
      }
    };
    
    try {
      switch (action) {
        case 'call':
          // Call means match the current bet
          let callAmount = Math.max(0, gameState.currentBet - player.currentBet);
          
          // Special case: if no current bet exists, call acts as minimum bet
          if (gameState.currentBet === 0) {
            callAmount = gameState.minBet;
            gameState.currentBet = gameState.minBet;
          }
          
          // ENHANCED: Handle all-in call scenario
          if (callAmount > player.chips) {
            // All-in call: player calls with all remaining chips
            const allInAmount = player.chips;
            console.log(`🎰 ${player.name} calling all-in for ${allInAmount} (call amount was ${callAmount})`);
            player.chips = 0;
            player.currentBet += allInAmount;
            gameState.pot += allInAmount;
            player.isAllIn = true;
          } else if (callAmount > 0) {
            player.chips -= callAmount;
            player.currentBet += callAmount;
            gameState.pot += callAmount;
          }
          break;
          
        case 'raise':
          // Raise means set current bet to new amount, pay the difference
          const totalRaiseAmount = amount;
          validateBetAmount(totalRaiseAmount);
          
          const additionalChips = totalRaiseAmount - player.currentBet;
          if (additionalChips > 0) {
            // ENHANCED: Handle all-in raise scenario
            if (totalRaiseAmount >= player.chips + player.currentBet) {
              // All-in raise
              const allInRaise = player.chips + player.currentBet;
              console.log(`🎰 ${player.name} raising all-in for ${allInRaise} (attempted ${totalRaiseAmount})`);
              gameState.pot += player.chips;
              player.currentBet += player.chips;
              player.chips = 0;
              player.isAllIn = true;
              gameState.currentBet = allInRaise;
            } else {
              player.chips -= additionalChips;
              player.currentBet = totalRaiseAmount;
              gameState.pot += additionalChips;
              gameState.currentBet = totalRaiseAmount;
            }
          }
          break;
          
        case 'allIn':
          // ENHANCED: Professional all-in implementation
          console.log(`🎰 ${player.name} going all-in with ${player.chips} chips`);
          const allInAmount = player.chips;
          if (allInAmount > 0) {
            gameState.pot += allInAmount;
            player.currentBet += allInAmount;
            player.chips = 0;
            player.isAllIn = true;
            
            // Update current bet if this all-in raises it
            if (player.currentBet > gameState.currentBet) {
              gameState.currentBet = player.currentBet;
            }
            
            // Mark for side pot creation if needed
            gameState.hasSidePotScenario = true;
          }
          break;
          
        case 'fold':
          player.isActive = false;
          player.isFolded = true;
          break;
          
        case 'check':
          // No chips change for check (only valid if no bet to call)
          if (gameState.currentBet > player.currentBet) {
            throw new Error('Cannot check when there is a bet to call');
          }
          break;
          
        case 'bet':
          // Bet means put chips in (usually first bet of a round)
          const betAmount = amount;
          validateBetAmount(betAmount);
          
          // ENHANCED: Handle all-in bet scenario
          if (betAmount >= player.chips) {
            // All-in bet
            console.log(`🎰 ${player.name} betting all-in for ${player.chips}`);
            gameState.pot += player.chips;
            player.currentBet = player.chips;
            player.chips = 0;
            player.isAllIn = true;
            gameState.currentBet = player.currentBet;
          } else if (betAmount > 0) {
            player.chips -= betAmount;
            player.currentBet = betAmount;
            gameState.pot += betAmount;
            gameState.currentBet = betAmount;
          }
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // ENHANCED: Advance turn to next active player
      const advanceToNextPlayer = () => {
        const activePlayers = gameState.players.filter((p: any) => p.isActive && !p.isAllIn);
        if (activePlayers.length <= 1) {
          console.log(`🎯 Only ${activePlayers.length} active non-all-in players remaining`);
          // Check if betting round should complete
          const allInPlayers = gameState.players.filter((p: any) => p.isActive && p.isAllIn);
          if (allInPlayers.length > 0 && activePlayers.length === 0) {
            console.log('🎯 All remaining players are all-in, advancing to next phase');
            gameState.bettingComplete = true;
          }
          return;
        }
        
        const currentPlayerIndex = activePlayers.findIndex((p: any) => p.id === gameState.currentPlayerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
        const nextPlayer = activePlayers[nextPlayerIndex];
        
        if (nextPlayer) {
          gameState.currentPlayerId = nextPlayer.id;
          console.log(`🎯 Turn advanced to: ${nextPlayer.name} (${nextPlayer.id})`);
        }
      };
      
      // Only advance turn for actions that end the player's turn
      if (['call', 'raise', 'fold', 'check', 'bet', 'allIn'].includes(action)) {
        advanceToNextPlayer();
      }
      
      // Force update the game state in the map
      (gameManager as any).testGames.set(gameId, gameState);
      
      console.log(`🔍 AFTER ACTION: ${player.name} has ${player.chips} chips, currentBet: ${player.currentBet}, gameCurrentBet: ${gameState.currentBet}, pot: ${gameState.pot}`);
      
      console.log(`🧪 TEST API: Player ${playerId || nickname} performed ${action} in game ${gameId}`);
      
      // Broadcast the updated game state to all connected clients
      const io = (global as any).socketIO;
      if (io) {
        console.log(`🔄 TEST API: Broadcasting updated game state after ${action} by ${playerId || nickname}`);
        
        // Broadcast to all clients in the game room
        io.to(`game:${gameId}`).emit('gameState', gameState);
        
        // Also broadcast test game state update
        io.emit('testGameStateUpdate', {
          gameId,
          gameState: gameState,
          message: `Player ${playerId || nickname || player.name} performed ${action}${amount ? ` with amount ${amount}` : ''}`
        });
        
        console.log(`📡 TEST API: Updated game state broadcasted after player action`);
      }
      
      res.json({
        success: true,
        gameState,
        action: {
          playerId: playerId || nickname,
          action,
          amount
        }
      });
      
    } catch (actionError) {
      console.error(`❌ TEST API: Action validation error: ${(actionError as Error).message}`);
      res.status(400).json({
        success: false,
        error: (actionError as Error).message
      });
    }
  } catch (error) {
    console.error('❌ TEST API: Error simulating player action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate player action'
    });
  }
});

/**
 * TEST API: Force game to showdown phase for testing
 * POST /api/test_force_showdown/:gameId
 */
router.post('/test_force_showdown/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { winners, handEvaluations } = req.body;
    
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
    gameState.bettingComplete = true;
    
    // ENHANCED: Handle side pot distribution for all-in scenarios
    const activePlayers = gameState.players.filter((p: any) => p.isActive);
    const allInPlayers = activePlayers.filter((p: any) => p.isAllIn);
    
    if (allInPlayers.length > 0 && gameState.hasSidePotScenario) {
      console.log(`🎰 Creating side pots for ${allInPlayers.length} all-in players`);
      
      // Create side pots based on all-in amounts
      const sidePots: any[] = [];
      const sortedAllIns = allInPlayers
        .map((p: any) => ({ player: p, amount: p.currentBet }))
        .sort((a: any, b: any) => a.amount - b.amount);
      
      let previousAmount = 0;
      sortedAllIns.forEach((allIn: any, index: number) => {
        const potAmount = (allIn.amount - previousAmount) * activePlayers.length;
        const eligiblePlayers = activePlayers.slice(index);
        
        sidePots.push({
          amount: potAmount,
          eligiblePlayers: eligiblePlayers.map((p: any) => p.id),
          allInLevel: allIn.amount
        });
        
        previousAmount = allIn.amount;
      });
      
      gameState.sidePots = sidePots;
      console.log(`🎰 Created ${sidePots.length} side pots`);
    }
    
    // ENHANCED: Determine winner(s) with hand evaluation
    if (handEvaluations) {
      gameState.handEvaluations = handEvaluations;
    }
    
    if (winners && Array.isArray(winners)) {
      gameState.winners = winners;
    } else {
      // Default: first active player wins (simplified for testing)
      const firstActivePlayer = activePlayers[0];
      if (firstActivePlayer) {
        gameState.winner = firstActivePlayer.id;
        gameState.winners = [firstActivePlayer.id];
      }
    }
    
    // Distribute pots to winners
    if (gameState.sidePots && gameState.sidePots.length > 0) {
      // Distribute each side pot to best eligible hand
      gameState.sidePots.forEach((sidePot: any) => {
        const eligibleWinners = gameState.winners.filter((winnerId: string) => 
          sidePot.eligiblePlayers.includes(winnerId)
        );
        
        if (eligibleWinners.length > 0) {
          const winner = gameState.players.find((p: any) => p.id === eligibleWinners[0]);
          if (winner) {
            winner.chips += sidePot.amount;
            sidePot.winner = winner.id;
          }
        }
      });
      gameState.pot = 0; // Pot distributed via side pots
    } else {
      // Standard pot distribution
      if (gameState.winner) {
        const winnerPlayer = gameState.players.find((p: any) => p.id === gameState.winner);
        if (winnerPlayer) {
          winnerPlayer.chips += gameState.pot;
          gameState.pot = 0;
        }
      }
    }
    
    // Force update the game state
    testGames.set(gameId, gameState);
    
    console.log(`🧪 TEST API: Forced showdown for game ${gameId}`);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: 'Forced showdown with side pot distribution'
      });
    }
    
    res.json({
      success: true,
      gameState,
      message: 'Showdown forced with advanced pot distribution'
    });
  } catch (error) {
    console.error('❌ TEST API: Error forcing showdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force showdown'
    });
  }
});

/**
 * TEST API: Update game configuration
 * POST /api/test_update_game_config
 */
router.post('/test_update_game_config', async (req, res) => {
  try {
    const { gameId, config } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Mock game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Update game configuration
    if (config.bigBlind !== undefined) {
      gameState.bigBlind = config.bigBlind;
    }
    if (config.smallBlind !== undefined) {
      gameState.smallBlind = config.smallBlind;
    }
    if (config.minBet !== undefined) {
      gameState.minBet = config.minBet;
    }
    if (config.dealerPosition !== undefined) {
      gameState.dealerPosition = config.dealerPosition;
    }
    if (config.maxRaise !== undefined) {
      gameState.maxRaise = config.maxRaise;
    }
    
    // Force update the game state
    testGames.set(gameId, gameState);
    
    console.log(`🧪 TEST API: Updated game config for ${gameId}:`, config);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: 'Game configuration updated'
      });
    }
    
    res.json({
      success: true,
      gameState,
      config,
      message: 'Game configuration updated'
    });
  } catch (error) {
    console.error('❌ TEST API: Error updating game config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game config'
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
 * TEST API: Deal hole cards to all players
 * POST /api/test_deal_hole_cards
 */
router.post('/test_deal_hole_cards', async (req, res) => {
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
    
    // Deal 2 hole cards to each active player
    const holeCards = [
      [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'hearts' }],
      [{ rank: 'Q', suit: 'diamonds' }, { rank: 'J', suit: 'clubs' }], 
      [{ rank: '10', suit: 'spades' }, { rank: '9', suit: 'hearts' }],
      [{ rank: '8', suit: 'diamonds' }, { rank: '7', suit: 'clubs' }],
      [{ rank: '6', suit: 'spades' }, { rank: '5', suit: 'hearts' }]
    ];
    
    let cardIndex = 0;
    gameState.players.forEach((player: any) => {
      if (player.isActive && cardIndex < holeCards.length) {
        player.cards = holeCards[cardIndex];
        cardIndex++;
      }
    });
    
    // Force update the game state
    testGames.set(gameId, gameState);
    
    console.log(`🧪 TEST API: Dealt hole cards to players in game ${gameId}`);
    
    // Broadcast update
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
      io.emit('testGameStateUpdate', {
        gameId,
        gameState: gameState,
        message: 'Hole cards dealt'
      });
    }
    
    res.json({
      success: true,
      gameState,
      message: 'Hole cards dealt to all players'
    });
  } catch (error) {
    console.error('❌ TEST API: Error dealing hole cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deal hole cards'
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
    
    // Add 3 community cards for flop (avoid duplicating hole cards)
    gameState.communityCards = [
      { rank: '2', suit: '♠' },
      { rank: '3', suit: '♥' },
      { rank: '4', suit: '♦' }
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
    
    // Add turn card (avoid duplicating hole cards)
    gameState.communityCards.push({ rank: '5', suit: '♣' });
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
    
    // Add river card (avoid duplicating hole cards)  
    gameState.communityCards.push({ rank: '6', suit: '♦' });
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
    
    // Keep the existing hole cards that were already dealt (don't override them)
    // The showdown just reveals the cards that were already dealt to players
    // No need to assign new cards - they were already dealt via test_deal_hole_cards
    
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