/**
 * Simple test of the mock backend server
 */

const MockBackendServer = require('./selenium/mocks/mockBackendServer');

async function testMockServer() {
  console.log('🎭 Testing Mock Backend Server...');
  
  try {
    const server = new MockBackendServer();
    
    console.log('🚀 Starting server...');
    await server.start(3002);
    
    console.log('❤️ Testing health endpoint...');
    const fetch = (await import('node-fetch')).default;
    
    const healthResponse = await fetch('http://localhost:3002/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    console.log('📊 Testing game history endpoint...');
    const historyResponse = await fetch('http://localhost:3002/api/test/progressive-game-history/1');
    const historyData = await historyResponse.json();
    console.log('✅ Initial game history:', historyData.actionHistory.length, 'actions');
    console.log('📝 Actions:', historyData.actionHistory.map(a => a.id).join(', '));
    
    console.log('🎮 Testing phase update...');
    const phaseResponse = await fetch('http://localhost:3002/api/test/set-game-phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'preflop_betting' })
    });
    const phaseData = await phaseResponse.json();
    console.log('✅ Phase updated:', phaseData);
    
    console.log('📊 Testing updated game history...');
    const historyResponse2 = await fetch('http://localhost:3002/api/test/progressive-game-history/1');
    const historyData2 = await historyResponse2.json();
    console.log('✅ Updated game history:', historyData2.actionHistory.length, 'actions');
    console.log('📝 Actions:', historyData2.actionHistory.map(a => a.id).join(', '));
    
    console.log('🛑 Stopping server...');
    await server.stop();
    
    console.log('🎉 Mock backend test completed successfully!');
    
  } catch (error) {
    console.error('❌ Mock backend test failed:', error.message);
    process.exit(1);
  }
}

testMockServer();