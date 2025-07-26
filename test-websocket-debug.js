#!/usr/bin/env node

const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');
const { exec } = require('child_process');

async function execAsync(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function testWebSocketDebug() {
  console.log('🧪 Testing WebSocket connection and console logs...');
  
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // Enable console logging
    const logs = [];
    
    // Navigate to game page
    console.log('🌐 Navigating to game page...');
    await driver.get('http://localhost:3000/game?table=1');
    await driver.sleep(3000);
    
    // Get initial console logs
    console.log('📋 Getting initial console logs...');
    const initialLogs = await driver.manage().logs().get('browser');
    console.log('Initial logs count:', initialLogs.length);
    
    // Call API to set player cards
    console.log('🃏 Calling set-player-cards API...');
    const cardResult = await execAsync(`curl -X POST http://localhost:3001/api/test/set-player-cards -H "Content-Type: application/json" -d '{"tableId": 1, "playerCards": {"test-player1": [{"rank": "A", "suit": "♠"}, {"rank": "K", "suit": "♠"}], "test-player2": [{"rank": "Q", "suit": "♥"}, {"rank": "J", "suit": "♥"}]}}'`);
    console.log('API Response:', cardResult.stdout);
    
    // Wait for WebSocket events
    console.log('⏳ Waiting for WebSocket events...');
    await driver.sleep(5000);
    
    // Get console logs after API call
    console.log('📋 Getting console logs after API call...');
    const afterLogs = await driver.manage().logs().get('browser');
    
    console.log('\\n🔍 Console Logs Analysis:');
    console.log('=========================');
    
    // Filter for relevant logs
    const relevantLogs = afterLogs.filter(log => 
      log.message.includes('FRONTEND') || 
      log.message.includes('gameState') || 
      log.message.includes('WebSocket') ||
      log.message.includes('socket') ||
      log.message.includes('Connected') ||
      log.message.includes('GamePage')
    );
    
    if (relevantLogs.length === 0) {
      console.log('❌ No relevant WebSocket/gameState logs found!');
      console.log('\\nAll console logs:');
      afterLogs.forEach((log, i) => {
        console.log(`${i + 1}. [${log.level}] ${log.message}`);
      });
    } else {
      console.log(`✅ Found ${relevantLogs.length} relevant logs:`);
      relevantLogs.forEach((log, i) => {
        console.log(`${i + 1}. [${log.level}] ${log.message}`);
      });
    }
    
    // Take a screenshot
    console.log('📸 Taking final screenshot...');
    const finalData = await driver.takeScreenshot();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/websocket-debug.png', finalData, 'base64');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await driver.quit();
  }
}

testWebSocketDebug().catch(console.error);