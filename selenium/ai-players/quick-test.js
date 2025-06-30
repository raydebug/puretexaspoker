const { UIAIPlayer } = require('./uiAIPlayer');

async function quickTest() {
  console.log('🚀 Quick AI Player Test');
  console.log('Testing a single AI player...\n');

  const ai = new UIAIPlayer({
    name: 'TestBot',
    personality: 'balanced',
    reactionTime: 1500
  });

  try {
    console.log('🤖 Initializing AI player...');
    await ai.initialize();
    
    console.log('🎯 AI joining game...');
    await ai.joinGame(1);
    
    console.log('✅ AI should now be playing! Check the browser window.');
    console.log('⏱️  Test will run for 2 minutes...\n');
    
    // Run for 2 minutes
    await new Promise(resolve => setTimeout(resolve, 120000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('🛑 Disconnecting AI player...');
    await ai.disconnect();
    console.log('✅ Test complete!');
  }
}

quickTest(); 