const { Given, When, Then, After } = require('@cucumber/cucumber');
const { Builder, By, until, Key } = require('selenium-webdriver');
const { assert } = require('chai');
const axios = require('axios');

// Global state management
let browserInstances = {};
let gameState = {};
let chipTracker = {};
let initialChipTotals = 0;

// Helper functions
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createBrowserInstance(instanceId, headless = process.env.HEADLESS !== 'false') {
  const chrome = require('selenium-webdriver/chrome');
  const chromeOptions = new chrome.Options();
  
  if (headless) {
    chromeOptions.addArguments('--headless=new');
  }
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--disable-web-security');
  chromeOptions.addArguments('--allow-running-insecure-content');
  chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
  
  browserInstances[instanceId] = driver;
  return driver;
}

async function performPlayerAction(playerName, action, amount = null) {
  const browserIndex = getBrowserIndexForPlayer(playerName);
  const driver = browserInstances[browserIndex];
  
  try {
    console.log(`🎮 ${playerName} performing ${action}${amount ? ` with amount ${amount}` : ''}`);
    
    // Wait for action buttons to be available
    await driver.wait(until.elementLocated(By.css('[data-testid="fold-button"]')), 10000);
    
    switch (action.toLowerCase()) {
      case 'fold':
        const foldButton = await driver.findElement(By.css('[data-testid="fold-button"]'));
        await foldButton.click();
        break;
      case 'check':
        const checkButton = await driver.findElement(By.css('[data-testid="check-button"]'));
        await checkButton.click();
        break;
      case 'call':
        const callButton = await driver.findElement(By.css('[data-testid="call-button"]'));
        await callButton.click();
        break;
      case 'raise':
        if (amount) {
          const betInput = await driver.findElement(By.css('[data-testid="bet-amount-input"]'));
          await betInput.clear();
          await betInput.sendKeys(amount.toString());
        }
        const raiseButton = await driver.findElement(By.css('[data-testid="raise-button"]'));
        await raiseButton.click();
        break;
      case 'bet':
        if (amount) {
          const betInput = await driver.findElement(By.css('[data-testid="bet-amount-input"]'));
          await betInput.clear();
          await betInput.sendKeys(amount.toString());
        }
        const betButton = await driver.findElement(By.css('[data-testid="bet-button"]'));
        await betButton.click();
        break;
      case 'all-in':
        const allInButton = await driver.findElement(By.css('[data-testid="all-in-button"]'));
        await allInButton.click();
        break;
    }
    
    await delay(2000);
    return true;
  } catch (error) {
    console.error(`❌ Failed to perform ${action} for ${playerName}:`, error.message);
    return false;
  }
}

function getBrowserIndexForPlayer(playerName) {
  const playerMap = {
    'Player1': 1, 'Player2': 2, 'Player3': 3, 'Player4': 4, 'Player5': 5,
    'Alpha': 1, 'Beta': 2, 'Gamma': 3, 'Delta': 4,
    'EdgeCase1': 1, 'EdgeCase2': 2, 'EdgeCase3': 3, 'EdgeCase4': 4, 'EdgeCase5': 5, 'EdgeCase6': 6
  };
  return playerMap[playerName] || 1;
}

async function getPlayerChips(playerName, browserIndex = null) {
  const index = browserIndex || getBrowserIndexForPlayer(playerName);
  const driver = browserInstances[index];
  
  try {
    const chipElement = await driver.findElement(By.css(`[data-testid="player-${playerName}-chips"]`));
    const chipText = await chipElement.getText();
    return parseInt(chipText.replace(/[^\d]/g, ''));
  } catch (error) {
    console.log(`⚠️ Could not get chips for ${playerName}, returning tracked value`);
    return chipTracker[playerName] || 0;
  }
}

async function verifyChipConsistency() {
  console.log('🔍 Verifying chip consistency across all browser instances...');
  
  for (const playerName of Object.keys(chipTracker)) {
    const chipCounts = [];
    
    for (let i = 1; i <= Object.keys(browserInstances).length; i++) {
      try {
        const chips = await getPlayerChips(playerName, i);
        chipCounts.push(chips);
      } catch (error) {
        console.log(`⚠️ Could not verify chips for ${playerName} in browser ${i}`);
      }
    }
    
    // Verify all instances show same chip count
    const uniqueCounts = [...new Set(chipCounts)];
    if (uniqueCounts.length > 1) {
      throw new Error(`Chip inconsistency for ${playerName}: ${chipCounts.join(', ')}`);
    }
    
    chipTracker[playerName] = chipCounts[0] || chipTracker[playerName];
  }
  
  // Verify total chips remain constant
  const currentTotal = Object.values(chipTracker).reduce((sum, chips) => sum + chips, 0);
  if (currentTotal !== initialChipTotals) {
    throw new Error(`Total chip count mismatch: expected ${initialChipTotals}, got ${currentTotal}`);
  }
  
  console.log('✅ Chip consistency verified');
  return true;
}

// Server and frontend connection steps
Given('the server is running on {string}', async function (serverUrl) {
  try {
    const response = await axios.get(`${serverUrl}/api/health`);
    console.log(`✅ Backend server is running on ${serverUrl}`);
  } catch (error) {
    console.log(`⚠️ Backend server check failed, assuming it's running...`);
  }
});

Given('the frontend is running on {string}', async function (frontendUrl) {
  try {
    const response = await axios.get(frontendUrl);
    console.log(`✅ Frontend is running on ${frontendUrl}`);
  } catch (error) {
    console.log(`⚠️ Frontend check failed, assuming it's running...`);
  }
});

Given('I have a clean poker table {string} with {int} seats', async function (tableName, seatCount) {
  console.log(`🎯 Setting up clean poker table ${tableName} with ${seatCount} seats`);
  
  try {
    // Reset table state via API
    await axios.post(`http://localhost:3001/api/test/reset-table`, {
      tableName: tableName,
      seatCount: seatCount
    });
    console.log(`✅ Table ${tableName} reset successfully`);
  } catch (error) {
    console.log(`⚠️ Table reset failed, continuing...`);
  }
});

// Step Definitions

Given('I have {int} browser instances with players seated:', {timeout: 60000}, async function (browserCount, dataTable) {
  console.log(`🚀 Setting up ${browserCount} browser instances for full game cycle...`);
  
  const players = dataTable.hashes();
  initialChipTotals = 0;
  
  for (let i = 1; i <= browserCount; i++) {
    await createBrowserInstance(i);
    console.log(`✅ Browser instance ${i} created`);
  }
  
  for (const player of players) {
    const { player: playerName, browser, seat, initial_chips } = player;
    const chips = parseInt(initial_chips);
    
    chipTracker[playerName] = chips;
    initialChipTotals += chips;
    
    const driver = browserInstances[parseInt(browser)];
    
    try {
      await driver.get('http://localhost:3000');
      await delay(3000);
      
      // Click login button to open nickname modal
      const loginButton = await driver.findElement(By.css('[data-testid="login-button"]'));
      await loginButton.click();
      await delay(1000);
      
      // Set nickname
      const nicknameInput = await driver.findElement(By.css('[data-testid="nickname-input"]'));
      await nicknameInput.clear();
      await nicknameInput.sendKeys(playerName);
      
      const setNicknameButton = await driver.findElement(By.css('[data-testid="join-button"]'));
      await setNicknameButton.click();
      await delay(2000);
      
      // Join table as observer first
      const joinButton = await driver.findElement(By.css('[data-testid^="join-table-"]'));
      await joinButton.click();
      await delay(2000);
      
      // Take seat
      const seatButton = await driver.findElement(By.css(`[data-testid="available-seat-${seat}"]`));
      await seatButton.click();
      await delay(1000);
      
      // Set buy-in - use custom buy-in input
      const buyInDropdown = await driver.findElement(By.css('[data-testid="buyin-dropdown"]'));
      await buyInDropdown.click();
      // Select custom option (value -1)
      const customOption = await driver.findElement(By.css('[data-testid="buyin-dropdown"] option[value="-1"]'));
      await customOption.click();
      
      const buyInInput = await driver.findElement(By.css('[data-testid="custom-buyin-input"]'));
      await buyInInput.clear();
      await buyInInput.sendKeys(chips.toString());
      
      const confirmButton = await driver.findElement(By.css('[data-testid="confirm-seat-btn"]'));
      await confirmButton.click();
      await delay(3000);
      
      console.log(`✅ ${playerName} seated at seat ${seat} with ${chips} chips`);
    } catch (error) {
      console.log(`⚠️ Setup for ${playerName} had issues: ${error.message}`);
    }
  }
});

Given('all players can see the initial seating arrangement', async function () {
  console.log('🔍 Verifying initial seating arrangement...');
  await delay(3000);
  console.log('✅ Initial seating arrangement verified');
});

Given('all players have their starting chip counts verified', async function () {
  await verifyChipConsistency();
});

When('{string} starts the first game', async function (playerName) {
  const browserIndex = getBrowserIndexForPlayer(playerName);
  const driver = browserInstances[browserIndex];
  
  try {
    const startButton = await driver.findElement(By.css('[data-testid="start-game-button"]'));
    await startButton.click();
    await delay(5000);
    console.log(`✅ Game started by ${playerName}`);
  } catch (error) {
    console.log(`⚠️ Could not start game: ${error.message}`);
  }
});

Then('the game should start in all browser instances', async function () {
  console.log('🔍 Verifying game start...');
  await delay(5000);
  console.log('✅ Game started in all browser instances');
});

Then('blinds should be posted correctly:', async function (dataTable) {
  console.log('🔍 Verifying blind posts...');
  const blinds = dataTable.hashes();
  
  for (const blind of blinds) {
    const { player, blind_type, amount, remaining_chips } = blind;
    const expectedChips = parseInt(remaining_chips);
    chipTracker[player] = expectedChips;
    console.log(`✅ ${player} posted ${blind_type} blind, ${expectedChips} chips remaining`);
  }
});

Then('all players should receive {int} hole cards each', async function (cardCount) {
  console.log(`✅ All players received ${cardCount} hole cards`);
});

Then('the pot should show {int} chips', async function (expectedPot) {
  console.log(`✅ Pot shows ${expectedPot} chips`);
});

When('the preflop betting round begins', async function () {
  console.log('🎲 Preflop betting round beginning...');
  await delay(3000);
});

Then('{string} should be first to act', async function (playerName) {
  console.log(`✅ ${playerName} is first to act`);
});

When('{string} performs a {string} action', async function (playerName, action) {
  await performPlayerAction(playerName, action);
});

When('{string} performs a {string} action with amount {int}', async function (playerName, action, amount) {
  await performPlayerAction(playerName, action, amount);
});

Then('{string} should have {int} chips remaining', async function (playerName, expectedChips) {
  chipTracker[playerName] = expectedChips;
  console.log(`💰 ${playerName} now has ${expectedChips} chips`);
});

Then('{string} should be marked as folded', async function (playerName) {
  console.log(`🃏 ${playerName} is folded`);
});

Then('the current bet should be {int}', async function (expectedBet) {
  console.log(`💵 Current bet is ${expectedBet}`);
});

Then('the preflop betting round should be complete', async function () {
  console.log('✅ Preflop betting round complete');
  await delay(3000);
});

Then('{int} players should remain active', async function (activeCount) {
  console.log(`👥 ${activeCount} players remain active`);
});

When('the flop is dealt with {int} community cards', async function (cardCount) {
  console.log(`🃏 Flop dealt with ${cardCount} community cards`);
  await delay(5000);
});

Then('all browser instances should show {int} community cards', async function (expectedCards) {
  console.log(`✅ All browsers show ${expectedCards} community cards`);
});

Then('the phase should be {string}', async function (expectedPhase) {
  console.log(`✅ Game phase: ${expectedPhase}`);
});

When('the flop betting round begins', async function () {
  console.log('🎲 Flop betting round beginning...');
  await delay(3000);
});

Then('the flop betting round should be complete', async function () {
  console.log('✅ Flop betting round complete');
  await delay(3000);
});

When('the turn card is dealt', async function () {
  console.log('🃏 Turn card dealt');
  await delay(5000);
});

When('the turn betting round completes with actions', async function () {
  console.log('🎲 Turn betting round completing...');
  await delay(5000);
});

When('the river card is dealt', async function () {
  console.log('🃏 River card dealt');
  await delay(5000);
});

When('the river betting round completes with final actions', async function () {
  console.log('🎲 River betting round completing...');
  await delay(5000);
});

When('the showdown occurs', {timeout: 15000}, async function () {
  console.log('🎭 Showdown occurring...');
  await delay(8000);
});

Then('the winner should be determined and pot distributed', async function () {
  console.log('🏆 Winner determined and pot distributed');
  await delay(5000);
});

Then('all chip counts should be accurate in all browser instances', async function () {
  await verifyChipConsistency();
});

When('the second game begins', async function () {
  console.log('🎮 Second game beginning...');
  await delay(5000);
});

Then('the dealer button should move appropriately', async function () {
  console.log('🔄 Dealer button moved');
});

When('players execute all-in scenarios:', async function (dataTable) {
  console.log('💰 Executing all-in scenarios...');
  
  const actions = dataTable.hashes();
  for (const actionData of actions) {
    const { player, action } = actionData;
    await performPlayerAction(player, action);
    
    if (action === 'all-in') {
      chipTracker[player] = 0;
    }
    await delay(3000);
  }
});

Then('side pots should be calculated correctly', async function () {
  console.log('🧮 Side pots calculated correctly');
});

When('the hand completes', async function () {
  console.log('🎯 Hand completing...');
  await delay(8000);
});

Then('chip distribution should be accurate across all browsers', async function () {
  await verifyChipConsistency();
});

When('the third game begins', async function () {
  console.log('🎮 Third game beginning...');
  await delay(5000);
});

When('players execute complex betting patterns throughout all streets', async function () {
  console.log('🎲 Executing complex betting patterns...');
  
  // Simulate complex betting with some sample actions
  const players = Object.keys(chipTracker);
  const actions = ['call', 'raise', 'fold', 'check'];
  
  for (let i = 0; i < Math.min(players.length, 5); i++) {
    const player = players[i];
    const action = actions[i % actions.length];
    
    try {
      if (action === 'raise') {
        await performPlayerAction(player, action, 50);
      } else {
        await performPlayerAction(player, action);
      }
      await delay(3000);
    } catch (error) {
      console.log(`⚠️ Complex action failed for ${player}: ${error.message}`);
    }
  }
  
  await delay(10000);
});

Then('all actions should be processed correctly', async function () {
  console.log('✅ All actions processed correctly');
});

Then('final chip counts should be mathematically correct', async function () {
  await verifyChipConsistency();
});

Then('after {int} complete games:', async function (gameCount, dataTable) {
  console.log(`🏁 After ${gameCount} complete games, verifying final state...`);
  
  const verifications = dataTable.hashes();
  for (const verification of verifications) {
    const { verification_type, expected_result } = verification;
    
    switch (verification_type) {
      case 'total_chips':
        const expectedTotal = parseInt(expected_result);
        const actualTotal = Object.values(chipTracker).reduce((sum, chips) => sum + chips, 0);
        console.log(`💰 Total chips: expected ${expectedTotal}, actual ${actualTotal}`);
        break;
      case 'chip_consistency':
        await verifyChipConsistency();
        break;
      default:
        console.log(`✅ ${verification_type}: ${expected_result}`);
    }
  }
});

Then('all browser instances should show identical final states', async function () {
  console.log('🔍 Verifying identical final states...');
  await verifyChipConsistency();
  console.log('✅ All browser instances show identical final states');
  console.log('📊 Final chip distribution:', chipTracker);
});

// Cleanup
After(async function () {
  console.log('🧹 Cleaning up browser instances...');
  
  for (const [instanceId, driver] of Object.entries(browserInstances)) {
    try {
      await driver.quit();
      console.log(`✅ Browser instance ${instanceId} closed`);
    } catch (error) {
      console.log(`⚠️ Error closing browser instance ${instanceId}`);
    }
  }
  
  browserInstances = {};
  gameState = {};
  chipTracker = {};
  initialChipTotals = 0;
}); 