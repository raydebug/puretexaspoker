const { UIAIPlayer } = require('./ai-players/uiAIPlayer');

async function runUIAIDemo() {
  console.log('🎰 Starting UI-Based AI Poker Demo');
  console.log('🚀 Creating AI players that will use the browser UI just like humans...\n');

  const aiPlayers = [];

  try {
    // Create 4 AI players with different personalities
    const playerConfigs = [
      {
        name: 'AggressiveBot',
        personality: 'aggressive',
        reactionTime: 1500,
        aggressionFactor: 0.8,
        bluffFrequency: 0.4
      },
      {
        name: 'ConservativeBot',
        personality: 'conservative',
        reactionTime: 3000,
        aggressionFactor: 0.2,
        bluffFrequency: 0.1
      },
      {
        name: 'BlufferBot',
        personality: 'bluffer',
        reactionTime: 2000,
        aggressionFactor: 0.6,
        bluffFrequency: 0.7
      },
      {
        name: 'BalancedBot',
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
      
      // Stagger the joins to avoid conflicts
      setTimeout(() => {
        aiPlayer.joinGame(1);
      }, i * 3000);
    }

    console.log('\n🎮 All AI players initialized and joining game...');
    console.log('📺 You can watch them play in the browser windows that opened!');
    console.log('🎯 Each AI has a different personality:');
    console.log('   - AggressiveBot: Raises frequently, high aggression');
    console.log('   - ConservativeBot: Plays tight, folds often');
    console.log('   - BlufferBot: Makes big bluffs, unpredictable');
    console.log('   - BalancedBot: Mixed strategy, moderate aggression');
    console.log('\n⏱️  Demo will run for 5 minutes...\n');

    // Let the demo run for 5 minutes
    await new Promise(resolve => setTimeout(resolve, 300000));

  } catch (error) {
    console.error('❌ Demo error:', error);
  } finally {
    // Cleanup - disconnect all AI players
    console.log('\n🛑 Demo complete, disconnecting AI players...');
    for (const player of aiPlayers) {
      await player.disconnect();
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
      { name: 'AI_Shark', personality: 'aggressive', reactionTime: 1200 },
      { name: 'AI_Fish', personality: 'conservative', reactionTime: 4000 },
      { name: 'AI_Tricky', personality: 'bluffer', reactionTime: 2200 }
    ];

    for (let i = 0; i < configs.length; i++) {
      const aiPlayer = new UIAIPlayer(configs[i]);
      await aiPlayer.initialize();
      aiPlayers.push(aiPlayer);
      
      setTimeout(() => {
        aiPlayer.joinGame(1);
      }, i * 2000);
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
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down demo...');
  process.exit(0);
}); 