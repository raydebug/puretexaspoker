#!/usr/bin/env node

const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');

async function testCardsUI() {
  console.log('🧪 Testing if cards are now visible in UI...');
  
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // Navigate to game page
    console.log('🌐 Navigating to game page...');
    await driver.get('http://localhost:3000/game?table=1');
    
    // Wait for page to load
    await driver.sleep(3000);
    
    // Take screenshot before setting cards
    console.log('📸 Taking screenshot before setting cards...');
    const beforeData = await driver.takeScreenshot();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/before-cards.png', beforeData, 'base64');
    
    // Call API to set player cards
    console.log('🃏 Setting player cards via API...');
    const { exec } = require('child_process');
    const apiCall = `curl -X POST http://localhost:3001/api/test/set-player-cards -H "Content-Type: application/json" -d '{"tableId": 1, "playerCards": {"test-player1": [{"rank": "A", "suit": "♠"}, {"rank": "K", "suit": "♠"}], "test-player2": [{"rank": "Q", "suit": "♥"}, {"rank": "J", "suit": "♥"}]}}'`;
    
    await new Promise((resolve) => {
      exec(apiCall, (error, stdout, stderr) => {
        console.log('🃏 API Response:', stdout);
        if (error) console.log('⚠️ API Error:', error.message);
        resolve();
      });
    });
    
    // Wait for UI to update
    console.log('⏳ Waiting for UI to update...');
    await driver.sleep(5000);
    
    // Take screenshot after setting cards
    console.log('📸 Taking screenshot after setting cards...');
    const afterData = await driver.takeScreenshot();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/after-cards.png', afterData, 'base64');
    
    console.log('✅ Screenshots saved:');
    console.log('   Before: /Users/leiyao/work/puretexaspoker/before-cards.png');
    console.log('   After:  /Users/leiyao/work/puretexaspoker/after-cards.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await driver.quit();
  }
}

testCardsUI().catch(console.error);