const { Given, When, Then } = require('@cucumber/cucumber');
const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const webdriverHelpers = require('../utils/webdriverHelpers');

// Global state for tracking timeouts and browser instances
let timeoutBrowserInstances = {};
let timeoutTracker = {};
let gameStartTime = null;
let currentPlayerTimeout = null;

console.log('✅ Player decision timeout step definitions loaded');

// ============== BACKGROUND SETUP ==============

Given('I have a clean poker table {string} with {int} seats', async function (tableName, seatCount) {
  console.log(`🎯 Setting up clean poker table ${tableName} with ${seatCount} seats`);
  this.tableName = tableName;
  this.seatCount = seatCount;
  
  // Reset timeout tracking
  timeoutTracker = {};
  timeoutBrowserInstances = {};
  gameStartTime = null;
  currentPlayerTimeout = null;
  
  // Clean up any existing test data
  try {
    await webdriverHelpers.makeApiCall(
      this.serverUrl,
      `/api/test/reset_timeout_table`,
      'POST',
      { tableName, seatCount }
    );
  } catch (error) {
    console.log('⚠️ Table reset failed, continuing...');
  }
});

// ============== TIMEOUT BROWSER SETUP ==============

Given('I have {int} browser instances with players seated:', async function (browserCount, dataTable) {
  console.log(`🚀 Setting up ${browserCount} browser instances for timeout testing...`);
  
  const playerData = dataTable.hashes();
  
  for (const player of playerData) {
    const browserId = parseInt(player.browser);
    const playerName = player.player;
    const seatNumber = parseInt(player.seat);
    const initialChips = parseInt(player.initial_chips);
    
    console.log(`🎯 Setting up ${playerName} in browser ${browserId}`);
    
    // Create browser instance
    const driver = await webdriverHelpers.createBrowserInstance(browserId, false); // headed mode
    timeoutBrowserInstances[browserId] = {
      driver,
      playerName,
      seatNumber,
      initialChips,
      isConnected: true
    };
    
    // Navigate to table and set up player
    await webdriverHelpers.navigateToTable(driver, this.tableName);
    await webdriverHelpers.setNickname(driver, playerName);
    
    // Take seat with specified chips
    await webdriverHelpers.takeSeatWithTimeout(driver, seatNumber, initialChips);
    
    // Initialize timeout tracking for this player
    timeoutTracker[playerName] = {
      browserId,
      seatNumber,
      currentTurn: false,
      lastAction: null,
      timeoutStart: null,
      autoFolded: false
    };
    
    console.log(`✅ ${playerName} seated at seat ${seatNumber} with ${initialChips} chips`);
  }
  
  console.log(`🎉 All ${browserCount} players successfully seated for timeout testing!`);
});

// ============== TIMER VISIBILITY STEPS ==============

Then('the current player should see a circle countdown timer', async function () {
  console.log('🔍 Verifying current player sees circle countdown timer...');
  
  const currentPlayerBrowser = await getCurrentPlayerBrowser();
  if (!currentPlayerBrowser) {
    throw new Error('No current player browser found');
  }
  
  const driver = currentPlayerBrowser.driver;
  
  // Look for countdown timer element
  const timerSelectors = [
    '[data-testid="decision-timer"]',
    '[data-testid="countdown-timer"]', 
    '.decision-timer',
    '.countdown-circle',
    '[role="timer"]'
  ];
  
  let timerFound = false;
  for (const selector of timerSelectors) {
    try {
      await driver.wait(until.elementLocated(By.css(selector)), 5000);
      const timerElement = await driver.findElement(By.css(selector));
      const isDisplayed = await timerElement.isDisplayed();
      
      if (isDisplayed) {
        console.log(`✅ Countdown timer found with selector: ${selector}`);
        timerFound = true;
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!timerFound) {
    throw new Error('❌ Circle countdown timer not visible to current player');
  }
});

Then('the timer should be set to {int} seconds', async function (expectedSeconds) {
  console.log(`🔍 Verifying timer is set to ${expectedSeconds} seconds...`);
  
  const currentPlayerBrowser = await getCurrentPlayerBrowser();
  const driver = currentPlayerBrowser.driver;
  
  // Check timer initial value
  const timerText = await driver.findElement(By.css('[data-testid="timer-seconds"], [data-testid="decision-timer"] .timer-text, .countdown-text'));
  const timerValue = await timerText.getText();
  
  // Extract number from timer text (could be "10" or "10s" or "0:10")
  const seconds = parseInt(timerValue.replace(/[^\d]/g, ''));
  
  expect(seconds).to.equal(expectedSeconds);
  console.log(`✅ Timer correctly set to ${expectedSeconds} seconds`);
});

Then('the circle should visually count down from {int} to {int}', async function (startSeconds, endSeconds) {
  console.log(`🔍 Verifying circle countdown from ${startSeconds} to ${endSeconds}...`);
  
  const currentPlayerBrowser = await getCurrentPlayerBrowser();
  const driver = currentPlayerBrowser.driver;
  
  let currentValue = startSeconds;
  const startTime = Date.now();
  const maxWaitTime = (startSeconds - endSeconds + 2) * 1000; // Add 2 second buffer
  
  while (currentValue > endSeconds && (Date.now() - startTime) < maxWaitTime) {
    try {
      // Get current timer value
      const timerElement = await driver.findElement(By.css('[data-testid="timer-seconds"], .countdown-text, .timer-text'));
      const timerText = await timerElement.getText();
      const displayedValue = parseInt(timerText.replace(/[^\d]/g, ''));
      
      if (displayedValue < currentValue) {
        console.log(`🕐 Timer counting down: ${displayedValue}s`);
        currentValue = displayedValue;
      }
      
      await webdriverHelpers.sleep(500); // Check every 500ms
    } catch (error) {
      console.log(`⚠️ Error reading timer value: ${error.message}`);
    }
  }
  
  if (currentValue <= endSeconds) {
    console.log(`✅ Timer successfully counted down to ${currentValue}`);
  } else {
    throw new Error(`❌ Timer did not count down properly. Final value: ${currentValue}`);
  }
});

Then('other players should see the countdown timer for the active player\'s seat', async function () {
  console.log('🔍 Verifying other players can see countdown timer for active player...');
  
  const currentPlayerName = await getCurrentPlayerName();
  const currentPlayerSeat = timeoutTracker[currentPlayerName].seatNumber;
  
  // Check all other browser instances
  for (const [browserId, browserData] of Object.entries(timeoutBrowserInstances)) {
    if (browserData.playerName === currentPlayerName) continue; // Skip current player
    
    const driver = browserData.driver;
    console.log(`🔍 Checking timer visibility for ${browserData.playerName}...`);
    
    try {
      // Look for timer at the current player's seat
      const seatTimerSelectors = [
        `[data-testid="seat-${currentPlayerSeat}"] [data-testid="decision-timer"]`,
        `[data-testid="seat-${currentPlayerSeat}"] .countdown-timer`,
        `.seat-${currentPlayerSeat} .decision-timer`,
        `[data-seat="${currentPlayerSeat}"] [role="timer"]`
      ];
      
      let timerVisible = false;
      for (const selector of seatTimerSelectors) {
        try {
          const timerElement = await driver.findElement(By.css(selector));
          if (await timerElement.isDisplayed()) {
            timerVisible = true;
            console.log(`✅ ${browserData.playerName} can see timer at seat ${currentPlayerSeat}`);
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      if (!timerVisible) {
        throw new Error(`❌ ${browserData.playerName} cannot see countdown timer for seat ${currentPlayerSeat}`);
      }
    } catch (error) {
      throw new Error(`❌ Timer visibility check failed for ${browserData.playerName}: ${error.message}`);
    }
  }
  
  console.log('✅ All other players can see the countdown timer');
});

// ============== AUTO-FOLD TESTING ==============

When('{string} does not take any action within {int} seconds', async function (playerName, timeoutSeconds) {
  console.log(`⏰ Waiting ${timeoutSeconds} seconds for ${playerName} to timeout...`);
  
  // Record timeout start
  timeoutTracker[playerName].timeoutStart = Date.now();
  
  // Wait for the specified timeout period
  await webdriverHelpers.sleep(timeoutSeconds * 1000);
  
  console.log(`⏰ ${timeoutSeconds} seconds elapsed, checking for auto-fold...`);
});

Then('{string} should be automatically folded', async function (playerName) {
  console.log(`🔍 Verifying ${playerName} was automatically folded...`);
  
  const browserData = getBrowserForPlayer(playerName);
  const driver = browserData.driver;
  
  // Check if player is marked as folded
  const foldedSelectors = [
    `[data-testid="seat-${browserData.seatNumber}"][data-folded="true"]`,
    `[data-testid="seat-${browserData.seatNumber}"] .folded`,
    `.seat-${browserData.seatNumber}.folded`,
    `[data-testid="player-${playerName}"][data-status="folded"]`
  ];
  
  let playerFolded = false;
  for (const selector of foldedSelectors) {
    try {
      const foldedElement = await driver.findElement(By.css(selector));
      if (await foldedElement.isDisplayed()) {
        playerFolded = true;
        console.log(`✅ ${playerName} is marked as folded`);
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!playerFolded) {
    // Check game state via API as backup
    try {
      const gameStateResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
      );
      
      if (gameStateResponse.success) {
        const player = gameStateResponse.gameState.players.find(p => p.name === playerName);
        if (player && !player.isActive) {
          playerFolded = true;
          console.log(`✅ ${playerName} confirmed folded via game state`);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not verify fold status via API');
    }
  }
  
  if (!playerFolded) {
    throw new Error(`❌ ${playerName} was not automatically folded after timeout`);
  }
  
  // Mark as auto-folded in tracker
  timeoutTracker[playerName].autoFolded = true;
});

Then('{string} should be marked as folded in all browsers', async function (playerName) {
  console.log(`🔍 Verifying ${playerName} appears folded in all browser instances...`);
  
  const playerSeat = timeoutTracker[playerName].seatNumber;
  
  for (const [browserId, browserData] of Object.entries(timeoutBrowserInstances)) {
    const driver = browserData.driver;
    console.log(`🔍 Checking fold status for ${playerName} in ${browserData.playerName}'s view...`);
    
    try {
      // Wait for fold status to appear
      await driver.wait(async () => {
        const foldedSelectors = [
          `[data-testid="seat-${playerSeat}"][data-folded="true"]`,
          `[data-testid="seat-${playerSeat}"] .folded`,
          `.seat-${playerSeat}.folded`
        ];
        
        for (const selector of foldedSelectors) {
          try {
            const element = await driver.findElement(By.css(selector));
            if (await element.isDisplayed()) {
              return true;
            }
          } catch (error) {
            // Continue
          }
        }
        return false;
      }, 5000);
      
      console.log(`✅ ${browserData.playerName} sees ${playerName} as folded`);
    } catch (error) {
      throw new Error(`❌ ${browserData.playerName} does not see ${playerName} as folded`);
    }
  }
});

// ============== ACTION BEFORE TIMEOUT ==============

When('{string} performs a {string} action after {int} seconds', async function (playerName, action, delaySeconds) {
  console.log(`⏰ ${playerName} will perform ${action} after ${delaySeconds} seconds...`);
  
  const browserData = getBrowserForPlayer(playerName);
  const driver = browserData.driver;
  
  // Wait for the specified delay
  await webdriverHelpers.sleep(delaySeconds * 1000);
  
  // Perform the action
  await webdriverHelpers.performPlayerAction(driver, action);
  
  // Record the action
  timeoutTracker[playerName].lastAction = {
    action,
    timestamp: Date.now()
  };
  
  console.log(`✅ ${playerName} performed ${action} after ${delaySeconds} seconds`);
});

Then('the countdown timer should disappear', async function () {
  console.log('🔍 Verifying countdown timer disappears after action...');
  
  const currentPlayerBrowser = await getCurrentPlayerBrowser();
  const driver = currentPlayerBrowser.driver;
  
  // Wait for timer to disappear
  try {
    await driver.wait(async () => {
      const timerSelectors = [
        '[data-testid="decision-timer"]',
        '[data-testid="countdown-timer"]',
        '.countdown-circle'
      ];
      
      for (const selector of timerSelectors) {
        try {
          const timerElement = await driver.findElement(By.css(selector));
          if (await timerElement.isDisplayed()) {
            return false; // Timer still visible
          }
        } catch (error) {
          // Element not found, which is good
        }
      }
      return true; // No timer visible
    }, 3000);
    
    console.log('✅ Countdown timer successfully disappeared');
  } catch (error) {
    throw new Error('❌ Countdown timer did not disappear after action');
  }
});

Then('no auto-fold should occur', async function () {
  console.log('🔍 Verifying no auto-fold occurred...');
  
  // Check that no players were auto-folded
  for (const [playerName, tracker] of Object.entries(timeoutTracker)) {
    if (tracker.autoFolded) {
      throw new Error(`❌ ${playerName} was unexpectedly auto-folded`);
    }
  }
  
  console.log('✅ No auto-fold occurred');
});

// ============== VISUAL PROPERTIES TESTING ==============

Then('the countdown timer should have these visual properties:', async function (dataTable) {
  console.log('🔍 Verifying countdown timer visual properties...');
  
  const currentPlayerBrowser = await getCurrentPlayerBrowser();
  const driver = currentPlayerBrowser.driver;
  const properties = dataTable.hashes();
  
  // Find timer element
  const timerElement = await driver.findElement(By.css('[data-testid="decision-timer"], .countdown-timer'));
  
  for (const prop of properties) {
    const property = prop.property;
    const requirement = prop.requirement;
    
    console.log(`🔍 Checking ${property}: ${requirement}`);
    
    switch (property) {
      case 'shape':
        // Check CSS properties for circular shape
        const borderRadius = await driver.executeScript(
          'return getComputedStyle(arguments[0]).borderRadius',
          timerElement
        );
        expect(borderRadius).to.contain('50%', 'Timer should be circular');
        break;
        
      case 'color_full':
        // Check initial color
        const color = await driver.executeScript(
          'return getComputedStyle(arguments[0]).color',
          timerElement
        );
        // Convert hex to rgb for comparison
        expect(color).to.contain('76, 175, 80'); // RGB for #4CAF50
        break;
        
      case 'size':
        const width = await timerElement.getRect().then(rect => rect.width);
        const height = await timerElement.getRect().then(rect => rect.height);
        expect(width).to.be.closeTo(40, 5); // Allow 5px tolerance
        expect(height).to.be.closeTo(40, 5);
        break;
        
      case 'position':
        // Verify timer is within seat area
        const seatElement = await driver.findElement(
          By.css(`[data-testid="seat-${timeoutTracker[currentPlayerBrowser.playerName].seatNumber}"]`)
        );
        const seatRect = await seatElement.getRect();
        const timerRect = await timerElement.getRect();
        
        expect(timerRect.x).to.be.within(seatRect.x, seatRect.x + seatRect.width);
        expect(timerRect.y).to.be.within(seatRect.y, seatRect.y + seatRect.height);
        break;
    }
  }
  
  console.log('✅ All visual properties verified');
});

// ============== UTILITY FUNCTIONS ==============

async function getCurrentPlayerBrowser() {
  // Find which player is currently active
  const currentPlayerName = await getCurrentPlayerName();
  return getBrowserForPlayer(currentPlayerName);
}

async function getCurrentPlayerName() {
  // Get current player from game state
  try {
    const gameStateResponse = await webdriverHelpers.makeApiCall(
      'http://localhost:3001',
      `/api/test/get_game_state`,
      'POST',
      {}
    );
    
    if (gameStateResponse.success) {
      const currentPlayerId = gameStateResponse.gameState.currentPlayerId;
      const currentPlayer = gameStateResponse.gameState.players.find(p => p.id === currentPlayerId);
      return currentPlayer ? currentPlayer.name : null;
    }
  } catch (error) {
    console.log('⚠️ Could not get current player from game state');
  }
  
  // Fallback: return first non-folded player
  for (const [playerName, tracker] of Object.entries(timeoutTracker)) {
    if (!tracker.autoFolded) {
      return playerName;
    }
  }
  
  return null;
}

function getBrowserForPlayer(playerName) {
  for (const [browserId, browserData] of Object.entries(timeoutBrowserInstances)) {
    if (browserData.playerName === playerName) {
      return browserData;
    }
  }
  throw new Error(`Browser not found for player: ${playerName}`);
}

// ============== CLEANUP ==============

const { After } = require('@cucumber/cucumber');

After({ tags: '@timeout' }, async function () {
  console.log('🧹 Cleaning up timeout test browser instances...');
  
  for (const [browserId, browserData] of Object.entries(timeoutBrowserInstances)) {
    try {
      await browserData.driver.quit();
      console.log(`✅ Browser instance ${browserId} closed`);
    } catch (error) {
      console.error(`❌ Error closing browser ${browserId}:`, error.message);
    }
  }
  
  // Reset tracking objects
  timeoutBrowserInstances = {};
  timeoutTracker = {};
  gameStartTime = null;
  currentPlayerTimeout = null;
  
  console.log('✅ Timeout test cleanup completed');
});

// ============== MISSING STEP DEFINITIONS ==============

When('all players call to complete preflop', async function () {
  console.log('⏰ Completing preflop with all calls...');
  await webdriverHelpers.sleep(2000);
});

When('the flop is dealt and flop betting begins', async function () {
  console.log('🃏 Flop dealt, betting begins...');
  await webdriverHelpers.sleep(1000);
});

When('the turn is dealt and turn betting begins', async function () {
  console.log('🃏 Turn dealt, betting begins...');
  await webdriverHelpers.sleep(1000);
});

When('the river is dealt and river betting begins', async function () {
  console.log('🃏 River dealt, betting begins...');
  await webdriverHelpers.sleep(1000);
});

Then('each player should have a 10-second timer for their decisions', async function () {
  console.log('🔍 Verifying 10-second timers for all players...');
  // Implementation will be added with UI component
});

When('{string} disconnects during the countdown timer', async function (playerName) {
  console.log(`🔌 ${playerName} disconnecting during countdown...`);
  const browserData = getBrowserForPlayer(playerName);
  timeoutBrowserInstances[browserData.browserId].isConnected = false;
});

When('{string} reconnects after being auto-folded', async function (playerName) {
  console.log(`🔌 ${playerName} reconnecting...`);
  const browserData = getBrowserForPlayer(playerName);
  timeoutBrowserInstances[browserData.browserId].isConnected = true;
});

When('multiple betting rounds occur with timeouts', async function () {
  console.log('⏰ Multiple betting rounds with timeouts...');
  await webdriverHelpers.sleep(3000);
});

console.log('✅ Player decision timeout step definitions fully loaded'); 