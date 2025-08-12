#!/usr/bin/env node

/**
 * Test script to verify TableAction database logging fix
 */

console.log('🧪 Testing TableAction database logging fix...');

// Test approach: Make a simple API call to trigger an action and check if it's logged to database
const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testTableActionLogging() {
  try {
    console.log('🔧 Step 1: Reset database...');
    const resetResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/test/reset-database',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!resetResult.success) {
      throw new Error('Database reset failed: ' + resetResult.error);
    }
    
    console.log('✅ Database reset successful');
    
    // Wait a bit for database reset to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🎮 Step 2: Add players and start game...');
    
    // First add players
    console.log('   👥 Adding Player1...');
    await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/test/auto-seat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      tableId: 1,
      playerName: 'Player1',
      seatNumber: 1,
      buyIn: 100
    }));
    
    console.log('   👥 Adding Player2...');
    await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/test/auto-seat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      tableId: 1,
      playerName: 'Player2',
      seatNumber: 2,
      buyIn: 100
    }));
    
    // Wait for players to be seated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('   🎲 Starting game...');
    const startResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/test/start-game',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      tableId: 1
    }));
    
    if (!startResult.success) {
      throw new Error('Game start failed: ' + startResult.error);
    }
    
    console.log('✅ Game started successfully');
    
    // Wait for game to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 Step 3: Execute a raise action...');
    const raiseResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/test/raise',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      tableId: 1,
      playerName: 'Player1',
      amount: 6
    }));
    
    console.log('📊 Raise result:', raiseResult);
    
    // Wait for action to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📜 Step 4: Check action history...');
    const historyResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/tables/1/actions/history',
      method: 'GET'
    });
    
    console.log('📊 Action history result:', historyResult);
    
    if (historyResult.success && historyResult.actionHistory && historyResult.actionHistory.length > 0) {
      console.log('✅ SUCCESS: Game history is being recorded!');
      console.log(`📊 Found ${historyResult.actionHistory.length} actions in history`);
      
      // Show the actions
      historyResult.actionHistory.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.playerName} ${action.action} ${action.amount ? `$${action.amount}` : ''} in ${action.phase} phase`);
      });
      
      return true;
    } else {
      console.log('❌ PROBLEM: No actions found in game history');
      return false;
    }
    
  } catch (error) {
    console.log('❌ TEST FAILED:', error.message);
    return false;
  }
}

// Run the test
testTableActionLogging().then(success => {
  console.log(success ? '🎯 TableAction logging fix VERIFIED!' : '⚠️ TableAction logging needs more work');
  process.exit(success ? 0 : 1);
});