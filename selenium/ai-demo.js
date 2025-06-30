const { UIAIPlayer } = require('./ai-players/uiAIPlayer');

async function runUIAIDemo() {
  console.log('🎰 Starting UI-Based AI Poker Demo');
  console.log('🚀 Creating AI players that will use the browser UI just like humans...\n');

  const aiPlayers = [];

  try {
    // Create 4 AI players with different personalities
    const playerConfigs = [
      {
        name: 'Bot1',
        personality: 'aggressive',
        reactionTime: 1500,
        aggressionFactor: 0.8,
        bluffFrequency: 0.4
      },
      {
        name: 'Bot2',
        personality: 'conservative',
        reactionTime: 3000,
        aggressionFactor: 0.2,
        bluffFrequency: 0.1
      },
      {
        name: 'Bot3',
        personality: 'bluffer',
        reactionTime: 2000,
        aggressionFactor: 0.6,
        bluffFrequency: 0.7
      },
      {
        name: 'Bot4',
        personality: 'balanced',
        reactionTime: 2500,
        aggressionFactor: 0.5,
        bluffFrequency: 0.3
      }
    ];

    // Initialize each AI player
    for (let i = 0; i < playerConfigs.length; i++) {
      console.log(`🤖 Initializing ${playerConfigs[i].name}...`);
      const aiPlayer = new UIAIPlayer(playerConfigs[i]);
      await aiPlayer.initialize();
      aiPlayers.push(aiPlayer);
      
      // Stagger the joins more aggressively to avoid conflicts
      setTimeout(() => {
        console.log(`🚀 Starting ${playerConfigs[i].name} join process...`);
        aiPlayer.joinGame(1);
      }, i * 8000); // Increased from 3000 to 8000ms
    }

    console.log('\n🎮 All AI players initialized and joining game...');
    console.log('📺 You can watch them play in the browser windows that opened!');
    console.log('🎯 Each AI has a different personality:');
    console.log('   - Bot1: Raises frequently, high aggression');
    console.log('   - Bot2: Plays tight, folds often');
    console.log('   - Bot3: Makes big bluffs, unpredictable');
    console.log('   - Bot4: Mixed strategy, moderate aggression');
    console.log('\n🔄 Demo will run endlessly until you stop it (Ctrl+C)...\n');

    // Run indefinitely until manually stopped
    await new Promise(() => {}); // Run forever

  } catch (error) {
    console.error('❌ Demo error:', error);
  } finally {
    // Cleanup - disconnect all AI players
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
  console.log('👥 Starting Human vs AI Demo');
  console.log('🎯 Join the game at http://localhost:3000 to play against AI!');
  
  const aiPlayers = [];

  try {
    // Create 3 AI opponents
    const configs = [
      { name: 'Bot1', personality: 'aggressive', reactionTime: 1200 },
      { name: 'Bot2', personality: 'conservative', reactionTime: 4000 },
      { name: 'Bot3', personality: 'bluffer', reactionTime: 2200 }
    ];

    for (let i = 0; i < configs.length; i++) {
      const aiPlayer = new UIAIPlayer(configs[i]);
      await aiPlayer.initialize();
      aiPlayers.push(aiPlayer);
      
      setTimeout(() => {
        console.log(`🚀 Starting ${configs[i].name} join process...`);
        aiPlayer.joinGame(1);
      }, i * 6000); // Increased from 2000 to 6000ms
    }

    console.log('\n🎮 AI opponents ready! Join the game to play against them.');
    console.log('🌐 Go to: http://localhost:3000');
    console.log('📝 Enter your nickname and join Table 1');
    console.log('\n⏳ Demo will run until you stop it (Ctrl+C)...\n');

    // Run indefinitely until stopped
    await new Promise(() => {}); // Run forever

  } catch (error) {
    console.error('❌ Demo error:', error);
  } finally {
    for (const player of aiPlayers) {
      await player.disconnect();
    }
  }
}

// Command line interface
const args = process.argv.slice(2);
const demoType = args[0] || 'ai-only';

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
  
  // The cleanup will be handled by the finally blocks in the running demos
  process.exit(0);
}); 