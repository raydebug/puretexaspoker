// =============================================================================
// SHARED TEST UTILITIES
// =============================================================================
// Common functions that can be reused by both 2-player and 5-player tests
// without causing step definition conflicts
// =============================================================================

const { execSync } = require('child_process');
const { By, until } = require('selenium-webdriver');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * Reset database and return table ID
 * @returns {Promise<number>} Table ID
 */
async function resetDatabaseShared() {
  console.log('🧹 Resetting database to clean state...');
  
  try {
    const resetResult = execSync('curl -s -X POST http://localhost:3001/api/test/reset-database', { encoding: 'utf8' });
    const resetResponse = JSON.parse(resetResult);
    
    if (resetResponse.success) {
      if (resetResponse.tables && resetResponse.tables.length > 0) {
        const tableId = resetResponse.tables[0].id;
        console.log(`✅ Database reset successful, table ID: ${tableId}`);
        return tableId;
      } else {
        console.log(`⚠️ No tables found in reset response`);
        return 1;
      }
    } else {
      console.log(`⚠️ Database reset response:`, resetResponse.error || 'Unknown error');
      return 1;
    }
  } catch (error) {
    console.log(`⚠️ Database reset failed: ${error.message}`);
    return 1;
  }
}

/**
 * Seat a player using the proven auto-seat API
 * @param {number} tableId - Table ID
 * @param {string} playerName - Player name
 * @param {number} seatNumber - Seat number
 * @param {number} buyIn - Buy-in amount
 * @returns {Promise<boolean>} Success status
 */
async function seatPlayerShared(tableId, playerName, seatNumber, buyIn = 100) {
  console.log(`⚡ API seating ${playerName} at seat ${seatNumber}...`);
  
  try {
    const seatApiCall = `curl -s -X POST http://localhost:3001/api/test/auto-seat -H "Content-Type: application/json" -d '{"tableId": ${tableId}, "playerName": "${playerName}", "seatNumber": ${seatNumber}, "buyIn": ${buyIn}}'`;
    const seatResult = execSync(seatApiCall, { encoding: 'utf8' });
    const seatResponse = JSON.parse(seatResult);
    
    if (seatResponse.success) {
      console.log(`✅ ${playerName} seated via API at table ${tableId}, seat ${seatNumber}`);
      return true;
    } else {
      console.log(`⚠️ API seating response for ${playerName}:`, seatResponse.error || 'Unknown error');
      return false;
    }
  } catch (seatError) {
    console.log(`⚠️ API seating failed for ${playerName}: ${seatError.message}`);
    return false;
  }
}

/**
 * Create a browser instance with standard configuration
 * @returns {Promise<WebDriver>} Browser driver
 */
async function createBrowserInstanceShared() {
  const options = new chrome.Options();
  if (process.env.HEADLESS === 'true') {
    options.addArguments('--headless');
  }
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1200,800'
  );
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  return driver;
}

/**
 * Navigate browser to game URL with retries
 * @param {WebDriver} driver - Browser driver
 * @param {number} tableId - Table ID
 * @returns {Promise<boolean>} Success status
 */
async function navigateToGameShared(driver, tableId) {
  const gameUrl = `http://localhost:3000/game?table=${tableId}`;
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 Navigating to: ${gameUrl} (attempt ${attempt}/${maxRetries})`);
      
      await driver.get(gameUrl);
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      await driver.sleep(2000); // Give more time for page load
      
      console.log(`✅ Navigation complete to ${gameUrl}`);
      return true;
    } catch (navError) {
      console.log(`⚠️ Navigation attempt ${attempt} failed: ${navError.message}`);
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying navigation in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log(`❌ Navigation failed after ${maxRetries} attempts`);
  return false;
}

/**
 * Start game for a specific table
 * @param {number} tableId - Table ID
 * @returns {Promise<boolean>} Success status
 */
async function startGameShared(tableId) {
  console.log(`🎮 Starting game for table ${tableId}...`);
  
  try {
    const startResult = execSync(`curl -s -X POST http://localhost:3001/api/test/start-game -H "Content-Type: application/json" -d '{"tableId": ${tableId}}'`, { encoding: 'utf8' });
    const startResponse = JSON.parse(startResult);
    
    if (startResponse.success) {
      console.log(`✅ Game started successfully for table ${tableId}`);
      return true;
    } else {
      console.log(`⚠️ Game start response:`, startResponse.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log(`⚠️ Game start failed: ${error.message}`);
    return false;
  }
}

/**
 * Cleanup browser instances from global.players
 * @returns {Promise<void>}
 */
async function cleanupBrowsersShared() {
  console.log('🧹 Cleaning up browser instances...');
  
  if (global.players) {
    for (const playerName of Object.keys(global.players)) {
      const playerInstance = global.players[playerName];
      if (playerInstance && playerInstance.driver) {
        try {
          await playerInstance.driver.quit();
          console.log(`✅ Browser closed for ${playerName}`);
        } catch (error) {
          console.log(`⚠️ Error closing browser for ${playerName}: ${error.message}`);
        }
      }
    }
  }
}

/**
 * Setup players for 5-player game
 * @param {number} tableId - Table ID
 * @returns {Promise<boolean>} Success status
 */
async function setup5PlayersShared(tableId) {
  console.log('🎮 Setting up 5 players for comprehensive poker game...');
  
  // Initialize global.players if not exists
  if (!global.players) {
    global.players = {};
  }
  
  // Create browser instances for 5 players with delay to prevent resource exhaustion
  for (let i = 1; i <= 5; i++) {
    const playerName = `Player${i}`;
    
    console.log(`🌐 Creating browser instance for ${playerName}...`);
    
    try {
      const driver = await createBrowserInstanceShared();
      
      // Store in global players object (matching 2-player pattern)
      global.players[playerName] = {
        driver: driver,
        seat: i,
        tableId: tableId,
        buyIn: 100
      };
      
      console.log(`✅ Browser instance created for ${playerName}`);
      
      // Add small delay between browser creations to prevent resource conflicts
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Failed to create browser for ${playerName}: ${error.message}`);
      throw error;
    }
  }
  
  // Seat players using API
  const players = [
    { Player: 'Player1', Seat: 1, Position: 'SB' },
    { Player: 'Player2', Seat: 2, Position: 'BB' },
    { Player: 'Player3', Seat: 3, Position: 'UTG' },
    { Player: 'Player4', Seat: 4, Position: 'CO' },
    { Player: 'Player5', Seat: 5, Position: 'BTN' }
  ];
  
  for (const player of players) {
    const playerName = player.Player;
    const seatNumber = parseInt(player.Seat);
    
    // Seat via API
    const seated = await seatPlayerShared(tableId, playerName, seatNumber, 100);
    
    if (!seated) {
      console.error(`❌ Failed to seat ${playerName}`);
      return false;
    }
    
    // Navigate browser to the game page
    const playerInstance = global.players[playerName];
    if (playerInstance && playerInstance.driver) {
      const navigated = await navigateToGameShared(playerInstance.driver, tableId);
      
      if (navigated) {
        // Update player info
        playerInstance.seat = seatNumber;
        playerInstance.tableId = tableId;
        console.log(`✅ ${playerName} setup complete`);
      } else {
        console.log(`⚠️ ${playerName} navigation failed`);
      }
    }
  }
  
  console.log('✅ All 5 players setup complete');
  return true;
}

module.exports = {
  resetDatabaseShared,
  seatPlayerShared,
  createBrowserInstanceShared,
  navigateToGameShared,
  startGameShared,
  cleanupBrowsersShared,
  setup5PlayersShared
};