/**
 * Fixed Mock Backend Server for UI Testing
 * 
 * Uses completely fixed dummy data with predetermined game progression
 * and fixed timestamps for consistent testing results.
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { 
  TOURNAMENT_GAME_DATA, 
  getPlayerStateAtStep, 
  getActivePlayersAtStep,
  getGameHistoryAtStep,
  getAllGameSteps 
} = require('./fixedGameProgressData');

class FixedMockBackendServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Fixed game state - tracks current step in predefined progression
    this.currentGameStep = 'initial_setup';
    this.stepSequence = [
      'initial_setup',
      'r1_blinds_posted',
      'r1_player3_allin',
      'r1_player4_calls', 
      'r1_others_fold',
      'r1_flop',
      'r1_turn',
      'r1_river_player3_eliminated',
      'r2_setup',
      'r2_blinds_posted',
      'r2_player1_allin',
      'r2_player2_calls',
      'r2_others_fold', 
      'r2_flop',
      'r2_turn',
      'r2_river_player1_eliminated',
      'r3_setup',
      'r3_blinds_posted',
      'r3_player2_raises',
      'r3_all_call_championship',
      'championship_complete'
    ];
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }
  
  // Get current game state based on current step
  getCurrentGameState() {
    return TOURNAMENT_GAME_DATA[this.currentGameStep] || TOURNAMENT_GAME_DATA.initial_setup;
  }
  
  // Advance to next game step
  advanceToNextStep() {
    const currentIndex = this.stepSequence.indexOf(this.currentGameStep);
    if (currentIndex >= 0 && currentIndex < this.stepSequence.length - 1) {
      this.currentGameStep = this.stepSequence[currentIndex + 1];
      console.log(`🎮 Advanced to step: ${this.currentGameStep}`);
      return true;
    }
    return false;
  }
  
  // Set specific game step (for test control)
  setGameStep(step) {
    if (this.stepSequence.includes(step)) {
      this.currentGameStep = step;
      console.log(`🎯 Set game step to: ${step}`);
      return true;
    }
    return false;
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(`🔄 Fixed Mock API: ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // Progressive Game History - Returns fixed data for current step
    this.app.get('/api/test/progressive-game-history/:tableId', (req, res) => {
      const { tableId } = req.params;
      const currentState = this.getCurrentGameState();
      
      console.log(`📊 Serving fixed game history for table ${tableId}`);
      console.log(`📈 Current step: ${this.currentGameStep}`);
      console.log(`📈 Action count: ${currentState.gameHistory.length}`);
      
      res.json({
        success: true,
        actionHistory: [...currentState.gameHistory], // Return copy
        currentPhase: currentState.phase,
        actionCount: currentState.gameHistory.length,
        currentStep: this.currentGameStep,
        pot: currentState.pot,
        blinds: currentState.blinds,
        activePlayerCount: currentState.activePlayerCount,
        communityCards: currentState.communityCards || []
      });
    });
    
    // Set Game Phase - Advance to specific step in progression
    this.app.post('/api/test/set-game-phase', (req, res) => {
      const { phase, step } = req.body;
      const oldStep = this.currentGameStep;
      
      let success = false;
      let newStep = this.currentGameStep;
      
      if (step) {
        // Set specific step
        success = this.setGameStep(step);
        newStep = step;
      } else if (phase) {
        // Find step matching phase
        const matchingStep = this.stepSequence.find(s => 
          TOURNAMENT_GAME_DATA[s] && TOURNAMENT_GAME_DATA[s].phase === phase
        );
        if (matchingStep) {
          success = this.setGameStep(matchingStep);
          newStep = matchingStep;
        }
      } else {
        // Advance to next step
        success = this.advanceToNextStep();
        newStep = this.currentGameStep;
      }
      
      if (success) {
        const currentState = this.getCurrentGameState();
        
        console.log(`🎮 Step updated: ${oldStep} → ${newStep}`);
        console.log(`📈 Phase: ${currentState.phase}`);
        console.log(`📈 Action history now has ${currentState.gameHistory.length} records`);
        
        // Notify all connected clients
        this.io.emit('gameStepUpdated', {
          oldStep,
          newStep,
          phase: currentState.phase,
          actionHistory: currentState.gameHistory,
          players: currentState.players,
          pot: currentState.pot,
          blinds: currentState.blinds
        });
        
        res.json({
          success: true,
          oldStep,
          newStep,
          phase: currentState.phase,
          actionCount: currentState.gameHistory.length,
          pot: currentState.pot,
          blinds: currentState.blinds
        });
      } else {
        res.status(400).json({
          success: false,
          error: `Cannot advance from step ${oldStep}`,
          currentStep: this.currentGameStep
        });
      }
    });
    
    // Reset Database - Reset to initial setup
    this.app.post('/api/test/reset-database', (req, res) => {
      console.log('🧹 Resetting fixed mock database to initial setup...');
      this.currentGameStep = 'initial_setup';
      
      res.json({
        success: true,
        message: 'Database reset successfully',
        currentStep: this.currentGameStep,
        tables: [{ id: 1, name: 'Table 1', maxPlayers: 9 }]
      });
    });
    
    // Reset Game State - Reset to initial setup
    this.app.post('/api/test/reset-game-state', (req, res) => {
      console.log('🔄 Resetting fixed mock game state...');
      this.currentGameStep = 'initial_setup';
      
      res.json({
        success: true,
        message: 'Game state reset successfully',
        currentStep: this.currentGameStep
      });
    });
    
    // Get Mock Game State - Return current fixed state
    this.app.get('/api/test/game-state', (req, res) => {
      const currentState = this.getCurrentGameState();
      
      res.json({
        success: true,
        currentStep: this.currentGameStep,
        gameState: currentState
      });
    });
    
    // Get Player State - Return specific player data at current step
    this.app.get('/api/test/player-state/:playerId', (req, res) => {
      const { playerId } = req.params;
      const playerState = getPlayerStateAtStep(this.currentGameStep, playerId);
      
      if (playerState) {
        res.json({
          success: true,
          playerId,
          currentStep: this.currentGameStep,
          playerState
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Player ${playerId} not found at step ${this.currentGameStep}`
        });
      }
    });
    
    // Get Player Chips - Return fixed chip count for current step
    this.app.get('/api/test/player-chips/:playerId', (req, res) => {
      const { playerId } = req.params;
      const playerState = getPlayerStateAtStep(this.currentGameStep, playerId);
      
      if (playerState) {
        res.json({
          success: true,
          playerId,
          nickname: playerState.id,
          chips: playerState.chips,
          currentStep: this.currentGameStep,
          isEliminated: playerState.isEliminated || false,
          eliminated_round: playerState.eliminated_round || null
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Player ${playerId} not found`
        });
      }
    });
    
    // Auto-seat API - Uses fixed player data
    this.app.post('/api/test/auto-seat', (req, res) => {
      const { tableId, playerName, seatNumber, buyIn } = req.body;
      console.log(`🪑 Fixed auto-seating ${playerName} at table ${tableId}, seat ${seatNumber}`);
      
      const currentState = this.getCurrentGameState();
      const player = currentState.players[playerName];
      
      if (player) {
        res.json({
          success: true,
          message: `${playerName} seated successfully at table ${tableId}`,
          tableId,
          playerId: player.id,
          playerName: player.id,
          seatNumber: player.seat,
          chips: player.chips,
          position: player.position
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Player ${playerName} not found in fixed data`
        });
      }
    });
    
    // Tables API - Required by hooks.js server check
    this.app.get('/api/tables', (req, res) => {
      res.json({
        success: true,
        tables: [{ id: 1, name: 'Table 1', maxPlayers: 9, status: 'active' }],
        timestamp: '2025-09-10T15:30:00.000Z' // Fixed timestamp
      });
    });
    
    // Game Step Control - For test navigation
    this.app.post('/api/test/advance-step', (req, res) => {
      const oldStep = this.currentGameStep;
      const success = this.advanceToNextStep();
      
      if (success) {
        const currentState = this.getCurrentGameState();
        res.json({
          success: true,
          oldStep,
          newStep: this.currentGameStep,
          phase: currentState.phase
        });
      } else {
        res.json({
          success: false,
          message: 'Already at final step',
          currentStep: this.currentGameStep
        });
      }
    });
    
    // Get Available Steps - For debugging
    this.app.get('/api/test/available-steps', (req, res) => {
      res.json({
        success: true,
        currentStep: this.currentGameStep,
        availableSteps: this.stepSequence,
        currentIndex: this.stepSequence.indexOf(this.currentGameStep)
      });
    });
    
    // Health Check
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Fixed mock backend server is running',
        currentStep: this.currentGameStep,
        timestamp: '2025-09-10T15:30:00.000Z' // Fixed timestamp
      });
    });
  }
  
  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      
      // Send current game state on connection
      const currentState = this.getCurrentGameState();
      socket.emit('gameStateUpdate', {
        currentStep: this.currentGameStep,
        gameState: currentState
      });
      
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
      
      // Handle step advance requests
      socket.on('advanceStep', () => {
        const oldStep = this.currentGameStep;
        if (this.advanceToNextStep()) {
          const currentState = this.getCurrentGameState();
          this.io.emit('gameStepUpdated', {
            oldStep,
            newStep: this.currentGameStep,
            phase: currentState.phase,
            actionHistory: currentState.gameHistory,
            players: currentState.players
          });
        }
      });
    });
  }
  
  async start(port = 3001) {
    return new Promise((resolve, reject) => {
      this.server.listen(port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🚀 Fixed Mock Backend Server running on http://localhost:${port}`);
          console.log(`📊 Current step: ${this.currentGameStep}`);
          console.log(`🎮 Available steps: ${this.stepSequence.length}`);
          resolve();
        }
      });
    });
  }
  
  async stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🛑 Fixed Mock Backend Server stopped');
        resolve();
      });
    });
  }
}

module.exports = { FixedMockBackendServer };