const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/test';
const TABLE_ID = 1;

async function test() {
  try {
    console.log('1️⃣ Seat players on table 1...');
    const players = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];
    for (let i = 0; i < players.length; i++) {
      const res = await axios.post(`${BASE_URL}/auto-seat`, {
        tableId: TABLE_ID,
        playerName: players[i],
        seatNumber: i + 1,
        chips: 100
      });
      console.log(`  ✅ Seated ${players[i]} at seat ${i + 1}`);
    }

    await new Promise(r => setTimeout(r, 500));

    console.log('\n2️⃣ Start game on table 1...');
    const startRes = await axios.post(`${BASE_URL}/start-game`, { tableId: TABLE_ID });
    console.log('✅ Game started');

    await new Promise(r => setTimeout(r, 500));

    console.log('\n3️⃣ Query game history - request 2 actions...');
    const hist2 = await axios.get(`${BASE_URL}/mock-game-history/${TABLE_ID}/count/2`);
    
    console.log(`📊 Source: ${hist2.data.source || 'GENERATED'}`);
    console.log(`📊 Returned: ${hist2.data.count} actions`);
    
    if (hist2.data.actionHistory && hist2.data.actionHistory.length >= 2) {
      console.log('\n✅ SUCCESS: Got both actions!');
      hist2.data.actionHistory.forEach(action => {
        console.log(`  ${action.id}: ${action.action} - ${action.playerName || 'SYSTEM'} $${action.amount}`);
      });
    } else {
      console.log(`\n⚠️ PROBLEM: Only got ${hist2.data.actionHistory?.length || 0} actions, expected 2`);
      if (hist2.data.actionHistory) {
        hist2.data.actionHistory.forEach(action => {
          console.log(`  ${action.id}: ${action.action}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
  }
}

test();
