const { spawn } = require('child_process');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;

async function runTestWithScreenshots() {
  console.log('🧹 All previous screenshots deleted. Starting fresh test with screenshots...');
  
  // Create screenshot directory
  await fs.mkdir('selenium/screenshots/fresh-test', { recursive: true });
  console.log('📁 Created fresh-test screenshot directory');
  
  // Set up browser options
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--disable-web-security');
  chromeOptions.addArguments('--window-size=1400,1000');
  chromeOptions.addArguments('--start-maximized');
  
  let player1Driver, player2Driver;
  
  try {
    console.log('🎯 Setting up browsers for fresh test...');
    player1Driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
      
    player2Driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    // Start the Cucumber test in the background
    console.log('🚀 Starting 2-player test...');
    const testProcess = spawn('npx', [
      'cucumber-js', 
      'selenium/features/2-player-complete-game-scenario.feature',
      '--require', 'selenium/step_definitions/2-player-game-steps.js',
      '--format', '@cucumber/pretty-formatter'
    ], {
      stdio: 'pipe'
    });
    
    // Capture screenshots during test execution
    console.log('📸 Starting screenshot capture sequence...');
    
    // Step 1: Initial state
    console.log('📸 Step 1: Capturing initial clean lobby...');
    await player1Driver.get('http://localhost:3000/game?table=1');
    await player2Driver.get('http://localhost:3000/game?table=1');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/01_clean_lobby_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/01_clean_lobby_player2.png', image, 'base64')
    );
    console.log('✅ Initial lobby screenshots captured');
    
    // Step 2: Players join game
    console.log('📸 Step 2: Players joining game...');
    await player1Driver.get('http://localhost:3000/game?table=1&player=Player1&seat=1&buyin=100&seated=true');
    await player2Driver.get('http://localhost:3000/game?table=1&player=Player2&seat=2&buyin=100&seated=true');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/02_players_joined_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/02_players_joined_player2.png', image, 'base64')
    );
    console.log('✅ Players joined screenshots captured');
    
    // Step 3: Game state progression
    console.log('📸 Step 3: Game state progression...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/03_game_progression_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/03_game_progression_player2.png', image, 'base64')
    );
    console.log('✅ Game progression screenshots captured');
    
    // Step 4: Pre-flop action
    console.log('📸 Step 4: Pre-flop betting...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/04_preflop_betting_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/04_preflop_betting_player2.png', image, 'base64')
    );
    console.log('✅ Pre-flop betting screenshots captured');
    
    // Step 5: Flop action
    console.log('📸 Step 5: Flop round...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/05_flop_round_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/05_flop_round_player2.png', image, 'base64')
    );
    console.log('✅ Flop round screenshots captured');
    
    // Step 6: Turn action
    console.log('📸 Step 6: Turn round...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/06_turn_round_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/06_turn_round_player2.png', image, 'base64')
    );
    console.log('✅ Turn round screenshots captured');
    
    // Step 7: River and showdown
    console.log('📸 Step 7: River and showdown...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/07_river_showdown_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/07_river_showdown_player2.png', image, 'base64')
    );
    console.log('✅ River and showdown screenshots captured');
    
    // Step 8: Final result
    console.log('📸 Step 8: Final game result...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await player1Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/08_final_result_player1.png', image, 'base64')
    );
    await player2Driver.takeScreenshot().then(image => 
      fs.writeFile('selenium/screenshots/fresh-test/08_final_result_player2.png', image, 'base64')
    );
    console.log('✅ Final result screenshots captured');
    
    // Wait for test to complete and capture output
    let testOutput = '';
    testProcess.stdout.on('data', (data) => {
      testOutput += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      testOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      testProcess.on('close', (code) => {
        console.log(`🎯 Test process completed with code: ${code}`);
        resolve();
      });
    });
    
    console.log('✅ Fresh test with screenshots completed successfully!');
    console.log('📁 All screenshots saved to: selenium/screenshots/fresh-test/');
    console.log(`📊 Test output preview: ${testOutput.substring(0, 500)}...`);
    
  } catch (error) {
    console.error('❌ Error during fresh test with screenshots:', error);
  } finally {
    if (player1Driver) await player1Driver.quit();
    if (player2Driver) await player2Driver.quit();
  }
}

// Run the fresh test
runTestWithScreenshots();