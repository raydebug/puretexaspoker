// Simple test to verify ActionHistory fix shows real API data
console.log('🧪 Testing ActionHistory API integration fix...');

const fetch = require('node-fetch');

async function testGameHistoryAPI() {
  try {
    // Test if backend is running and can serve game history
    const response = await fetch('http://localhost:3001/api/tables/1/actions/history');
    const data = await response.json();
    
    console.log('✅ Game History API Response:', data);
    
    if (data.success && data.actionHistory) {
      console.log(`📊 Found ${data.actionHistory.length} actions in game history`);
      data.actionHistory.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.playerId} ${action.action} ${action.amount || ''}`);
      });
    } else {
      console.log('⚠️ No game history found or API error');
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
    console.log('ℹ️ Make sure backend server is running on port 3001');
  }
}

testGameHistoryAPI();