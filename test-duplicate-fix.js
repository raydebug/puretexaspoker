#!/usr/bin/env node

// Quick test to verify the duplicate player fix
const { execSync } = require('child_process');

async function testDuplicateFix() {
  console.log('🧪 Testing duplicate player fix...');

  try {
    // Reset database
    console.log('🧹 Resetting database...');
    const resetResult = execSync('curl -s -X POST http://localhost:3001/api/test/reset-database', { encoding: 'utf8' });
    const resetResponse = JSON.parse(resetResult);
    
    if (!resetResponse.success) {
      throw new Error('Database reset failed');
    }
    
    const tableId = resetResponse.tables[0].id;
    console.log(`✅ Database reset, using table ${tableId}`);

    // Seat all 5 players using API
    const players = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];
    
    for (let i = 0; i < players.length; i++) {
      const playerName = players[i];
      const seatNumber = i + 1;
      
      console.log(`🪑 Seating ${playerName} at seat ${seatNumber}...`);
      
      const seatApiCall = `curl -s -X POST http://localhost:3001/api/test/auto-seat -H "Content-Type: application/json" -d '{"tableId": ${tableId}, "playerName": "${playerName}", "seatNumber": ${seatNumber}, "buyIn": 100}'`;
      const seatResult = execSync(seatApiCall, { encoding: 'utf8' });
      const seatResponse = JSON.parse(seatResult);
      
      if (!seatResponse.success) {
        throw new Error(`Failed to seat ${playerName}: ${seatResponse.error}`);
      }
      
      console.log(`✅ ${playerName} seated successfully`);
    }

    // Check table players
    console.log('📊 Checking table players...');
    const tableResult = execSync(`curl -s http://localhost:3001/api/tables/${tableId}`, { encoding: 'utf8' });
    const tableResponse = JSON.parse(tableResult);
    
    if (tableResponse.success && tableResponse.table) {
      const playerCount = tableResponse.table.players.length;
      const playerNames = tableResponse.table.players.map(p => p.name);
      
      console.log(`📋 Table ${tableId} has ${playerCount} players: [${playerNames.join(', ')}]`);
      
      if (playerCount === 5 && playerNames.every(name => players.includes(name))) {
        console.log('✅ SUCCESS: Exactly 5 players with correct names - no duplicates!');
        return true;
      } else {
        console.log('❌ FAILURE: Wrong player count or names');
        return false;
      }
    } else {
      throw new Error('Failed to get table data');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testDuplicateFix().then(success => {
  process.exit(success ? 0 : 1);
});