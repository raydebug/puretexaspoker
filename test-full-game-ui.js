#!/usr/bin/env node

const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');
const { exec } = require('child_process');

async function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`⚠️ Command failed: ${error.message}`);
        resolve({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function testFullGameUI() {
  console.log('🧪 Testing full game setup with cards UI...');
  
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    console.log('🧹 1. Resetting database...');
    await execAsync('curl -X POST http://localhost:3001/api/test/test_cleanup_games');
    
    console.log('🪑 2. Seating Player1 at table 1, seat 1...');
    const seatResult1 = await execAsync(`curl -X POST "http://localhost:3001/api/tables/1/seat" -H "Content-Type: application/json" -d '{"playerId": "test-player1", "seatNumber": 1, "buyInAmount": 100}'`);
    console.log('   Player1 seat result:', seatResult1.stdout?.substring(0, 100));
    
    console.log('🪑 3. Seating Player2 at table 1, seat 2...');  
    const seatResult2 = await execAsync(`curl -X POST "http://localhost:3001/api/tables/1/seat" -H "Content-Type: application/json" -d '{"playerId": "test-player2", "seatNumber": 2, "buyInAmount": 100}'`);
    console.log('   Player2 seat result:', seatResult2.stdout?.substring(0, 100));
    
    console.log('🎮 4. Starting game for table 1...');
    const gameStart = await execAsync('curl -X POST http://localhost:3001/api/test/test_start_game/1');
    console.log('   Game start result:', gameStart.stdout?.substring(0, 100));
    
    // Navigate to game page
    console.log('🌐 5. Navigating to game page...');
    await driver.get('http://localhost:3000/game?table=1');
    await driver.sleep(3000);
    
    // Take screenshot after game setup
    console.log('📸 6. Taking screenshot after game setup...');
    const setupData = await driver.takeScreenshot();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/after-game-setup.png', setupData, 'base64');
    
    // Set player cards
    console.log('🃏 7. Setting player cards via API...');
    const cardResult = await execAsync(`curl -X POST http://localhost:3001/api/test/set-player-cards -H "Content-Type: application/json" -d '{"tableId": 1, "playerCards": {"test-player1": [{"rank": "A", "suit": "♠"}, {"rank": "K", "suit": "♠"}], "test-player2": [{"rank": "Q", "suit": "♥"}, {"rank": "J", "suit": "♥"}]}}'`);
    console.log('   Card API result:', cardResult.stdout);
    
    // Wait for UI to update and take final screenshot
    console.log('⏳ 8. Waiting for UI to update...');
    await driver.sleep(5000);
    
    console.log('📸 9. Taking final screenshot with cards...');
    const finalData = await driver.takeScreenshot();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/final-with-cards.png', finalData, 'base64');
    
    console.log('✅ Screenshots saved:');
    console.log('   After setup: /Users/leiyao/work/puretexaspoker/after-game-setup.png');
    console.log('   Final:       /Users/leiyao/work/puretexaspoker/final-with-cards.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await driver.quit();
  }
}

testFullGameUI().catch(console.error);