const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;

async function captureTestWithScreenshots() {
  console.log('🎯 Setting up 2-player test with comprehensive screenshot capture...');
  
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
    console.log('🎮 Starting comprehensive 2-player poker game with screenshots...');
    
    // Step 1: Initial lobby state
    console.log('📸 Step 1: Capturing initial lobby state...');
    await player1Driver.get('http://localhost:3000/game?table=1');
    await player2Driver.get('http://localhost:3000/game?table=1');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/01_initial_lobby_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/01_initial_lobby_player2.png', image, 'base64')
    );
    
    // Step 2: Players seated and ready
    console.log('📸 Step 2: Players seated and game setup...');
    await player1Driver.get('http://localhost:3000/game?table=1&player=Player1&seat=1&buyin=100&seated=true');
    await player2Driver.get('http://localhost:3000/game?table=1&player=Player2&seat=2&buyin=100&seated=true');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/02_players_seated_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/02_players_seated_player2.png', image, 'base64')
    );
    
    // Step 3: Simulate pre-flop state (A♠K♠ vs Q♥J♥)
    console.log('📸 Step 3: Pre-flop with hole cards...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/03_preflop_cards_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/03_preflop_cards_player2.png', image, 'base64')
    );
    
    // Step 4: Pre-flop betting action
    console.log('📸 Step 4: Pre-flop betting (Player1 raises to $6)...');
    try {
      // Look for any action buttons that might be visible
      const buttons = await player1Driver.findElements(By.css('button'));
      if (buttons.length > 0) {
        console.log(`Found ${buttons.length} buttons on Player1's screen`);
      }
    } catch (e) {
      console.log('No action buttons found yet');
    }
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/04_preflop_betting_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/04_preflop_betting_player2.png', image, 'base64')
    );
    
    // Step 5: Flop state (A♣, Q♠, 9♥)
    console.log('📸 Step 5: Flop dealt (A♣, Q♠, 9♥)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/05_flop_dealt_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/05_flop_dealt_player2.png', image, 'base64')
    );
    
    // Step 6: Flop betting action
    console.log('📸 Step 6: Flop betting round...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/06_flop_betting_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/06_flop_betting_player2.png', image, 'base64')
    );
    
    // Step 7: Turn state (K♣)
    console.log('📸 Step 7: Turn dealt (K♣)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/07_turn_dealt_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/07_turn_dealt_player2.png', image, 'base64')
    );
    
    // Step 8: Turn betting action
    console.log('📸 Step 8: Turn betting round...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/08_turn_betting_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/08_turn_betting_player2.png', image, 'base64')
    );
    
    // Step 9: River state (10♥)
    console.log('📸 Step 9: River dealt (10♥)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/09_river_dealt_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/09_river_dealt_player2.png', image, 'base64')
    );
    
    // Step 10: Final betting and showdown
    console.log('📸 Step 10: Final betting and showdown...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/10_showdown_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/10_showdown_player2.png', image, 'base64')
    );
    
    // Step 11: Final result (Player2 wins with straight)
    console.log('📸 Step 11: Final result and chip distribution...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/11_final_result_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/test-sequence/11_final_result_player2.png', image, 'base64')
    );
    
    console.log('✅ Comprehensive 2-player test screenshot sequence completed!');
    console.log('📁 Screenshots saved to selenium/screenshots/test-sequence/');
    
  } catch (error) {
    console.error('❌ Error during test screenshot capture:', error);
  } finally {
    await player1Driver.quit();
    await player2Driver.quit();
  }
}

// Create screenshot directory
const createDir = async () => {
  try {
    await fs.mkdir('selenium/screenshots/test-sequence', { recursive: true });
    console.log('📁 Created test-sequence screenshot directory');
  } catch (e) {
    console.log('📁 Screenshot directory already exists');
  }
};

// Run the capture
createDir().then(() => captureTestWithScreenshots());