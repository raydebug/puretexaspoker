/**
 * Mock Backend Server for UI Testing
 * 
 * Provides all APIs needed for comprehensive UI testing without real backend dependency.
 * Focus: Enable real DOM element verification of game history with GH- prefixed IDs.
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

class MockBackendServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Mock state
    this.gameState = {
      currentPhase: 'setup',
      actionCounter: 2, // Start after blinds (GH-1, GH-2)
      players: this.createMockPlayers(),
      table: this.createMockTable(),
      gameHistory: this.getInitialHistory()
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }
  
  createMockPlayers() {
    return [
      {
        id: 'Player1',
        name: 'Player1',
        nickname: 'Player1',
        seatNumber: 1,
        chips: 99,
        isActive: true,
        position: 'SB'
      },
      {
        id: 'Player2',
        name: 'Player2', 
        nickname: 'Player2',
        seatNumber: 2,
        chips: 98,
        isActive: true,
        position: 'BB'
      },
      {
        id: 'Player3',
        name: 'Player3',
        nickname: 'Player3', 
        seatNumber: 3,
        chips: 100,
        isActive: true,
        position: 'UTG'
      },
      {
        id: 'Player4',
        name: 'Player4',
        nickname: 'Player4',
        seatNumber: 4,
        chips: 100,
        isActive: true,
        position: 'CO'
      },
      {
        id: 'Player5',
        name: 'Player5',
        nickname: 'Player5',
        seatNumber: 5, 
        chips: 100,
        isActive: true,
        position: 'BTN'
      }
    ];
  }
  
  createMockTable() {
    return {
      id: 1,
      name: 'Table 1',
      maxPlayers: 9,
      smallBlind: 1,
      bigBlind: 2,
      minBuyIn: 20,
      maxBuyIn: 200,
      status: 'active'
    };
  }
  
  getSeatPosition(seatNumber) {
    const positionMap = {
      1: 'SB',
      2: 'BB', 
      3: 'UTG',
      4: 'CO',
      5: 'BTN'
    };
    return positionMap[seatNumber] || `SEAT${seatNumber}`;
  }
  
  getInitialHistory() {
    // Start with blinds - IDs 1 and 2
    return [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 1,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: new Date().toISOString()
      },
      {
        id: 'GH-2', 
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 2,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: new Date().toISOString()
      }
    ];
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(`🔄 Mock API: ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // Progressive Game History - Main API for UI tests
    this.app.get('/api/test/progressive-game-history/:tableId', (req, res) => {
      const { tableId } = req.params;
      const phase = this.gameState.currentPhase;
      
      console.log(`📊 Serving progressive game history for table ${tableId}, phase: ${phase}`);
      console.log(`📈 Current action count: ${this.gameState.gameHistory.length}`);
      
      res.json({
        success: true,
        actionHistory: [...this.gameState.gameHistory], // Return copy
        currentPhase: phase,
        actionCount: this.gameState.gameHistory.length
      });
    });
    
    // Set Game Phase - Used by test steps to progress the game
    this.app.post('/api/test/set-game-phase', (req, res) => {
      const { phase } = req.body;
      const oldPhase = this.gameState.currentPhase;
      this.gameState.currentPhase = phase;
      
      // Add actions based on phase progression
      this.addActionsForPhase(phase);
      
      console.log(`🎮 Phase updated: ${oldPhase} → ${phase}`);
      console.log(`📈 Action history now has ${this.gameState.gameHistory.length} records`);
      
      // Notify all connected clients
      this.io.emit('phaseUpdated', {
        oldPhase,
        newPhase: phase,
        actionHistory: this.gameState.gameHistory
      });
      
      res.json({
        success: true,
        oldPhase,
        newPhase: phase,
        actionCount: this.gameState.gameHistory.length
      });
    });
    
    // Reset Database - For test compatibility
    this.app.post('/api/test/reset-database', (req, res) => {
      console.log('🧹 Resetting mock database state...');
      this.gameState.currentPhase = 'setup';
      this.gameState.actionCounter = 2;
      this.gameState.gameHistory = this.getInitialHistory();
      this.gameState.players = this.createMockPlayers();
      
      res.json({
        success: true,
        message: 'Database reset successfully',
        tables: [this.gameState.table]
      });
    });
    
    // Reset Game State - For test cleanup
    this.app.post('/api/test/reset-game-state', (req, res) => {
      console.log('🔄 Resetting mock game state...');
      this.gameState.currentPhase = 'setup';
      this.gameState.actionCounter = 2;
      this.gameState.gameHistory = this.getInitialHistory();
      
      res.json({
        success: true,
        message: 'Game state reset successfully'
      });
    });
    
    // Get Mock Game State - For debugging
    this.app.get('/api/test/game-state', (req, res) => {
      res.json({
        success: true,
        gameState: this.gameState
      });
    });
    
    // Update Player Chips - For tournament progression
    this.app.post('/api/test/update-player-chips', (req, res) => {
      const { playerId, chips } = req.body;
      
      const player = this.gameState.players.find(p => p.id === playerId || p.nickname === playerId);
      if (player) {
        const oldChips = player.chips;
        player.chips = parseInt(chips);
        console.log(`💰 Updated ${player.nickname} chips: $${oldChips} → $${player.chips}`);
        
        // Notify all connected clients
        this.io.emit('playerChipsUpdated', {
          playerId: player.id,
          nickname: player.nickname,
          oldChips,
          newChips: player.chips
        });
        
        res.json({
          success: true,
          playerId: player.id,
          nickname: player.nickname,
          oldChips,
          newChips: player.chips
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Player ${playerId} not found`
        });
      }
    });
    
    // Get Player Chips - For verification
    this.app.get('/api/test/player-chips/:playerId', (req, res) => {
      const { playerId } = req.params;
      
      const player = this.gameState.players.find(p => p.id === playerId || p.nickname === playerId);
      if (player) {
        res.json({
          success: true,
          playerId: player.id,
          nickname: player.nickname,
          chips: player.chips
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Player ${playerId} not found`
        });
      }
    });
    
    // Auto-seat API - For test player seating
    this.app.post('/api/test/auto-seat', (req, res) => {
      const { tableId, playerName, seatNumber, buyIn } = req.body;
      console.log(`🪑 Auto-seating ${playerName} at table ${tableId}, seat ${seatNumber} with $${buyIn}`);
      
      // Find or create player
      let player = this.gameState.players.find(p => p.name === playerName || p.nickname === playerName);
      if (!player) {
        // Create new player
        player = {
          id: playerName,
          name: playerName,
          nickname: playerName,
          seatNumber: seatNumber,
          chips: buyIn || 100,
          isActive: true,
          position: this.getSeatPosition(seatNumber)
        };
        this.gameState.players.push(player);
      } else {
        // Update existing player
        player.seatNumber = seatNumber;
        player.chips = buyIn || player.chips || 100;
        player.isActive = true;
        player.position = this.getSeatPosition(seatNumber);
      }
      
      res.json({
        success: true,
        message: `${playerName} seated successfully`,
        player: player,
        tableId: tableId
      });
    });
    
    // Start Game API - For test game initiation
    this.app.post('/api/test/start-game', (req, res) => {
      console.log('🎮 Starting mock game...');
      this.gameState.currentPhase = 'tournament';
      
      res.json({
        success: true,
        message: 'Game started successfully',
        phase: this.gameState.currentPhase,
        players: this.gameState.players.length
      });
    });
    
    // Tables API - Required by hooks.js server check
    this.app.get('/api/tables', (req, res) => {
      res.json({
        success: true,
        tables: [this.gameState.table],
        timestamp: new Date().toISOString()
      });
    });
    
    // Progressive Game State APIs for Dynamic Testing
    
    // Community Cards API - Progressive card reveals
    this.app.get('/api/test/community-cards', (req, res) => {
      const cards = this.getProgressiveCommunityCards();
      res.json({
        success: true,
        communityCards: cards,
        phase: this.gameState.currentPhase,
        count: cards.length
      });
    });
    
    // Pot Amount API - Progressive pot tracking
    this.app.get('/api/test/pot-amount', (req, res) => {
      const potAmount = this.getProgressivePotAmount();
      res.json({
        success: true,
        potAmount,
        formatted: `$${potAmount}`,
        phase: this.gameState.currentPhase
      });
    });
    
    // Tournament Status API - Progressive tournament state
    this.app.get('/api/test/tournament-status', (req, res) => {
      const status = this.getProgressiveTournamentStatus();
      res.json({
        success: true,
        ...status
      });
    });
    
    // Advance Game State API - For test progression
    this.app.post('/api/test/advance-game-state', (req, res) => {
      const { action, playerId, amount } = req.body;
      this.advanceGameState(action, playerId, amount);
      
      res.json({
        success: true,
        gameState: this.getProgressiveGameState(),
        message: `Advanced game state with ${action}`
      });
    });
    
    // Health Check
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Mock backend server is running',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  addActionsForPhase(phase) {
    const actions = this.getActionsForPhase(phase);
    
    // Add new actions that aren't already in history
    actions.forEach(action => {
      if (!this.gameState.gameHistory.find(h => h.id === action.id)) {
        this.gameState.gameHistory.push(action);
        console.log(`➕ Added action ${action.id}: ${action.playerName} ${action.action}`);
      }
    });
    
    console.log(`📊 Total actions after ${phase}: ${this.gameState.gameHistory.length}`);
  }
  
  getActionsForPhase(phase) {
    const allActions = {
      'setup': [], // Blinds already in initial history
      
      'preflop_betting': [
        // GH-3: Player3 folds
        {
          id: 'GH-3',
          playerId: 'Player3',
          playerName: 'Player3',
          action: 'FOLD',
          amount: null,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 3,
          timestamp: new Date().toISOString()
        },
        // GH-4: Player4 raises to $8
        {
          id: 'GH-4',
          playerId: 'Player4', 
          playerName: 'Player4',
          action: 'RAISE',
          amount: 8,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 4,
          timestamp: new Date().toISOString()
        },
        // GH-5: Player5 3-bets to $24
        {
          id: 'GH-5',
          playerId: 'Player5',
          playerName: 'Player5', 
          action: 'RAISE',
          amount: 24,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 5,
          timestamp: new Date().toISOString()
        },
        // GH-6: Player1 folds
        {
          id: 'GH-6',
          playerId: 'Player1',
          playerName: 'Player1',
          action: 'FOLD',
          amount: null,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 6,
          timestamp: new Date().toISOString()
        },
        // GH-7: Player2 calls $22 more
        {
          id: 'GH-7',
          playerId: 'Player2',
          playerName: 'Player2',
          action: 'CALL',
          amount: 22,
          phase: 'preflop', 
          handNumber: 1,
          actionSequence: 7,
          timestamp: new Date().toISOString()
        },
        // GH-8: Player4 4-bets to $60
        {
          id: 'GH-8',
          playerId: 'Player4',
          playerName: 'Player4',
          action: 'RAISE',
          amount: 60,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 8,
          timestamp: new Date().toISOString()
        },
        // GH-9: Player5 folds to 4-bet
        {
          id: 'GH-9',
          playerId: 'Player5',
          playerName: 'Player5',
          action: 'FOLD',
          amount: null,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 9,
          timestamp: new Date().toISOString()
        },
        // GH-10: Player2 goes all-in $76
        {
          id: 'GH-10',
          playerId: 'Player2',
          playerName: 'Player2',
          action: 'ALL_IN',
          amount: 76,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 10,
          timestamp: new Date().toISOString()
        },
        // GH-11: Player4 calls all-in $40
        {
          id: 'GH-11',
          playerId: 'Player4',
          playerName: 'Player4',
          action: 'CALL',
          amount: 40,
          phase: 'preflop',
          handNumber: 1,
          actionSequence: 11,
          timestamp: new Date().toISOString()
        }
      ],
      
      'flop_revealed': [
        // GH-12: Flop dealt A♣ 10♠ 7♥
        {
          id: 'GH-12',
          playerId: 'SYSTEM',
          playerName: 'Dealer',
          action: 'FLOP',
          amount: null,
          phase: 'flop',
          handNumber: 1,
          actionSequence: 12,
          timestamp: new Date().toISOString(),
          cards: ['A♣', '10♠', '7♥']
        }
      ],
      
      'turn_revealed': [
        // GH-13: Turn dealt K♣
        {
          id: 'GH-13', 
          playerId: 'SYSTEM',
          playerName: 'Dealer',
          action: 'TURN',
          amount: null,
          phase: 'turn',
          handNumber: 1,
          actionSequence: 13,
          timestamp: new Date().toISOString(),
          cards: ['K♣']
        }
      ],
      
      'river_revealed': [
        // GH-14: River dealt 8♦
        {
          id: 'GH-14',
          playerId: 'SYSTEM',
          playerName: 'Dealer', 
          action: 'RIVER',
          amount: null,
          phase: 'river',
          handNumber: 1,
          actionSequence: 14,
          timestamp: new Date().toISOString(),
          cards: ['8♦']
        }
      ],
      
      'showdown_begin': [
        // GH-15: Showdown begins
        {
          id: 'GH-15',
          playerId: 'SYSTEM',
          playerName: 'Dealer',
          action: 'SHOWDOWN',
          amount: null,
          phase: 'showdown',
          handNumber: 1,
          actionSequence: 15,
          timestamp: new Date().toISOString()
        }
      ],
      
      'showdown_reveals': [
        // GH-16: Hand reveals
        {
          id: 'GH-16',
          playerId: 'SYSTEM',
          playerName: 'Dealer',
          action: 'HAND_REVEALS',
          amount: null,
          phase: 'showdown',
          handNumber: 1,
          actionSequence: 16,
          timestamp: new Date().toISOString(),
          reveals: [
            { playerId: 'Player2', cards: ['Q♥', 'J♥'], hand: 'straight' },
            { playerId: 'Player4', cards: ['10♦', '10♣'], hand: 'set of tens' }
          ]
        }
      ],
      
      'showdown_complete': [
        // GH-17: Winner declaration
        {
          id: 'GH-17',
          playerId: 'Player2',
          playerName: 'Player2',
          action: 'WINNER', 
          amount: 185,
          phase: 'showdown',
          handNumber: 1,
          actionSequence: 17,
          timestamp: new Date().toISOString(),
          winningHand: 'straight'
        }
      ]
    };
    
    // Return cumulative actions up to current phase
    const phaseOrder = [
      'setup', 'preflop_betting', 'flop_revealed', 'turn_revealed', 
      'river_revealed', 'showdown_begin', 'showdown_reveals', 'showdown_complete'
    ];
    
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex === -1) return [];
    
    let cumulativeActions = [];
    for (let i = 0; i <= currentIndex; i++) {
      const phaseActions = allActions[phaseOrder[i]] || [];
      cumulativeActions = cumulativeActions.concat(phaseActions);
    }
    
    return cumulativeActions;
  }
  
  // Progressive State Management Methods
  
  getProgressiveCommunityCards() {
    const phase = this.gameState.currentPhase;
    const cards = [];
    
    // Progressive card reveals based on game phase
    if (phase === 'flop_revealed' || phase === 'turn_revealed' || phase === 'river_revealed' || 
        phase === 'showdown_begin' || phase === 'showdown_reveals' || phase === 'showdown_complete') {
      cards.push('A♣', '8♠', '5♥'); // Flop cards
    }
    
    if (phase === 'turn_revealed' || phase === 'river_revealed' || 
        phase === 'showdown_begin' || phase === 'showdown_reveals' || phase === 'showdown_complete') {
      cards.push('K♦'); // Turn card
    }
    
    if (phase === 'river_revealed' || 
        phase === 'showdown_begin' || phase === 'showdown_reveals' || phase === 'showdown_complete') {
      cards.push('9♣'); // River card
    }
    
    return cards;
  }
  
  getProgressivePotAmount() {
    const phase = this.gameState.currentPhase;
    
    // Progressive pot amounts based on betting actions
    switch (phase) {
      case 'setup': return 15; // Small + Big blind
      case 'preflop_betting': return 215; // After all-in and calls
      case 'flop_revealed': return 215;
      case 'turn_revealed': return 215;
      case 'river_revealed': return 215;
      case 'showdown_begin': return 215;
      case 'showdown_reveals': return 215;
      case 'showdown_complete': return 0; // Awarded to winner
      default: return 15;
    }
  }
  
  getProgressiveTournamentStatus() {
    const phase = this.gameState.currentPhase;
    
    // Progressive tournament state
    const baseStatus = {
      round: 1,
      blinds: { small: 5, big: 10 },
      playersRemaining: 5,
      eliminatedPlayers: [],
      totalChips: 500
    };
    
    // Update based on phase progression
    if (phase === 'showdown_complete') {
      baseStatus.playersRemaining = 4;
      baseStatus.eliminatedPlayers = ['Player3'];
    }
    
    return baseStatus;
  }
  
  getProgressiveGameState() {
    return {
      phase: this.gameState.currentPhase,
      communityCards: this.getProgressiveCommunityCards(),
      pot: this.getProgressivePotAmount(),
      tournament: this.getProgressiveTournamentStatus(),
      players: this.getProgressivePlayerStates()
    };
  }
  
  getProgressivePlayerStates() {
    const phase = this.gameState.currentPhase;
    
    // Progressive player chip stacks based on actions
    const baseStacks = {
      'Player1': { chips: 95, status: 'folded' },   // Lost $5 blind
      'Player2': { chips: 90, status: 'folded' },   // Lost $10 blind  
      'Player3': { chips: 0, status: 'all-in' },    // All-in with $100
      'Player4': { chips: 0, status: 'all-in' },    // Called all-in with $100
      'Player5': { chips: 100, status: 'folded' }   // Folded, no loss
    };
    
    // Post-showdown updates
    if (phase === 'showdown_complete') {
      baseStacks['Player4'] = { chips: 215, status: 'active' }; // Winner
      baseStacks['Player3'] = { chips: 0, status: 'eliminated' }; // Eliminated
    }
    
    return baseStacks;
  }
  
  advanceGameState(action, playerId, amount) {
    // Dynamic state advancement based on test actions
    console.log(`🎮 Advancing game state: ${action} by ${playerId} for $${amount || 0}`);
    
    // Update player chips dynamically
    if (playerId && amount && this.gameState.players) {
      const player = this.gameState.players.find(p => p.id === playerId || p.nickname === playerId);
      if (player) {
        const oldChips = player.chips;
        player.chips = Math.max(0, player.chips - (amount || 0));
        console.log(`💰 Dynamic update: ${playerId} chips ${oldChips} → ${player.chips}`);
      }
    }
    
    // Emit state change to connected clients
    this.io.emit('gameStateAdvanced', {
      action,
      playerId,
      amount,
      newState: this.getProgressiveGameState()
    });
  }
  
  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Mock WebSocket: Client connected (${socket.id})`);
      
      socket.on('disconnect', () => {
        console.log(`🔌 Mock WebSocket: Client disconnected (${socket.id})`);
      });
      
      // Send initial game state
      socket.emit('gameState', {
        id: '1',
        players: this.gameState.players,
        communityCards: [],
        pot: 3,
        currentPlayerId: 'Player3', // UTG to act first
        status: 'active',
        phase: 'preflop'
      });
    });
  }
  
  start(port = 3001) {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`🚀 Mock Backend Server running on port ${port}`);
        console.log(`📊 Game History API: http://localhost:${port}/api/test/progressive-game-history/1`);
        console.log(`🎮 Set Phase API: http://localhost:${port}/api/test/set-game-phase`);
        console.log(`❤️ Health Check: http://localhost:${port}/api/health`);
        resolve();
      });
    });
  }
  
  stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🛑 Mock Backend Server stopped');
        resolve();
      });
    });
  }
  
  // =============================================================================
  // TEST UTILITIES - Merged from testUtils.js
  // =============================================================================
  
  /**
   * Update game phase via API - triggers progressive history
   */
  async updateTestPhase(phase) {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/test/set-game-phase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phase })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update phase: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`🎮 Test phase updated: ${result.oldPhase} → ${result.newPhase} (${result.actionCount} actions)`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to update test phase:', error);
      throw error;
    }
  }
  
  /**
   * Reset game state for fresh test
   */
  async resetGameState() {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/test/reset-game-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset game state: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Game state reset successfully');
      
      return result;
    } catch (error) {
      console.error('❌ Failed to reset game state:', error);
      throw error;
    }
  }
  
  /**
   * Get current game state for debugging
   */
  async getGameStateAPI() {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/test/game-state');
      
      if (!response.ok) {
        throw new Error(`Failed to get game state: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.gameState;
    } catch (error) {
      console.error('❌ Failed to get game state:', error);
      throw error;
    }
  }
  
  /**
   * Verify mock server is healthy
   */
  async checkHealth() {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Mock server health check passed');
      return result;
    } catch (error) {
      console.error('❌ Mock server health check failed:', error);
      throw error;
    }
  }
  
  /**
   * Wait for ActionHistory component to load data in UI
   */
  async waitForActionHistoryLoad(driver, expectedCount, maxWaitTime = 15000) {
    console.log(`⏳ Waiting for ActionHistory to show ${expectedCount} actions...`);
    
    const startTime = Date.now();
    let found = false;
    
    while (!found && (Date.now() - startTime) < maxWaitTime) {
      try {
        // Look for game history container
        const historySelectors = [
          '[data-testid="game-history"]',
          '.game-history',
          '*[class*="game"][class*="history"]'
        ];
        
        for (const selector of historySelectors) {
          try {
            const elements = await driver.findElements({ css: selector });
            if (elements.length > 0) {
              const historyText = await elements[0].getText();
              
              // Count GH- IDs in the DOM text
              const ghMatches = (historyText.match(/GH-\d+/g) || []).length;
              
              console.log(`📊 Found ${ghMatches}/${expectedCount} action records in DOM`);
              
              if (ghMatches >= expectedCount) {
                found = true;
                console.log(`✅ ActionHistory loaded with ${ghMatches} actions`);
                return true;
              }
              break;
            }
          } catch (selectorError) {
            // Continue with next selector
          }
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`⚠️ Error checking ActionHistory: ${error.message}`);
      }
    }
    
    if (!found) {
      console.log(`⚠️ Timeout waiting for ${expectedCount} actions in ActionHistory`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Progressive phase mapping for test scenarios
   */
  static getPhaseProgression() {
    return [
      { phase: 'setup', description: 'Blinds posted', expectedActions: 2 },
      { phase: 'preflop_betting', description: 'Pre-flop actions complete', expectedActions: 11 },
      { phase: 'flop_revealed', description: 'Flop dealt', expectedActions: 12 },
      { phase: 'turn_revealed', description: 'Turn dealt', expectedActions: 13 },
      { phase: 'river_revealed', description: 'River dealt', expectedActions: 14 },
      { phase: 'showdown_begin', description: 'Showdown begins', expectedActions: 15 },
      { phase: 'showdown_reveals', description: 'Hand reveals', expectedActions: 16 },
      { phase: 'showdown_complete', description: 'Winner declared', expectedActions: 17 }
    ];
  }
}

// Global test utils instance for backward compatibility
const testUtils = new MockBackendServer();

module.exports = {
  MockBackendServer,
  TestUtils: MockBackendServer, // Alias for backward compatibility
  testUtils
};

// Start server if run directly
if (require.main === module) {
  const server = new MockBackendServer();
  server.start(3001);
}