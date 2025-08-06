#!/usr/bin/env node

// Use native Node.js fetch (available in Node 18+) or curl fallback

async function testBetFix() {
  console.log('🧪 Testing the fixed /api/test/bet endpoint...\n');

  try {
    // 1. Check initial action history
    console.log('1. Checking initial action history for table 1...');
    let response = await fetch('http://localhost:3001/api/tables/1/actions/history');
    let data = await response.json();
    console.log(`   Initial actions: ${data.count} (${data.actionHistory.map(a => `${a.action} ${a.amount || ''}`).join(', ')})`);

    // 2. Make a bet action using the FIXED API
    console.log('\n2. Making Player1 bet $5 using fixed API...');
    response = await fetch('http://localhost:3001/api/test/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 1, playerName: 'Player1', amount: 5 })
    });
    data = await response.json();
    console.log(`   Bet API response: ${data.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!data.success) {
      console.log(`   Error: ${data.error}`);
    }

    // 3. Check if the action was saved to the database
    console.log('\n3. Checking action history after bet...');
    response = await fetch('http://localhost:3001/api/tables/1/actions/history');
    data = await response.json();
    console.log(`   Final actions: ${data.count} (${data.actionHistory.map(a => `${a.action} ${a.amount || ''}`).join(', ')})`);

    // 4. Analyze results
    const betActions = data.actionHistory.filter(a => a.action === 'bet');
    console.log(`\n🎯 RESULT: ${betActions.length > 0 ? '✅ SUCCESS - Bet action was saved!' : '❌ FAILED - Bet action not saved'}`);
    
    if (betActions.length > 0) {
      console.log('✅ The fix worked! Game history will now show post-preflop actions.');
    } else {
      console.log('❌ The fix did not work. Need to investigate further.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testBetFix();