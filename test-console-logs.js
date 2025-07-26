#!/usr/bin/env node

const { Builder, By, until } = require('selenium-webdriver');
const { exec } = require('child_process');

async function execAsync(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function testConsoleLogs() {
  console.log('🧪 Checking all console logs...');
  
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    console.log('🌐 Navigating to game page...');
    await driver.get('http://localhost:3000/game?table=1');
    await driver.sleep(3000);
    
    console.log('🃏 Calling API...');
    await execAsync(`curl -X POST http://localhost:3001/api/test/set-player-cards -H "Content-Type: application/json" -d '{"tableId": 1, "playerCards": {"test-player1": [{"rank": "A", "suit": "♠"}, {"rank": "K", "suit": "♠"}]}}'`);
    
    await driver.sleep(3000);
    
    console.log('📋 Getting ALL console logs...');
    const allLogs = await driver.manage().logs().get('browser');
    
    console.log(`\\nFound ${allLogs.length} total console logs:`);
    console.log('=====================================');
    allLogs.forEach((log, i) => {
      console.log(`${i + 1}. [${log.level}] ${log.message.substring(0, 200)}${log.message.length > 200 ? '...' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await driver.quit();
  }
}

testConsoleLogs().catch(console.error);