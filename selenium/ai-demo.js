const { UIAIPlayer } = require('./ai-players/uiAIPlayer');

// Game Manager to track full game cycles
class PokerGameManager {
  constructor() {
    this.gameCount = 0;
    this.currentGameStartTime = null;
    this.totalGamesPlayed = 0;
    this.actionDelayMs = 15000; // 15 seconds between actions
  }

  startNewGame() {
    this.gameCount++;
    this.currentGameStartTime = new Date();
    
    console.log('\n' + '='.repeat(80));
    console.log(`🎮 STARTING GAME #${this.gameCount}`);
    console.log(`🕐 Game Start Time: ${this.currentGameStartTime.toLocaleTimeString()}`);
    console.log(`📊 Total Games Played: ${this.totalGamesPlayed}`);
    console.log(`⏱️  Action Interval: ${this.actionDelayMs / 1000} seconds`);
    console.log('='.repeat(80) + '\n');
  }

  endGame() {
    this.totalGamesPlayed++;
    const gameEndTime = new Date();
    const gameDuration = Math.round((gameEndTime - this.currentGameStartTime) / 1000);
    
    console.log('\n' + '='.repeat(80));
    console.log(`🏁 GAME #${this.gameCount} COMPLETED!`);
    console.log(`⏱️  Game Duration: ${Math.floor(gameDuration / 60)}m ${gameDuration % 60}s`);
    console.log(`🕐 Game End Time: ${gameEndTime.toLocaleTimeString()}`);
    console.log(`📈 Games Completed: ${this.totalGamesPlayed}`);
    console.log('='.repeat(80) + '\n');
    
    // 15-second break between games
    console.log('⏳ 15-second break before next game...\n');
  }

  getGameStatus() {
    return {
      currentGame: this.gameCount,
      totalCompleted: this.totalGamesPlayed,
      actionDelay: this.actionDelayMs
    };
  }
}

// Enhanced AI Player with timed actions
class TimedUIAIPlayer extends UIAIPlayer {
  constructor(config, gameManager) {
    super(config);
    this.gameManager = gameManager;
    this.lastGameState = null;
    this.gamePhaseDetection = {
      lastPhase: 'waiting',
      handNumber: 0
    };
  }

  async makeDecisionWithTimeout() {
    // Detect new game start
    await this.detectNewGameStart();
    
    console.log(`🤖 ${this.config.name}: Waiting ${this.gameManager.actionDelayMs / 1000}s before action (Game #${this.gameManager.gameCount})`);
    
    // Wait 15 seconds before making decision
    await this.delay(this.gameManager.actionDelayMs);
    
    // Call original decision making logic
    return super.makeDecisionWithTimeout();
  }

  async detectNewGameStart() {
    try {
      // Read current game phase
      const gamePhaseElement = await this.driver.findElement(
        By.css('[data-testid="game-phase"], .game-phase, .game-status')
      ).catch(() => null);
      
      if (gamePhaseElement) {
        const currentPhase = await gamePhaseElement.getText().catch(() => 'unknown');
        
        // Detect new hand start (going from 'finished' or 'waiting' to 'preflop')
        if (this.gamePhaseDetection.lastPhase === 'finished' && 
            (currentPhase.toLowerCase().includes('preflop') || currentPhase.toLowerCase().includes('dealing'))) {
          
          this.gamePhaseDetection.handNumber++;
          console.log(`🆕 ${this.config.name}: Detected new hand #${this.gamePhaseDetection.handNumber} starting!`);
          
          // If this is the first hand of a new session, start new game
          if (this.gamePhaseDetection.handNumber === 1) {
            this.gameManager.startNewGame();
          }
        }
        
        // Detect game end (showdown completed)
        if (currentPhase.toLowerCase().includes('showdown') && 
            this.gamePhaseDetection.lastPhase !== 'showdown') {
          console.log(`🏁 ${this.config.name}: Detected game ending (showdown phase)`);
          
          // Wait for results to be displayed
          setTimeout(() => {
            this.gameManager.endGame();
          }, 3000);
        }
        
        this.gamePhaseDetection.lastPhase = currentPhase.toLowerCase();
      }
    } catch (error) {
      // Game phase detection is optional
    }
  }

  async startGameLoop() {
    console.log(`🎮 AI ${this.config.name} starting TIMED game loop with ${this.gameManager.actionDelayMs / 1000}s intervals...`);
    
    let loopCount = 0;
    const maxLoops = 999999;
    
    while (this.isPlaying && loopCount < maxLoops) {
      try {
        loopCount++;
        
        // Status update every 5 minutes
        if (loopCount % 300 === 0 && loopCount > 0) {
          const status = this.gameManager.getGameStatus();
          console.log(`📊 AI ${this.config.name} Status: ${Math.floor(loopCount/60)}min connected | Game #${status.currentGame} | ${status.totalCompleted} completed`);
          await this.checkConnectionHealth();
        }
        
        // Seat verification every 30 seconds
        if (loopCount % 30 === 0 && loopCount > 0) {
          await this.verifySeatStatus();
        }
        
        // Update game state
        await this.readGameState();
        
        // Check for turn with timed decisions
        const currentTime = Date.now();
        if (await this.isMyTurn()) {
          if (currentTime - this.lastTurnDetection < this.turnCooldownMs) {
            const waitTime = Math.round((this.turnCooldownMs - (currentTime - this.lastTurnDetection))/1000);
            console.log(`⏳ AI ${this.config.name} turn cooldown: ${waitTime}s remaining`);
          } else {
            console.log(`🎯 AI ${this.config.name} turn detected - starting timed decision process...`);
            this.lastTurnDetection = currentTime;
            await this.makeDecisionWithTimeout();
            this.lastActionTime = Date.now();
          }
        }
        
        await this.delay(1000);
        
      } catch (error) {
        console.log(`⚠️ Game loop error for ${this.config.name}: ${error.message}`);
        
        if (error.message.includes('disconnect') || error.message.includes('connection')) {
          await this.attemptConnectionRecovery();
        }
        
        await this.delay(3000);
      }
    }
  }
}

async function runUIAIDemo() {
  console.log('🎰 Starting ENHANCED UI-Based AI Poker Demo');
  console.log('🚀 Features: Full game cycles, 15s action intervals, game counting');
  console.log('⏱️  Each AI will wait 15 seconds between actions\n');

  const gameManager = new PokerGameManager();
  const aiPlayers = [];

  try {
    // Create 4 AI players with game manager
    const playerConfigs = [
      {
        name: 'player1',
        personality: 'aggressive',
        reactionTime: 1500,
        aggressionFactor: 0.8,
        bluffFrequency: 0.4
      },
      {
        name: 'player2',
        personality: 'conservative',
        reactionTime: 3000,
        aggressionFactor: 0.2,
        bluffFrequency: 0.1
      },
      {
        name: 'player3',
        personality: 'bluffer',
        reactionTime: 2000,
        aggressionFactor: 0.6,
        bluffFrequency: 0.7
      },
      {
        name: 'player4',
        personality: 'balanced',
        reactionTime: 2500,
        aggressionFactor: 0.5,
        bluffFrequency: 0.3
      }
    ];

    // Initialize each AI player with timed behavior
    for (let i = 0; i < playerConfigs.length; i++) {
      console.log(`🤖 Initializing ${playerConfigs[i].name} with timed actions...`);
      const aiPlayer = new TimedUIAIPlayer(playerConfigs[i], gameManager);
      await aiPlayer.initialize();
      aiPlayers.push(aiPlayer);
      
      setTimeout(() => {
        console.log(`🚀 Starting ${playerConfigs[i].name} join process...`);
        aiPlayer.joinGame(1);
      }, i * 8000);
    }

    console.log('\n🎮 Enhanced AI Demo Features:');
    console.log('   ⏱️  15-second intervals between actions');
    console.log('   🎯 Automatic game counting and status');
    console.log('   📊 Game duration tracking');
    console.log('   🔄 Continuous full game cycles');
    console.log('   🎪 Different AI personalities:');
    console.log('      - player1: Aggressive (raises frequently)');
    console.log('      - player2: Conservative (tight play)');
    console.log('      - player3: Bluffer (unpredictable)');
    console.log('      - player4: Balanced (mixed strategy)');
    
    // Start the first game
    setTimeout(() => {
      gameManager.startNewGame();
    }, 30000); // Give players time to join
    
    console.log('\n🔄 Demo will run indefinitely with full game cycles...\n');

    // Run indefinitely until manually stopped
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Enhanced Demo error:', error);
  } finally {
    console.log('\n🛑 Demo stopping, disconnecting AI players...');
    for (const player of aiPlayers) {
      try {
        await player.disconnect();
      } catch (e) {
        console.log(`⚠️ Error disconnecting player: ${e.message}`);
      }
    }
    console.log('✅ All AI players disconnected');
  }
}

// Enhanced Demo with Human vs AI
async function runHumanVsAIDemo() {
  console.log('👥 Starting ENHANCED Human vs AI Demo');
  console.log('🎯 Join at http://localhost:3000 to play against timed AI!');
  console.log('⏱️  AI opponents will take 15 seconds between actions\n');
  
  const gameManager = new PokerGameManager();
  const aiPlayers = [];

  try {
    // Create 3 AI opponents with timed behavior
    const configs = [
      { name: 'player1', personality: 'aggressive', reactionTime: 1200 },
      { name: 'player2', personality: 'conservative', reactionTime: 4000 },
      { name: 'player3', personality: 'bluffer', reactionTime: 2200 }
    ];

    for (let i = 0; i < configs.length; i++) {
      const aiPlayer = new TimedUIAIPlayer(configs[i], gameManager);
      await aiPlayer.initialize();
      aiPlayers.push(aiPlayer);
      
      setTimeout(() => {
        console.log(`🚀 Starting ${configs[i].name} join process...`);
        aiPlayer.joinGame(1);
      }, i * 6000);
    }

    console.log('\n🎮 Enhanced Human vs AI Features:');
    console.log('   ⏱️  AI takes 15 seconds between actions');
    console.log('   🎯 Game counting and progress tracking');
    console.log('   🤖 3 different AI personalities');
    console.log('\n🌐 Join the game:');
    console.log('   📱 Go to: http://localhost:3000');
    console.log('   📝 Enter your nickname and join Table 1');
    console.log('   🎯 Play against timed AI opponents');
    
    // Start first game when human joins
    setTimeout(() => {
      gameManager.startNewGame();
    }, 20000);

    console.log('\n⏳ Demo will run until you stop it (Ctrl+C)...\n');

    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Enhanced Demo error:', error);
  } finally {
    for (const player of aiPlayers) {
      await player.disconnect();
    }
  }
}

// Command line interface
const args = process.argv.slice(2);
const demoType = args[0] || 'ai-only';

console.log('🎰 ENHANCED AI POKER DEMO');
console.log('⚡ Features: 15s action intervals, game counting, full cycles\n');

if (demoType === 'human-vs-ai') {
  runHumanVsAIDemo();
} else {
  runUIAIDemo();
}

// Handle graceful shutdown
let isShuttingDown = false;
process.on('SIGINT', async () => {
  if (isShuttingDown) {
    console.log('\n⚡ Force quit detected, exiting immediately...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log('\n🛑 Graceful shutdown initiated...');
  console.log('🔄 Press Ctrl+C again to force quit');
  
  process.exit(0);
}); 