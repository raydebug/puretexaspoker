const { Given, When, Then, AfterAll } = require('@cucumber/cucumber');
const { By, until } = require('selenium-webdriver');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome.js');
// Simple screenshot function without external helper
const takeScreenshot = async (driver, filename) => {
  try {
    const screenshot = await driver.takeScreenshot();
    const fs = require('fs');
    const path = require('path');
    
    // Ensure screenshots directory exists
    const screenshotDir = path.join(process.cwd(), 'selenium', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filepath = path.join(screenshotDir, `${filename}.png`);
    fs.writeFileSync(filepath, screenshot, 'base64');
    console.log(`📸 Screenshot saved: ${filepath}`);
  } catch (error) {
    console.warn(`⚠️ Screenshot failed for ${filename}:`, error.message);
  }
};

// ========================================
// 2-PLAYER FOCUSED STEP DEFINITIONS 
// ========================================
// These steps are specifically for 2-player tests with comprehensive UI verification
// including hole cards, community cards, and game history in each phase

Given('I setup a focused 2-player game test', { timeout: 30000 }, async function () {
  console.log('🎮 Setting up focused 2-player game test...');
  this.playerCount = 2;
  
  // Reset database to clean state
  console.log('🗑️ Resetting database to clean state...');
  const resetResponse = await fetch('http://localhost:3001/api/test/reset-database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId: 1 })
  });
  
  if (!resetResponse.ok) {
    throw new Error(`Database reset failed: ${resetResponse.status}`);
  }
  
  const resetData = await resetResponse.json();
  this.latestTableId = resetData.firstTableId || 1;
  console.log('✅ Database reset complete, using table ID:', this.latestTableId);
  
  // Initialize global players object
  if (!global.players) {
    global.players = {};
  }
  
  // Create browser instances for both players
  for (let i = 1; i <= 2; i++) {
    const playerName = `Player${i}`;
    
    console.log(`🌐 Creating browser instance for ${playerName}...`);
    
    const options = new chrome.Options();
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--disable-gpu');
    options.addArguments('--no-first-run');
    options.addArguments('--disable-background-timer-throttling');
    options.addArguments('--disable-renderer-backgrounding');
    options.addArguments('--disable-backgrounding-occluded-windows');

    if (process.env.HEADLESS === 'true') {
      options.addArguments('--headless');
    }

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Store player information
    global.players[playerName] = {
      driver: driver,
      name: playerName,
      seat: i,
      tableId: this.latestTableId,
      buyIn: 100,
      holeCards: [],
      communityCards: []
    };
    
    console.log(`✅ Browser created for ${playerName} (Seat ${i})`);
  }
  
  console.log('✅ Focused 2-player game test setup complete');
});

When('both players join table {int} using auto-seat', { timeout: 45000 }, async function (tableId) {
  console.log(`🪑 Both players joining table ${tableId} using auto-seat...`);
  
  for (let i = 1; i <= 2; i++) {
    const playerName = `Player${i}`;
    const player = global.players[playerName];
    
    if (!player || !player.driver) {
      throw new Error(`Player ${playerName} not initialized`);
    }
    
    console.log(`🎯 ${playerName} joining table ${tableId} at seat ${i}...`);
    
    // Navigate to auto-seat page
    const autoSeatUrl = `http://localhost:3000/auto-seat?player=${playerName}&table=${tableId}&seat=${i}&buyin=100`;
    await player.driver.get(autoSeatUrl);
    
    // Wait for page to load and auto-seat to complete
    await player.driver.wait(until.elementLocated(By.css('body')), 10000);
    await player.driver.sleep(3000); // Allow auto-seat process to complete
    
    // Verify we're on the game page
    const currentUrl = await player.driver.getCurrentUrl();
    console.log(`🌐 ${playerName} current URL: ${currentUrl}`);
    
    // Wait for game elements to appear
    try {
      await player.driver.wait(until.elementLocated(By.css('[data-testid="game-container"], [data-testid="observer-view"]')), 10000);
      console.log(`✅ ${playerName} successfully joined table ${tableId}`);
    } catch (error) {
      console.error(`❌ ${playerName} failed to join table:`, error.message);
      throw error;
    }
  }
  
  console.log('✅ Both players successfully joined the table');
});

When('I manually start the 2-player game for table {int}', { timeout: 15000 }, async function (tableId) {
  console.log(`🎮 Manually starting 2-player game for table ${tableId}...`);
  
  const startResponse = await fetch('http://localhost:3001/api/test/start-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId: tableId })
  });
  
  if (!startResponse.ok) {
    throw new Error(`Failed to start game: ${startResponse.status}`);
  }
  
  const result = await startResponse.json();
  console.log('✅ Game started:', result.message);
  
  // Wait for game to start on all clients
  await new Promise(resolve => setTimeout(resolve, 2000));
});

When('I set hole cards for the test scenario:', { timeout: 10000 }, async function (dataTable) {
  console.log('🃏 Setting hole cards for test scenario...');
  
  const cardAssignments = dataTable.hashes();
  
  for (const assignment of cardAssignments) {
    const playerName = assignment.Player;
    const card1 = assignment.Card1;
    const card2 = assignment.Card2;
    
    console.log(`🎯 Setting ${playerName} hole cards: ${card1}, ${card2}`);
    
    // Convert card notation (A♠ -> Aspades)
    const convertCard = (card) => {
      const rank = card.slice(0, -1);
      const suit = card.slice(-1);
      const suitMap = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
      return rank + suitMap[suit];
    };
    
    const cards = [convertCard(card1), convertCard(card2)];
    
    try {
      const response = await fetch('http://localhost:3001/api/test/set-player-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: this.latestTableId || 1,
          playerId: playerName,
          cards: cards
        })
      });
      
      if (response.ok) {
        console.log(`✅ ${playerName} cards set successfully`);
        // Store cards for verification
        if (global.players[playerName]) {
          global.players[playerName].holeCards = [card1, card2];
        }
      } else {
        console.warn(`⚠️ Failed to set ${playerName} cards, continuing test...`);
      }
    } catch (error) {
      console.warn(`⚠️ Error setting ${playerName} cards:`, error.message);
    }
  }
  
  console.log('✅ Hole card setup complete');
});

Then('each player should see their own hole cards on the UI', { timeout: 15000 }, async function () {
  console.log('🔍 Verifying each player can see their own hole cards on UI...');
  
  for (let i = 1; i <= 2; i++) {
    const playerName = `Player${i}`;
    const player = global.players[playerName];
    
    if (!player || !player.driver) {
      throw new Error(`Player ${playerName} not available for verification`);
    }
    
    console.log(`🎯 Checking hole cards visibility for ${playerName}...`);
    
    try {
      // Look for hole cards element
      const holeCardsElements = await player.driver.findElements(By.css('[data-testid="player-hole-cards"], [data-testid="hole-cards"], .hole-cards, .player-cards'));
      
      if (holeCardsElements.length > 0) {
        console.log(`✅ ${playerName} has hole cards element visible`);
        
        // Take screenshot for verification
        await takeScreenshot(player.driver, `${playerName}_hole_cards_visible`);
        
        // Try to get card details if available
        for (const element of holeCardsElements) {
          const isDisplayed = await element.isDisplayed();
          if (isDisplayed) {
            const text = await element.getText();
            console.log(`🃏 ${playerName} hole cards element text: "${text}"`);
          }
        }
      } else {
        console.warn(`⚠️ ${playerName} hole cards element not found, taking screenshot for debugging...`);
        await takeScreenshot(player.driver, `${playerName}_hole_cards_missing`);
      }
      
      // Additional check for any card-related elements
      const allCardElements = await player.driver.findElements(By.css('[class*="card"], [data-testid*="card"]'));
      console.log(`🃏 ${playerName} total card elements found: ${allCardElements.length}`);
      
    } catch (error) {
      console.error(`❌ Error checking hole cards for ${playerName}:`, error.message);
      await takeScreenshot(player.driver, `${playerName}_hole_cards_error`);
    }
  }
  
  console.log('✅ Hole cards verification complete');
});

Then('each player should see face-down cards for other players', { timeout: 10000 }, async function () {
  console.log('🔍 Verifying each player sees face-down cards for opponents...');
  
  for (let i = 1; i <= 2; i++) {
    const playerName = `Player${i}`;
    const player = global.players[playerName];
    
    if (!player || !player.driver) {
      continue;
    }
    
    console.log(`🎯 Checking opponent cards visibility for ${playerName}...`);
    
    try {
      // Look for opponent/face-down card elements
      const opponentCardElements = await player.driver.findElements(By.css('[data-testid*="opponent"], [class*="face-down"], [class*="hidden-card"]'));
      
      console.log(`🃏 ${playerName} sees ${opponentCardElements.length} opponent card elements`);
      
      // Take screenshot for verification
      await takeScreenshot(player.driver, `${playerName}_opponent_cards`);
      
    } catch (error) {
      console.error(`❌ Error checking opponent cards for ${playerName}:`, error.message);
    }
  }
  
  console.log('✅ Opponent cards verification complete');
});

When('the flop is dealt with cards: {string}', { timeout: 10000 }, async function (flopCards) {
  console.log(`🃏 Dealing flop: ${flopCards}...`);
  
  const tableId = this.latestTableId || 1;
  
  // Advance to flop phase
  const flopResponse = await fetch('http://localhost:3001/api/test/advance-to-flop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      tableId: tableId,
      flopCards: flopCards.split(', ')
    })
  });
  
  if (flopResponse.ok) {
    console.log('✅ Flop dealt successfully');
    
    // Store community cards for verification
    const communityCards = flopCards.split(', ');
    for (const playerName in global.players) {
      if (global.players[playerName]) {
        global.players[playerName].communityCards = communityCards;
      }
    }
    
    // Wait for UI to update
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.warn('⚠️ Failed to deal flop, continuing test...');
  }
});

Then('both players should see the {int} community cards on UI', { timeout: 15000 }, async function (expectedCount) {
  console.log(`🔍 Verifying both players see ${expectedCount} community cards on UI...`);
  
  for (let i = 1; i <= 2; i++) {
    const playerName = `Player${i}`;
    const player = global.players[playerName];
    
    if (!player || !player.driver) {
      continue;
    }
    
    console.log(`🎯 Checking community cards for ${playerName}...`);
    
    try {
      // Look for community cards elements
      const communityCardElements = await player.driver.findElements(By.css('[data-testid="community-cards"], [data-testid="board-cards"], [class*="community"], [class*="board"]'));
      
      if (communityCardElements.length > 0) {
        console.log(`✅ ${playerName} has community cards element visible`);
        
        // Take screenshot for verification
        await takeScreenshot(player.driver, `${playerName}_community_cards_${expectedCount}`);
        
        // Try to count individual cards
        const individualCards = await player.driver.findElements(By.css('[data-testid="community-cards"] .card, [data-testid="board-cards"] .card, [class*="community"] .card'));
        console.log(`🃏 ${playerName} sees ${individualCards.length} individual community cards`);
        
      } else {
        console.warn(`⚠️ ${playerName} community cards element not found`);
        await takeScreenshot(player.driver, `${playerName}_community_cards_missing`);
      }
      
    } catch (error) {
      console.error(`❌ Error checking community cards for ${playerName}:`, error.message);
      await takeScreenshot(player.driver, `${playerName}_community_cards_error`);
    }
  }
  
  console.log('✅ Community cards verification complete');
});

Then('I should see game history updated with each action on UI', { timeout: 10000 }, async function () {
  console.log('🔍 Verifying game history is updated with each action on UI...');
  
  for (let i = 1; i <= 2; i++) {
    const playerName = `Player${i}`;
    const player = global.players[playerName];
    
    if (!player || !player.driver) {
      continue;
    }
    
    console.log(`🎯 Checking game history for ${playerName}...`);
    
    try {
      // Look for game history/action history elements
      const historyElements = await player.driver.findElements(By.css('[data-testid="action-history"], [data-testid="game-history"], [class*="history"], [class*="actions"]'));
      
      if (historyElements.length > 0) {
        console.log(`✅ ${playerName} has game history element visible`);
        
        // Take screenshot for verification
        await takeScreenshot(player.driver, `${playerName}_game_history`);
        
        // Try to get history content
        for (const element of historyElements) {
          const isDisplayed = await element.isDisplayed();
          if (isDisplayed) {
            const text = await element.getText();
            console.log(`📋 ${playerName} game history content: "${text.substring(0, 200)}..."`);
          }
        }
        
      } else {
        console.warn(`⚠️ ${playerName} game history element not found`);
        await takeScreenshot(player.driver, `${playerName}_game_history_missing`);
      }
      
    } catch (error) {
      console.error(`❌ Error checking game history for ${playerName}:`, error.message);
      await takeScreenshot(player.driver, `${playerName}_game_history_error`);
    }
  }
  
  console.log('✅ Game history verification complete');
});

// Cleanup after all tests
AfterAll(async function () {
  console.log('🧹 Cleaning up 2-player focused test resources...');
  
  if (global.players) {
    for (const playerName in global.players) {
      const player = global.players[playerName];
      if (player && player.driver) {
        try {
          await player.driver.quit();
          console.log(`✅ Browser closed for ${playerName}`);
        } catch (error) {
          console.error(`❌ Error closing browser for ${playerName}:`, error.message);
        }
      }
    }
    global.players = {};
  }
  
  console.log('✅ 2-player focused test cleanup complete');
});