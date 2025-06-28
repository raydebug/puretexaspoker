import express from 'express';
import { GameManager } from '../services/gameManager';
import { tableManager } from '../services/TableManager';
import { authService } from '../services/authService';
import { roleManager } from '../services/roleManager';
import { gamePersistenceManager } from '../services/gamePersistenceManager';
import { prisma } from '../db';

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
    
    // PROFESSIONAL TURN ORDER VALIDATION - Reject out-of-turn actions
    const validateTurnOrder = () => {
      // Check if game is in a playable state
      if (gameState.status !== 'active' && gameState.status !== 'playing') {
        return { isValid: false, error: `Cannot perform ${action}: game is not active (status: ${gameState.status})` };
      }

      // Check if it's a valid phase for actions
      if (gameState.phase === 'finished' || gameState.phase === 'showdown') {
        return { isValid: false, error: `Cannot perform ${action}: hand is ${gameState.phase}` };
      }

      // Check if player is active (not folded)
      if (!player.isActive) {
        return { isValid: false, error: `Cannot perform ${action}: you have folded and are no longer active in this hand` };
      }

      // Check if it's the player's turn (CRITICAL ENFORCEMENT)
      if (gameState.currentPlayerId !== player.id && gameState.currentPlayerId !== player.name) {
        const currentPlayer = gameState.players.find((p: any) => p.id === gameState.currentPlayerId);
        const currentPlayerName = currentPlayer ? currentPlayer.name : 'Unknown';
        
        return { 
          isValid: false, 
          error: `OUT OF TURN: It is currently ${currentPlayerName}'s turn to act. Please wait for your turn. (Attempted: ${action})` 
        };
      }

      // Additional action-specific validations
      if (action === 'check') {
        if (gameState.currentBet > player.currentBet) {
          return { 
            isValid: false, 
            error: `Cannot check: there is a bet of ${gameState.currentBet - player.currentBet} to call` 
          };
        }
      }

      if (action === 'call') {
        const callAmount = gameState.currentBet - player.currentBet;
        if (callAmount <= 0) {
          return { 
            isValid: false, 
            error: `Cannot call: no bet to call. Use check instead.` 
          };
        }
      }

      return { isValid: true };
    };
    
    // VALIDATE TURN ORDER BEFORE PROCESSING ACTION
    const turnValidation = validateTurnOrder();
    if (!turnValidation.isValid) {
      console.log(`❌ TURN ORDER VIOLATION: ${player.name} attempted ${action} - ${turnValidation.error}`);
      return res.status(400).json({
        success: false,
        error: turnValidation.error,
        violation: 'TURN_ORDER_VIOLATION',
        currentPlayer: gameState.currentPlayerId,
        attemptedPlayer: player.name,
        attemptedAction: action
      });
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
 * TEST API: Complete Betting Round for Automated Testing
 * POST /api/test/complete_betting_round
 */
router.post('/test/complete_betting_round', async (req, res) => {
  try {
    const { gameId, phase } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    console.log(`🔄 TEST: Completing betting round for phase ${phase}`);
    
    // Force betting round completion for testing
    if (phase === 'preflop') {
      // Transition to flop
      gameState.phase = 'flop';
      gameState.communityCards = [
        { rank: 'A', suit: '♠' },
        { rank: 'K', suit: '♥' },
        { rank: 'Q', suit: '♦' }
      ];
    } else if (phase === 'flop') {
      // Transition to turn
      gameState.phase = 'turn'; 
      gameState.communityCards.push({ rank: 'J', suit: '♣' });
    } else if (phase === 'turn') {
      // Transition to river
      gameState.phase = 'river';
      gameState.communityCards.push({ rank: '10', suit: '♠' });
    } else if (phase === 'river') {
      // Transition to showdown
      gameState.phase = 'showdown';
    }
    
    // Reset betting state for new round
    gameState.currentBet = 0;
    gameState.players.forEach((player: any) => {
      player.currentBet = 0;
    });
    
    console.log(`✅ TEST: Completed betting round transition from ${phase} to ${gameState.phase}`);
    
    res.json({
      success: true,
      gameState,
      message: `Betting round completed for ${phase} phase`
    });
    
  } catch (error) {
    console.error('Error completing betting round:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Enhanced Blind System - Initialize Blind Schedule
 * POST /api/test/initialize_blind_schedule
 */
router.post('/test/initialize_blind_schedule', async (req, res) => {
  try {
    const { gameId, schedule } = req.body;
    
    const gameManager = GameManager.getInstance();
    const gameService = gameManager.getGame(gameId);
    
    if (!gameService) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Initialize the blind schedule
    gameService.initializeBlindSchedule(schedule);
    
    console.log(`🏆 TEST: Initialized blind schedule for game ${gameId}`);
    
    res.json({
      success: true,
      message: 'Blind schedule initialized successfully',
      schedule: schedule
    });
    
  } catch (error) {
    console.error('Error initializing blind schedule:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Enhanced Blind System - Get Blind Schedule Summary
 * POST /api/test/get_blind_summary
 */
router.post('/test/get_blind_summary', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const gameService = gameManager.getGame(gameId);
    
    if (!gameService) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const blindSummary = gameService.getBlindScheduleSummary();
    
    res.json({
      success: true,
      blindSummary: blindSummary
    });
    
  } catch (error) {
    console.error('Error getting blind summary:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Enhanced Blind System - Handle Seat Change
 * POST /api/test/change_seat
 */
router.post('/test/change_seat', async (req, res) => {
  try {
    const { gameId, playerName, oldSeat, newSeat } = req.body;
    
    const gameManager = GameManager.getInstance();
    const gameService = gameManager.getGame(gameId);
    
    if (!gameService) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Find player by name
    const gameState = gameService.getGameState();
    const player = gameState.players.find(p => p.name === playerName);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }
    
    // Handle seat change with dead blind logic
    gameService.handleSeatChange(player.id, oldSeat, newSeat);
    
    console.log(`🔄 TEST: Player ${playerName} changed from seat ${oldSeat} to ${newSeat}`);
    
    res.json({
      success: true,
      message: 'Seat change processed successfully'
    });
    
  } catch (error) {
    console.error('Error handling seat change:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Enhanced Blind System - Get Dead Blinds
 * POST /api/test/get_dead_blinds
 */
router.post('/test/get_dead_blinds', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const gameService = gameManager.getGame(gameId);
    
    if (!gameService) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const gameState = gameService.getGameState();
    const deadBlinds = gameState.deadBlinds || [];
    
    // Enhance with player names for easier testing
    const enhancedDeadBlinds = deadBlinds.map(db => {
      const player = gameState.players.find(p => p.id === db.playerId);
      return {
        ...db,
        playerName: player?.name || 'Unknown'
      };
    });
    
    res.json({
      success: true,
      deadBlinds: enhancedDeadBlinds
    });
    
  } catch (error) {
    console.error('Error getting dead blinds:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Enhanced Blind System - Simulate Time Elapsed
 * POST /api/test/simulate_time_elapsed
 */
router.post('/test/simulate_time_elapsed', async (req, res) => {
  try {
    const { gameId, minutes } = req.body;
    
    const gameManager = GameManager.getInstance();
    const gameService = gameManager.getGame(gameId);
    
    if (!gameService) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const gameState = gameService.getGameState();
    const blindManager = gameService.getEnhancedBlindManager();
    
    // Simulate time passage by adjusting blind level start time
    if (gameState.blindLevelStartTime) {
      gameState.blindLevelStartTime = gameState.blindLevelStartTime - (minutes * 60 * 1000);
    }
    
    console.log(`⏰ TEST: Simulated ${minutes} minutes elapsed for game ${gameId}`);
    
    res.json({
      success: true,
      message: `Simulated ${minutes} minutes elapsed`
    });
    
  } catch (error) {
    console.error('Error simulating time elapsed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Enhanced Blind System - Check Blind Level Increase
 * POST /api/test/check_blind_increase
 */
router.post('/test/check_blind_increase', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const gameService = gameManager.getGame(gameId);
    
    if (!gameService) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const blindManager = gameService.getEnhancedBlindManager();
    const increased = blindManager.checkBlindLevelIncrease();
    
    console.log(`📈 TEST: Blind level increase check - ${increased ? 'Increased' : 'No change'}`);
    
    res.json({
      success: true,
      increased: increased,
      message: increased ? 'Blind level increased' : 'No blind level change'
    });
    
  } catch (error) {
    console.error('Error checking blind increase:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: User Role Management - Initialize Roles
 * POST /api/test/initialize_roles
 */
router.post('/test/initialize_roles', async (req, res) => {
  try {
    // Initialize roles using the script
    const { initializeRoles } = require('../scripts/initializeRoles');
    await initializeRoles();
    
    console.log('🔐 TEST: Role system initialized');
    
    res.json({
      success: true,
      message: 'Role system initialized successfully'
    });
    
  } catch (error) {
    console.error('Error initializing roles:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: User Role Management - Create User with Role
 * POST /api/test/create_user_with_role
 */
router.post('/test/create_user_with_role', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Register user first
    const authResponse = await authService.register({
      username,
      email: `${username}@test.com`,
      password,
      displayName: username
    });
    
    // Assign role if different from default
    if (role !== 'player') {
      await roleManager.assignRole(authResponse.user.id, role, 'system');
    }
    
    // Get updated user info with role
    const userRoleInfo = await roleManager.getUserRoleInfo(authResponse.user.id);
    
    console.log(`👤 TEST: Created user ${username} with role ${role}`);
    
    res.json({
      success: true,
      user: {
        ...authResponse.user,
        role: userRoleInfo?.role
      },
      tokens: authResponse.tokens
    });
    
  } catch (error) {
    console.error('Error creating user with role:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: User Role Management - Check Permission
 * POST /api/test/check_permission
 */
router.post('/test/check_permission', async (req, res) => {
  try {
    const { username, permission } = req.body;
    
    // Find user by username
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const hasPermission = await roleManager.hasPermission(user.id, permission);
    
    res.json({
      success: true,
      hasPermission,
      username,
      permission
    });
    
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: User Role Management - Get User Permissions
 * POST /api/test/get_user_permissions
 */
router.post('/test/get_user_permissions', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Find user by username
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userRoleInfo = await roleManager.getUserRoleInfo(user.id);
    
    res.json({
      success: true,
      permissions: userRoleInfo?.role.permissions || [],
      role: userRoleInfo?.role
    });
    
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: User Role Management - Execute Moderation
 * POST /api/test/execute_moderation
 */
router.post('/test/execute_moderation', async (req, res) => {
  try {
    const { moderatorId, targetUserId, action, reason, duration, tableId } = req.body;
    
    const moderationAction = await roleManager.executeModeration({
      type: action,
      moderatorId,
      targetUserId,
      reason,
      duration,
      tableId
    });
    
    if (moderationAction) {
      console.log(`⚖️ TEST: ${action} executed by ${moderatorId} against ${targetUserId}`);
      
      res.json({
        success: true,
        moderationAction
      });
    } else {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions for moderation action'
      });
    }
    
  } catch (error) {
    console.error('Error executing moderation:', error);
    res.status(403).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: User Role Management - Assign Role
 * POST /api/test/assign_role
 */
router.post('/test/assign_role', async (req, res) => {
  try {
    const { adminId, targetUserId, roleName } = req.body;
    
    const success = await roleManager.assignRole(targetUserId, roleName, adminId);
    
    if (success) {
      console.log(`🔐 TEST: Role ${roleName} assigned to ${targetUserId} by ${adminId}`);
      
      res.json({
        success: true,
        message: `Role ${roleName} assigned successfully`
      });
    } else {
      res.status(403).json({
        success: false,
        error: 'Failed to assign role'
      });
    }
    
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: User Role Management - Get User Role
 * POST /api/test/get_user_role
 */
router.post('/test/get_user_role', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Find user by username
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userRoleInfo = await roleManager.getUserRoleInfo(user.id);
    
    res.json({
      success: true,
      role: userRoleInfo?.role,
      user: {
        id: user.id,
        username: user.username,
        isActive: user.isActive,
        isBanned: user.isBanned
      }
    });
    
  } catch (error) {
    console.error('Error getting user role:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Enhanced Blind System - Setup Cash Game
 * POST /api/test/setup_cash_game
 */
router.post('/test/setup_cash_game', async (req, res) => {
  try {
    const { gameId, smallBlind, bigBlind } = req.body;
    
    const gameManager = GameManager.getInstance();
    const gameService = gameManager.getGame(gameId);
    
    if (!gameService) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const gameState = gameService.getGameState();
    gameState.smallBlind = smallBlind;
    gameState.bigBlind = bigBlind;
    gameState.handNumber = 0;
    
    console.log(`💰 TEST: Setup cash game with blinds ${smallBlind}/${bigBlind}`);
    
    res.json({
      success: true,
      message: `Cash game setup with blinds ${smallBlind}/${bigBlind}`
    });
    
  } catch (error) {
    console.error('Error setting up cash game:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Professional Turn Order Validation
 * POST /api/test/validate_turn_order
 */
router.post('/test/validate_turn_order', async (req, res) => {
  try {
    const { gameId, playerId, action } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Professional Turn Order Validation Logic
    const validateTurnOrder = () => {
      // Check if game is in a playable state
      if (gameState.status !== 'active' && gameState.status !== 'playing') {
        return { isValid: false, error: `Cannot perform ${action}: game is not active (status: ${gameState.status})` };
      }

      // Check if it's a valid phase for actions
      if (gameState.phase === 'finished' || gameState.phase === 'showdown') {
        return { isValid: false, error: `Cannot perform ${action}: hand is ${gameState.phase}` };
      }

      // Get the player
      const player = gameState.players.find((p: any) => p.id === playerId || p.name === playerId);
      if (!player) {
        return { isValid: false, error: 'Player not found in game' };
      }

      // Check if player is active (not folded)
      if (!player.isActive) {
        return { isValid: false, error: `Cannot perform ${action}: you have folded and are no longer active in this hand` };
      }

      // Check if it's the player's turn (CRITICAL ENFORCEMENT)
      if (gameState.currentPlayerId !== playerId && gameState.currentPlayerId !== player.name) {
        const currentPlayer = gameState.players.find((p: any) => p.id === gameState.currentPlayerId);
        const currentPlayerName = currentPlayer ? currentPlayer.name : 'Unknown';
        
        return { 
          isValid: false, 
          error: `OUT OF TURN: It is currently ${currentPlayerName}'s turn to act. Please wait for your turn. (Attempted: ${action})` 
        };
      }

      // Additional action-specific validations
      if (action === 'check') {
        if (gameState.currentBet > player.currentBet) {
          return { 
            isValid: false, 
            error: `Cannot check: there is a bet of ${gameState.currentBet - player.currentBet} to call` 
          };
        }
      }

      if (action === 'call') {
        const callAmount = gameState.currentBet - player.currentBet;
        if (callAmount <= 0) {
          return { 
            isValid: false, 
            error: `Cannot call: no bet to call. Use check instead.` 
          };
        }
      }

      return { isValid: true };
    };
    
    const validation = validateTurnOrder();
    
    console.log(`🔍 TURN ORDER VALIDATION: ${playerId} attempting ${action} - ${validation.isValid ? 'VALID' : 'INVALID'}`);
    if (!validation.isValid) {
      console.log(`❌ TURN ORDER VIOLATION: ${validation.error}`);
    }
    
    res.json({
      success: true,
      isValid: validation.isValid,
      error: validation.error,
      gameState: {
        currentPlayerId: gameState.currentPlayerId,
        phase: gameState.phase,
        status: gameState.status
      }
    });
  } catch (error) {
    console.error('❌ TEST API: Error validating turn order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate turn order'
    });
  }
});

/**
 * TEST API: Get current game state for validation
 * POST /api/test/get_game_state
 */
router.post('/test/get_game_state', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    
    // Check test games first
    const testGames = (gameManager as any).testGames;
    if (testGames && testGames.has(gameId)) {
      const gameState = testGames.get(gameId);
      return res.json({
        success: true,
        gameState,
        source: 'test'
      });
    }
    
    // Then check real games
    const realGame = gameManager.getGame(gameId);
    if (realGame) {
      const gameState = realGame.getGameState();
      return res.json({
        success: true,
        gameState,
        source: 'real'
      });
    }
    
    res.status(404).json({
      success: false,
      error: 'Game not found'
    });
  } catch (error) {
    console.error('❌ TEST API: Error getting game state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game state'
    });
  }
});

/**
 * TEST API: Complete betting round for testing
 * POST /api/test/complete_betting_round
 */
router.post('/test/complete_betting_round', async (req, res) => {
  try {
    const { gameId, phase } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    console.log(`🎰 TEST API: Completing ${phase} betting round...`);
    
    // Reset all player bets for new round
    gameState.players.forEach((player: any) => {
      if (player.isActive) {
        player.currentBet = 0;
      }
    });
    
    // Advance to next phase
    switch (phase) {
      case 'preflop':
        gameState.phase = 'flop';
        gameState.communityCards = [
          { suit: 'hearts', rank: '7' },
          { suit: 'diamonds', rank: '8' },
          { suit: 'clubs', rank: 'K' }
        ];
        break;
      case 'flop':
        gameState.phase = 'turn';
        gameState.communityCards.push({ suit: 'spades', rank: 'Q' });
        break;
      case 'turn':
        gameState.phase = 'river';
        gameState.communityCards.push({ suit: 'hearts', rank: 'A' });
        break;
      case 'river':
        gameState.phase = 'showdown';
        break;
      default:
        throw new Error(`Invalid phase for completion: ${phase}`);
    }
    
    // Reset current bet for new round
    gameState.currentBet = 0;
    
    // Set first player for new betting round (left of dealer)
    const activePlayers = gameState.players.filter((p: any) => p.isActive);
    if (activePlayers.length > 0) {
      // Find player left of dealer for post-flop betting
      const dealerIndex = activePlayers.findIndex((p: any) => p.isDealer);
      const firstToActIndex = (dealerIndex + 1) % activePlayers.length;
      const firstToAct = activePlayers[firstToActIndex];
      
      if (firstToAct) {
        gameState.currentPlayerId = firstToAct.id;
        console.log(`🎯 First to act in ${gameState.phase}: ${firstToAct.name}`);
      }
    }
    
    // Update in map
    testGames.set(gameId, gameState);
    
    // Broadcast updated state
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
    }
    
    console.log(`✅ TEST API: ${phase} betting round completed, advanced to ${gameState.phase}`);
    
    res.json({
      success: true,
      gameState,
      message: `${phase} betting round completed`
    });
  } catch (error) {
    console.error('❌ TEST API: Error completing betting round:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete betting round'
    });
  }
});

/**
 * TEST API: Start game for testing
 * POST /api/test/start_game
 */
router.post('/test/start_game', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const gameManager = GameManager.getInstance();
    const testGames = (gameManager as any).testGames;
    
    if (!testGames || !testGames.has(gameId)) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const gameState = testGames.get(gameId);
    
    // Start the game
    gameState.status = 'playing';
    gameState.phase = 'preflop';
    
    // Post blinds
    const activePlayers = gameState.players.filter((p: any) => p.isActive);
    if (activePlayers.length >= 2) {
      const smallBlindPlayer = activePlayers[gameState.smallBlindPosition - 1] || activePlayers[0];
      const bigBlindPlayer = activePlayers[gameState.bigBlindPosition - 1] || activePlayers[1];
      
      // Post small blind
      if (smallBlindPlayer) {
        const smallBlindAmount = Math.min(gameState.smallBlind, smallBlindPlayer.chips);
        smallBlindPlayer.chips -= smallBlindAmount;
        smallBlindPlayer.currentBet = smallBlindAmount;
        gameState.pot += smallBlindAmount;
      }
      
      // Post big blind
      if (bigBlindPlayer) {
        const bigBlindAmount = Math.min(gameState.bigBlind, bigBlindPlayer.chips);
        bigBlindPlayer.chips -= bigBlindAmount;
        bigBlindPlayer.currentBet = bigBlindAmount;
        gameState.pot += bigBlindAmount;
        gameState.currentBet = bigBlindAmount;
      }
      
      // Set first to act (left of big blind)
      const bigBlindIndex = activePlayers.findIndex((p: any) => p === bigBlindPlayer);
      const firstToActIndex = (bigBlindIndex + 1) % activePlayers.length;
      const firstToAct = activePlayers[firstToActIndex];
      
      if (firstToAct) {
        gameState.currentPlayerId = firstToAct.id;
        console.log(`🎯 First to act preflop: ${firstToAct.name}`);
      }
    }
    
    // Update in map
    testGames.set(gameId, gameState);
    
    // Broadcast updated state
    const io = (global as any).socketIO;
    if (io) {
      io.to(`game:${gameId}`).emit('gameState', gameState);
    }
    
    console.log(`✅ TEST API: Game ${gameId} started`);
    
    res.json({
      success: true,
      gameState,
      message: 'Game started'
    });
  } catch (error) {
    console.error('❌ TEST API: Error starting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game'
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

/**
 * TEST API: Game Persistence - Initialize Persistence System
 * POST /api/test/initialize_persistence
 */
router.post('/test/initialize_persistence', async (req, res) => {
  try {
    console.log('💾 TEST: Initializing game persistence system');
    
    // The persistence system is initialized when the service is imported
    // This endpoint confirms it's ready
    
    res.json({
      success: true,
      message: 'Game persistence system initialized'
    });
    
  } catch (error) {
    console.error('Error initializing persistence:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Create Persistent Game
 * POST /api/test/create_persistent_game
 */
router.post('/test/create_persistent_game', async (req, res) => {
  try {
    const { gameId, players, tableId, enableAutoSave } = req.body;
    
    console.log(`🎮 TEST: Creating persistent game ${gameId}`);
    
    // Create mock game state for testing
    const gameState = {
      id: gameId,
      players: players.map((player: any) => ({
        ...player,
        currentBet: 0,
        cards: [],
        isActive: true,
        isAway: false
      })),
      communityCards: [],
      burnedCards: [],
      pot: 0,
      currentPlayerId: players[0]?.id || null,
      currentPlayerPosition: 0,
      dealerPosition: 0,
      smallBlindPosition: 1,
      bigBlindPosition: 2,
      phase: 'waiting' as const,
      status: 'waiting' as const,
      currentBet: 0,
      minBet: 10,
      smallBlind: 5,
      bigBlind: 10,
      handEvaluation: undefined,
      winner: undefined,
      isHandComplete: false
    };
    
    // Save game state using persistence manager
    await gamePersistenceManager.saveGameState(gameId, gameState, tableId, 'game_created');
    
    // Start auto-save if requested
    if (enableAutoSave) {
      gamePersistenceManager.startAutoSave(gameId, () => gameState, tableId);
    }
    
    res.json({
      success: true,
      gameId,
      gameState,
      message: 'Persistent game created successfully'
    });
    
  } catch (error) {
    console.error('Error creating persistent game:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Execute Player Action
 * POST /api/test/execute_player_action
 */
router.post('/test/execute_player_action', async (req, res) => {
  try {
    const { gameId, playerId, action, amount } = req.body;
    
    console.log(`⚡ TEST: Executing ${action} by ${playerId} in game ${gameId}`);
    
    // Get current game state
    const gameState = await gamePersistenceManager.restoreGameState(gameId);
    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Find the player
    const player = gameState.players.find(p => p.id === playerId || p.name === playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }
    
    // Simulate action execution
    switch (action) {
      case 'bet':
        player.chips -= amount;
        player.currentBet += amount;
        gameState.pot += amount;
        gameState.currentBet = Math.max(gameState.currentBet, player.currentBet);
        break;
      case 'call':
        const callAmount = gameState.currentBet - player.currentBet;
        player.chips -= callAmount;
        player.currentBet += callAmount;
        gameState.pot += callAmount;
        break;
      case 'raise':
        const raiseAmount = amount - player.currentBet;
        player.chips -= raiseAmount;
        player.currentBet = amount;
        gameState.pot += raiseAmount;
        gameState.currentBet = amount;
        break;
      case 'fold':
        player.isActive = false;
        break;
    }
    
    // Record the action
    await gamePersistenceManager.recordGameAction(
      gameId,
      player.id,
      player.name || player.id,
      action,
      amount,
      gameState.phase
    );
    
    // Save updated game state
    await gamePersistenceManager.saveGameState(gameId, gameState, 'test-table-1', action);
    
    res.json({
      success: true,
      gameState,
      action: { playerId, action, amount }
    });
    
  } catch (error) {
    console.error('Error executing player action:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Check Game Persistence
 * POST /api/test/check_game_persistence
 */
router.post('/test/check_game_persistence', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    console.log(`💾 TEST: Checking persistence for game ${gameId}`);
    
    const gameSession = await prisma.gameSession.findUnique({
      where: { gameId }
    });
    
    res.json({
      success: true,
      gameSession,
      isPersisted: !!gameSession
    });
    
  } catch (error) {
    console.error('Error checking game persistence:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Get Saved Game State
 * POST /api/test/get_saved_game_state
 */
router.post('/test/get_saved_game_state', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    console.log(`🔄 TEST: Getting saved game state for ${gameId}`);
    
    const gameState = await gamePersistenceManager.restoreGameState(gameId);
    
    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'No saved game state found'
      });
    }
    
    res.json({
      success: true,
      gameState
    });
    
  } catch (error) {
    console.error('Error getting saved game state:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Create User for Testing
 * POST /api/test/create_user
 */
router.post('/test/create_user', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    console.log(`👤 TEST: Creating user ${username}`);
    
    const authResponse = await authService.register({
      username,
      email,
      password,
      displayName: username
    });
    
    res.json({
      success: true,
      user: authResponse.user,
      tokens: authResponse.tokens
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Join Game with Session
 * POST /api/test/join_game_with_session
 */
router.post('/test/join_game_with_session', async (req, res) => {
  try {
    const { userId, gameId, playerName, createSession } = req.body;
    
    console.log(`🎮 TEST: User ${userId} joining game ${gameId} as ${playerName}`);
    
    const playerId = `player-${Date.now()}`;
    
    if (createSession) {
      const sessionInfo = await gamePersistenceManager.createPlayerSession(
        userId,
        gameId,
        playerId,
        'test-socket-id'
      );
      
      res.json({
        success: true,
        playerId,
        sessionToken: sessionInfo.reconnectToken
      });
    } else {
      res.json({
        success: true,
        playerId
      });
    }
    
  } catch (error) {
    console.error('Error joining game with session:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Check Player Session
 * POST /api/test/check_player_session
 */
router.post('/test/check_player_session', async (req, res) => {
  try {
    const { userId, gameId } = req.body;
    
    console.log(`👤 TEST: Checking player session for user ${userId} in game ${gameId}`);
    
    const session = await prisma.playerSession.findUnique({
      where: { userId_gameId: { userId, gameId } }
    });
    
    res.json({
      success: true,
      session
    });
    
  } catch (error) {
    console.error('Error checking player session:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Game Persistence - Check Connection Log
 * POST /api/test/check_connection_log
 */
router.post('/test/check_connection_log', async (req, res) => {
  try {
    const { userId, gameId, action } = req.body;
    
    console.log(`📝 TEST: Checking connection log for user ${userId}`);
    
    const logEntries = await prisma.connectionLog.findMany({
      where: {
        userId,
        gameId,
        action
      },
      orderBy: { timestamp: 'desc' },
      take: 5
    });
    
    res.json({
      success: true,
      logEntries
    });
    
  } catch (error) {
    console.error('Error checking connection log:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * TEST API: Auto-start poker game when enough players are seated
 * POST /api/test_auto_start_game
 */
router.post('/test_auto_start_game', async (req, res) => {
  try {
    const { gameId, minPlayers = 2 } = req.body;
    
    console.log(`🎯 TEST API: Auto-start game check for ${gameId}, minPlayers: ${minPlayers}`);
    
    const gameManager = GameManager.getInstance();
    
    // Check if this is a real game or test game
    const realGame = (gameManager as any).games?.get(gameId);
    const testGames = (gameManager as any).testGames;
    const testGame = testGames?.get(gameId);
    
    if (realGame) {
      // Handle real game auto-start
      const gameState = realGame.getGameState();
      const seatedPlayers = gameState.players.filter((p: any) => p.isActive);
      
      console.log(`🎯 REAL GAME: Found ${seatedPlayers.length} seated players`);
      
      if (seatedPlayers.length >= minPlayers && gameState.phase === 'waiting') {
        console.log(`🎯 REAL GAME: Starting automatic poker game for ${gameId}`);
        
        // Start the real poker game
        const startedGameState = await gameManager.startGame(gameId);
        
        console.log(`✅ REAL GAME: Started - Phase: ${startedGameState.phase}, Players: ${startedGameState.players.length}`);
        
        // Broadcast to WebSocket clients
        const io = (global as any).socketIO;
        if (io) {
          io.to(`game:${gameId}`).emit('gameStarted', startedGameState);
          io.to(`game:${gameId}`).emit('gameState', startedGameState);
        }
        
        return res.json({
          success: true,
          gameState: startedGameState,
          message: `Poker game started automatically with ${seatedPlayers.length} players`,
          gameType: 'real'
        });
      }
    } else if (testGame) {
      // Handle test game auto-start
      const seatedPlayers = testGame.players.filter((p: any) => p.seatNumber !== null);
      
      console.log(`🧪 TEST GAME: Found ${seatedPlayers.length} seated players`);
      
      if (seatedPlayers.length >= minPlayers && testGame.phase === 'waiting') {
        console.log(`🧪 TEST GAME: Starting automatic poker game for ${gameId}`);
        
        // Simulate poker game start for test
        testGame.phase = 'preflop';
        testGame.status = 'playing';
        
        // Deal hole cards to seated players
        const deck = ['A♠', 'K♠', 'Q♠', 'J♠', '10♠', '9♠', '8♠', '7♠', '6♠', '5♠', '4♠', '3♠', '2♠',
                     'A♥', 'K♥', 'Q♥', 'J♥', '10♥', '9♥', '8♥', '7♥', '6♥', '5♥', '4♥', '3♥', '2♥',
                     'A♦', 'K♦', 'Q♦', 'J♦', '10♦', '9♦', '8♦', '7♦', '6♦', '5♦', '4♦', '3♦', '2♦',
                     'A♣', 'K♣', 'Q♣', 'J♣', '10♣', '9♣', '8♣', '7♣', '6♣', '5♣', '4♣', '3♣', '2♣'];
        
        let cardIndex = 0;
        seatedPlayers.forEach((player: any, index: number) => {
          player.cards = [deck[cardIndex++], deck[cardIndex++]];
          player.isActive = true;
        });
        
        // Set first player to act
        testGame.currentPlayerId = seatedPlayers[0]?.nickname;
        testGame.pot = 15; // Small blind + big blind
        testGame.currentBet = 10; // Big blind
        
        console.log(`✅ TEST GAME: Started - Phase: ${testGame.phase}, Current player: ${testGame.currentPlayerId}`);
        
        // Broadcast to WebSocket clients
        const io = (global as any).socketIO;
        if (io) {
          io.to(`game:${gameId}`).emit('gameStarted', testGame);
          io.to(`game:${gameId}`).emit('gameState', testGame);
        }
        
        return res.json({
          success: true,
          gameState: testGame,
          message: `Test poker game started automatically with ${seatedPlayers.length} players`,
          gameType: 'test'
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Not enough players or game already started
    const currentPlayers = realGame ? 
      realGame.getGameState().players.filter((p: any) => p.isActive).length :
      testGame?.players.filter((p: any) => p.seatNumber !== null).length || 0;
    
    res.json({
      success: false,
      message: `Not enough players (${currentPlayers}/${minPlayers}) or game already started`,
      currentPlayers,
      minPlayers,
      gameType: realGame ? 'real' : 'test'
    });
    
  } catch (error) {
    console.error('❌ TEST API: Error auto-starting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-start game'
    });
  }
});

export default router; 