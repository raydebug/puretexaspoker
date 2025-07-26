const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;

async function captureCleanUIScreenshots() {
  console.log('🎯 Setting up browsers for clean UI screenshot capture...');
  
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--disable-web-security');
  chromeOptions.addArguments('--window-size=1920,1080');
  chromeOptions.addArguments('--start-maximized');
  
  const player1Driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
    
  const player2Driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    console.log('📸 Starting clean UI screenshot capture...');
    
    // Navigate both players to the game
    console.log('🌐 Navigating players to game page...');
    await player1Driver.get('http://localhost:3000/game?table=1');
    await player2Driver.get('http://localhost:3000/game?table=1');
    
    // Wait for pages to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Capture initial clean lobby view
    console.log('📸 Capturing Player1 clean lobby view...');
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/clean-ui/01_clean_lobby_player1.png', image, 'base64')
    );
    
    console.log('📸 Capturing Player2 clean lobby view...');
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/clean-ui/02_clean_lobby_player2.png', image, 'base64')
    );
    
    // Navigate to a game with action buttons visible
    console.log('🎮 Setting up game state for action button demonstration...');
    await player1Driver.get('http://localhost:3000/game?table=1&player=Player1&seat=1&buyin=100&seated=true');
    await player2Driver.get('http://localhost:3000/game?table=1&player=Player2&seat=2&buyin=100&seated=true');
    
    // Wait for game state to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Capture clean game interface with action buttons
    console.log('📸 Capturing Player1 clean game interface...');
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/clean-ui/03_clean_game_player1.png', image, 'base64')
    );
    
    console.log('📸 Capturing Player2 clean game interface...');
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/clean-ui/04_clean_game_player2.png', image, 'base64')
    );
    
    // Try to trigger action buttons if visible
    try {
      const actionButtons = await player1Driver.findElements(By.css('[data-testid*="button"]'));
      if (actionButtons.length > 0) {
        console.log('📸 Capturing Player1 with action buttons visible...');
        await player1Driver.takeScreenshot().then(image => 
          fs.writeFile('selenium/screenshots/clean-ui/05_clean_actions_player1.png', image, 'base64')
        );
      }
    } catch (e) {
      console.log('ℹ️ No action buttons found for Player1');
    }
    
    try {
      const actionButtons = await player2Driver.findElements(By.css('[data-testid*="button"]'));
      if (actionButtons.length > 0) {
        console.log('📸 Capturing Player2 with action buttons visible...');
        await player2Driver.takeScreenshot().then(image => 
          fs.writeFile('selenium/screenshots/clean-ui/06_clean_actions_player2.png', image, 'base64')
        );
      }
    } catch (e) {
      console.log('ℹ️ No action buttons found for Player2');
    }
    
    // Capture final clean poker table view
    console.log('📸 Capturing final clean poker table views...');
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/clean-ui/07_final_clean_view_player1.png', image, 'base64')
    );
    
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/clean-ui/08_final_clean_view_player2.png', image, 'base64')
    );
    
    console.log('✅ Clean UI screenshot capture completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    await player1Driver.quit();
    await player2Driver.quit();
  }
}

// Create screenshot directory
const createDir = async () => {
  try {
    await fs.mkdir('selenium/screenshots/clean-ui', { recursive: true });
    console.log('📁 Created clean-ui screenshot directory');
  } catch (e) {
    console.log('📁 Screenshot directory already exists');
  }
};

// Run the capture
createDir().then(() => captureCleanUIScreenshots());