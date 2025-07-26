#!/usr/bin/env node

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome.js');
const fs = require('fs');
const path = require('path');

async function capturePokerGameScreenshots() {
  console.log('🎮📸 Starting Manual Poker Game Screenshot Capture');
  console.log('====================================================');
  
  const screenshotDir = path.join(__dirname, 'selenium/screenshots/manual-capture');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  let driver1 = null;
  let driver2 = null;
  
  try {
    // Create two browser instances
    console.log('🌐 Creating browser instances...');
    
    const options = new chrome.Options();
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1400,900');
    
    driver1 = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
      
    driver2 = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    console.log('✅ Browser instances created');
    
    // Navigate both players to the game
    console.log('🌐 Navigating players to poker table...');
    
    await driver1.get('http://localhost:3000/game?table=1');
    await driver2.get('http://localhost:3000/game?table=1');
    
    // Wait for pages to load
    await driver1.sleep(5000);
    await driver2.sleep(5000);
    
    console.log('✅ Both players navigated to table');
    
    // Capture screenshots at different moments
    const screenshots = [
      { name: '01_initial_lobby', delay: 0, description: 'Initial lobby view' },
      { name: '02_table_joined', delay: 3000, description: 'Players at table' },
      { name: '03_game_state', delay: 6000, description: 'Game state established' },
      { name: '04_final_view', delay: 9000, description: 'Final game view' }
    ];
    
    for (const [index, shot] of screenshots.entries()) {
      console.log(`📸 Capturing ${shot.description}...`);
      
      if (shot.delay > 0) {
        await driver1.sleep(shot.delay);
      }
      
      // Capture from both players
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const screenshot1 = await driver1.takeScreenshot();
      const filename1 = `${shot.name}_Player1_${timestamp}.png`;
      fs.writeFileSync(path.join(screenshotDir, filename1), screenshot1, 'base64');
      
      const screenshot2 = await driver2.takeScreenshot();
      const filename2 = `${shot.name}_Player2_${timestamp}.png`;
      fs.writeFileSync(path.join(screenshotDir, filename2), screenshot2, 'base64');
      
      console.log(`📸 Captured: ${filename1} and ${filename2}`);
    }
    
    console.log('📊 Screenshot Summary:');
    const files = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
    console.log(`   Total Screenshots: ${files.length}`);
    console.log(`   Location: ${screenshotDir}`);
    files.forEach(file => console.log(`   - ${file}`));
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error.message);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up browsers...');
    if (driver1) await driver1.quit();
    if (driver2) await driver2.quit();
    console.log('✅ Cleanup complete');
  }
  
  console.log('🎉 Manual screenshot capture complete!');
}

// Run the capture
if (require.main === module) {
  capturePokerGameScreenshots();
}

module.exports = capturePokerGameScreenshots;