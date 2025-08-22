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
}

module.exports = MockBackendServer;