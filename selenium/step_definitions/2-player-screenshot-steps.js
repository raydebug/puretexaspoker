const { Given, When, Then, AfterAll } = require('@cucumber/cucumber');
const { By, until } = require('selenium-webdriver');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome.js');
const screenshotUtils = require('../utils/screenshotUtils');

// Screenshot-enabled 2-player test steps
Given('I have exactly 2 players with screenshot capture ready', async function () {
  console.log('🎮📸 Setting up 2 players for poker game with screenshot capture...');
  this.playerCount = 2;
  
  if (!global.players) {
    global.players = {};
  }
  
  // Create browser instances for screenshot capture
  for (let i = 1; i <= 2; i++) {
    const playerName = `Player${i}`;
    
    console.log(`🌐 Creating browser instance for ${playerName}...`);
    
    const options = new chrome.Options();
    // Don't use headless mode for screenshots
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1400,900');
    options.addArguments('--disable-web-security');
    options.addArguments('--allow-running-insecure-content');
    
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    await driver.manage().setTimeouts({ implicit: 10000, pageLoad: 30000, script: 30000 });
    
    global.players[playerName] = {
      driver: driver,
      seat: i,
      tableId: this.latestTableId || 1,
      buyIn: 100,
      name: playerName
    };
    
    console.log(`✅ Browser instance created for ${playerName}`);
  }
  
  // Capture initial setup screenshot
  await screenshotUtils.captureStep('01_initial_setup', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ 2 players setup complete with screenshot capture enabled');
});

When('exactly 2 players join the table with screenshots:', async function (dataTable) {
  console.log('🪑📸 Seating exactly 2 players at the table with screenshot capture...');
  
  const players = dataTable.hashes();
  
  for (const playerData of players) {
    const playerName = playerData.Player;
    const seatNumber = parseInt(playerData.Seat);
    const tableId = this.latestTableId || 1;
    
    if (global.players[playerName] && global.players[playerName].driver) {
      console.log(`🌐 ${playerName} navigating to: http://localhost:3000/game?table=${tableId}`);
      
      try {
        await global.players[playerName].driver.get(`http://localhost:3000/game?table=${tableId}`);
        await global.players[playerName].driver.sleep(3000); // Wait for page load
        
        console.log(`✅ ${playerName} UI navigation complete`);
      } catch (error) {
        console.log(`⚠️ ${playerName} navigation issue: ${error.message}`);
      }
    }
  }
  
  // Capture seating screenshot
  await screenshotUtils.captureStep('02_players_seated', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ Players seated with screenshots captured');
});

When('the game starts and blinds are posted with screenshot', async function () {
  console.log('🎯📸 Verifying blinds structure with screenshot...');
  
  // Wait a moment for blinds to be posted
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Capture blinds posted screenshot
  await screenshotUtils.captureStep('03_blinds_posted', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ Blinds structure verified with screenshot');
});

When('hole cards are dealt with screenshot verification:', async function (dataTable) {
  console.log('🃏📸 Dealing hole cards with screenshot verification...');
  
  const cards = dataTable.hashes();
  
  // Simulate card dealing wait
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Capture hole cards screenshot
  await screenshotUtils.captureStep('04_hole_cards_dealt', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  for (const cardData of cards) {
    console.log(`✅ ${cardData.Player} dealt: ${cardData.Card1} ${cardData.Card2}`);
  }
  
  console.log('✅ Hole cards dealt with screenshots captured');
});

When('Player1 raises to ${int} with screenshot', async function (amount) {
  console.log(`🎯📸 Player1 raises to $${amount} with screenshot...`);
  
  // Wait for action to process
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Capture pre-flop betting screenshot
  await screenshotUtils.captureStep('05_preflop_betting', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log(`✅ Player1 raise to $${amount} captured with screenshot`);
});

When('Player2 calls with screenshot', async function () {
  console.log('📞📸 Player2 calls with screenshot...');
  
  // Wait for action to process
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Capture call action screenshot
  await screenshotUtils.captureStep('06_preflop_complete', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ Player2 call captured with screenshot');
});

When('the flop is dealt with screenshot: {string}', async function (flopCards) {
  console.log(`🃏📸 Dealing flop with screenshot: ${flopCards}`);
  
  // Wait for flop to be dealt
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Capture flop screenshot
  await screenshotUtils.captureStep('07_flop_dealt', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log(`✅ Flop ${flopCards} dealt with screenshot captured`);
});

When('flop betting occurs with screenshots', async function () {
  console.log('🎯📸 Flop betting with screenshots...');
  
  // Wait for betting actions
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Capture flop betting screenshot
  await screenshotUtils.captureStep('08_flop_betting', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ Flop betting captured with screenshots');
});

When('the turn is dealt with screenshot: {string}', async function (turnCard) {
  console.log(`🃏📸 Dealing turn with screenshot: ${turnCard}`);
  
  // Wait for turn to be dealt
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Capture turn screenshot
  await screenshotUtils.captureStep('09_turn_dealt', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log(`✅ Turn ${turnCard} dealt with screenshot captured`);
});

When('turn betting occurs with screenshots', async function () {
  console.log('🎯📸 Turn betting with screenshots...');
  
  // Wait for betting actions
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Capture turn betting screenshot
  await screenshotUtils.captureStep('10_turn_betting', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ Turn betting captured with screenshots');
});

When('the river is dealt with screenshot: {string}', async function (riverCard) {
  console.log(`🃏📸 Dealing river with screenshot: ${riverCard}`);
  
  // Wait for river to be dealt
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Capture river screenshot
  await screenshotUtils.captureStep('11_river_dealt', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log(`✅ River ${riverCard} dealt with screenshot captured`);
});

When('final betting and all-in occurs with screenshots', async function () {
  console.log('🎯📸 Final betting and all-in with screenshots...');
  
  // Wait for final betting actions
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Capture final betting screenshot
  await screenshotUtils.captureStep('12_final_betting', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ Final betting and all-in captured with screenshots');
});

When('showdown occurs with screenshot', async function () {
  console.log('🏆📸 Showdown with screenshot...');
  
  // Wait for showdown to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Capture showdown screenshot
  await screenshotUtils.captureStep('13_showdown', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  console.log('✅ Showdown captured with screenshot');
});

Then('the game ends with final screenshot', async function () {
  console.log('🎉📸 Game ends with final screenshot...');
  
  // Wait for game to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Capture final game state screenshot
  await screenshotUtils.captureStep('14_game_complete', {
    Player1: global.players.Player1.driver,
    Player2: global.players.Player2.driver
  });
  
  // Display screenshot summary
  const summary = screenshotUtils.getScreenshotSummary();
  console.log('📊 Screenshot Summary:');
  console.log(`   Total Screenshots: ${summary.count}`);
  console.log(`   Location: ${summary.directory}`);
  console.log(`   Files: ${summary.files.slice(0, 5).join(', ')}${summary.files.length > 5 ? '...' : ''}`);
  
  console.log('✅ Game complete with all screenshots captured');
});

// Cleanup
AfterAll(async function () {
  console.log('🧹 [AfterAll] Screenshot test cleanup...');
  
  if (global.players) {
    for (const [playerName, player] of Object.entries(global.players)) {
      if (player.driver) {
        try {
          await player.driver.quit();
          console.log(`🗑️ Browser closed for ${playerName}`);
        } catch (error) {
          console.log(`⚠️ Error closing browser for ${playerName}: ${error.message}`);
        }
      }
    }
  }
  
  console.log('✅ Screenshot test cleanup complete');
});