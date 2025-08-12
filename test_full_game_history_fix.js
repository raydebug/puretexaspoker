#!/usr/bin/env node

/**
 * Complete test to verify game history works end-to-end with full game progression
 */

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

async function testCompleteGameHistory() {
  try {
    console.log('🎯 COMPREHENSIVE GAME HISTORY TEST');
    console.log('=====================================\n');
    
    console.log('🔧 Step 1: Reset database and setup...');
    await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/test/reset-database',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('👥 Step 2: Add players...');
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
    
    console.log('🎲 Step 3: Start game...');
    await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/test/start-game',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ tableId: 1 }));
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📜 Step 4: Check initial game history (should show blinds)...');
    let historyResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/tables/1/actions/history',
      method: 'GET'
    });
    
    console.log(`📊 Initial history: ${historyResult.actionHistory?.length || 0} actions`);
    if (historyResult.actionHistory) {
      historyResult.actionHistory.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.playerName} ${action.action} ${action.amount ? `$${action.amount}` : ''} in ${action.phase} phase`);
      });
    }
    
    console.log('\n🎯 Step 5: Execute preflop actions...');
    console.log('   🔸 Player1 raises to $6...');
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
    
    console.log(`   📊 Raise result: ${raiseResult.success ? 'SUCCESS' : 'FAILED - ' + raiseResult.error}`);
    
    if (raiseResult.success) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('   🔸 Player2 calls...');
      const callResult = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/test/call',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, JSON.stringify({
        tableId: 1,
        playerName: 'Player2'
      }));
      
      console.log(`   📊 Call result: ${callResult.success ? 'SUCCESS' : 'FAILED - ' + callResult.error}`);
      
      if (callResult.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n🎯 Step 6: Progress to flop phase...');
        const flopResult = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/test/advance-to-flop',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ tableId: 1 }));
        
        console.log(`   📊 Advance to flop: ${flopResult.success ? 'SUCCESS' : 'FAILED - ' + flopResult.error}`);
        
        if (flopResult.success) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('   🔸 Player1 bets $10 on flop...');
          const flopBetResult = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/test/bet',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, JSON.stringify({
            tableId: 1,
            playerName: 'Player1',
            amount: 10
          }));
          
          console.log(`   📊 Flop bet result: ${flopBetResult.success ? 'SUCCESS' : 'FAILED - ' + flopBetResult.error}`);
        }
      }
    }
    
    console.log('\n📜 Step 7: Check complete game history...');
    historyResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/tables/1/actions/history',
      method: 'GET'
    });
    
    console.log(`📊 Final history: ${historyResult.actionHistory?.length || 0} actions`);
    if (historyResult.actionHistory) {
      console.log('🎯 COMPLETE GAME HISTORY:');
      historyResult.actionHistory.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.playerName} ${action.action} ${action.amount ? `$${action.amount}` : ''} in ${action.phase} phase`);
      });
    }
    
    // Check if we have actions beyond preflop
    const hasFlopActions = historyResult.actionHistory?.some(action => action.phase === 'flop') || false;
    const hasTurnActions = historyResult.actionHistory?.some(action => action.phase === 'turn') || false;
    const hasRiverActions = historyResult.actionHistory?.some(action => action.phase === 'river') || false;
    
    console.log('\n🏆 GAME HISTORY ANALYSIS:');
    console.log(`✅ Preflop actions: ${historyResult.actionHistory?.filter(a => a.phase === 'preflop').length || 0}`);
    console.log(`${hasFlopActions ? '✅' : '❌'} Flop actions: ${historyResult.actionHistory?.filter(a => a.phase === 'flop').length || 0}`);
    console.log(`${hasTurnActions ? '✅' : '❌'} Turn actions: ${historyResult.actionHistory?.filter(a => a.phase === 'turn').length || 0}`);
    console.log(`${hasRiverActions ? '✅' : '❌'} River actions: ${historyResult.actionHistory?.filter(a => a.phase === 'river').length || 0}`);
    
    const hasCompleteHistory = hasFlopActions || hasTurnActions || hasRiverActions;
    console.log(`\n🎯 RESULT: ${hasCompleteHistory ? '✅ COMPLETE GAME HISTORY WORKING!' : '❌ Only preflop actions recorded'}`);
    
    return hasCompleteHistory;
    
  } catch (error) {
    console.log('❌ TEST FAILED:', error.message);
    return false;
  }
}

// Run the test
testCompleteGameHistory().then(success => {
  console.log('\n' + '='.repeat(50));
  console.log(success ? '🏆 GAME HISTORY FIX: SUCCESSFUL!' : '⚠️ GAME HISTORY FIX: NEEDS MORE WORK');
  console.log('='.repeat(50));
  process.exit(success ? 0 : 1);
});