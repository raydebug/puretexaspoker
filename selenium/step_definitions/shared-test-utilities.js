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
  console.log('🧹 DB reset...');
  
  try {
    const resetResult = execSync('curl -s -X POST http://localhost:3001/api/test/reset-database', { encoding: 'utf8' });
    const resetResponse = JSON.parse(resetResult);
    
    if (resetResponse.success) {
      if (resetResponse.tables && resetResponse.tables.length > 0) {
        const tableId = resetResponse.tables[0].id;
        console.log(`✅ DB reset ✓ table: ${tableId}`);
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
 * @param {string} uniqueId - Unique identifier for user data directory
 * @returns {Promise<WebDriver>} Browser driver
 */
async function createBrowserInstanceShared(uniqueId = null) {
  const options = new chrome.Options();
  if (process.env.HEADLESS === 'true') {
    options.addArguments('--headless');
  }
  
  // For parallel browser creation, completely avoid user data directory conflicts
  // Use incognito mode to avoid any data directory issues
  options.addArguments('--incognito');
  
  // Ultra-fast Chrome options optimized for parallel creation speed
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--window-size=800,600',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI,VizDisplayCompositor',
    '--disable-ipc-flooding-protection',
    '--remote-debugging-port=0',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-images',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-default-apps',
    '--disable-background-mode',
    '--disable-component-extensions-with-background-pages',
    '--disable-client-side-phishing-detection',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-domain-reliability',
    '--disable-background-downloads',
    '--disable-add-to-shelf',
    '--disable-datasaver-prompt',
    '--disable-device-discovery-notifications',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--safebrowsing-disable-auto-update',
    '--disable-features=VizDisplayCompositor',
    '--disable-dev-shm-usage',
    '--disable-shared-memory-support'
  );
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  return driver;
}

/**
 * Navigate browser to game URL with retries and set proper player nickname
 * @param {WebDriver} driver - Browser driver
 * @param {number} tableId - Table ID
 * @param {string} playerName - Player name to set in localStorage
 * @returns {Promise<boolean>} Success status
 */
async function navigateToGameShared(driver, tableId, playerName = null) {
  const gameUrl = `http://localhost:3000/game?table=${tableId}`;
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 Navigating to: ${gameUrl} (attempt ${attempt}/${maxRetries})`);
      
      await driver.get(gameUrl);
      await driver.wait(until.elementLocated(By.css('body')), 5000);
      
      // OPTIMIZED: Set the correct player nickname in localStorage to prevent random nickname generation
      if (playerName) {
        console.log(`🔐 Setting nickname in localStorage: ${playerName}`);
        await driver.executeScript(`localStorage.setItem('nickname', '${playerName}');`);
        
        // OPTIMIZED: Refresh the page to ensure all connections use the correct nickname
        console.log(`🔄 Refreshing page to ensure localStorage takes effect for all connections`);
        await driver.navigate().refresh();
        await driver.wait(until.elementLocated(By.css('body')), 5000);
      }
      
      await driver.sleep(500); // Reduced sleep time for faster parallel setup
      
      console.log(`✅ Navigation complete to ${gameUrl}${playerName ? ` with nickname ${playerName}` : ''}`);
      return true;
    } catch (navError) {
      console.log(`⚠️ Navigation attempt ${attempt} failed: ${navError.message}`);
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying navigation in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
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
  console.log('🧹 Browser cleanup...');
  
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
  console.log('🎮 5-player setup...');
  
  // Initialize global.players if not exists
  if (!global.players) {
    global.players = {};
  }
  
  // Create browser instances for 5 players with parallel approach for speed
  console.log('🚀 Starting parallel browser creation for optimal speed...');
  
  const browserPromises = [];
  
  // Create all 5 browsers with staggered parallel approach
  for (let i = 1; i <= 5; i++) {
    const playerName = `Player${i}`;
    const baseId = Date.now() + i * 1000; // Stagger base timestamps
    const uniqueId = `${playerName}-${baseId}-${Math.random().toString(36).substr(2, 9)}`;
    
    const browserPromise = (async () => {
      // Small staggered delay to prevent resource conflicts
      await new Promise(resolve => setTimeout(resolve, (i - 1) * 100));
      
      console.log(`🌐 Starting staggered parallel browser creation for ${playerName}...`);
      
      try {
        const driver = await createBrowserInstanceShared(uniqueId);
        
        console.log(`✅ Browser instance created for ${playerName}`);
        
        return {
          playerName,
          driver,
          seat: i,
          tableId: tableId,
          buyIn: 100
        };
      } catch (error) {
        console.error(`❌ Failed to create browser for ${playerName}: ${error.message}`);
        throw new Error(`Browser creation failed for ${playerName}: ${error.message}`);
      }
    })();
    
    browserPromises.push(browserPromise);
  }
  
  // Wait for all browsers to be created in parallel
  console.log('⏳ Waiting for all 5 browsers to complete creation...');
  
  try {
    const browserResults = await Promise.all(browserPromises);
    
    // Store all browsers in global players object
    for (const result of browserResults) {
      global.players[result.playerName] = {
        driver: result.driver,
        seat: result.seat,
        tableId: result.tableId,
        buyIn: result.buyIn
      };
    }
    
    console.log('🎉 All 5 browsers created successfully in parallel!');
    
  } catch (error) {
    console.error('❌ Parallel browser creation failed:', error.message);
    throw error;
  }
  
  // Seat players using API
  const players = [
    { Player: 'Player1', Seat: 1, Position: 'SB' },
    { Player: 'Player2', Seat: 2, Position: 'BB' },
    { Player: 'Player3', Seat: 3, Position: 'UTG' },
    { Player: 'Player4', Seat: 4, Position: 'CO' },
    { Player: 'Player5', Seat: 5, Position: 'BTN' }
  ];
  
  // Seat all players via API first (fast)
  for (const player of players) {
    const playerName = player.Player;
    const seatNumber = parseInt(player.Seat);
    
    const seated = await seatPlayerShared(tableId, playerName, seatNumber, 100);
    
    if (!seated) {
      console.error(`❌ Failed to seat ${playerName}`);
      return false;
    }
  }
  
  console.log('✅ All players seated via API, starting parallel navigation...');
  
  // Navigate all browsers in parallel for speed
  const navigationPromises = [];
  
  for (const player of players) {
    const playerName = player.Player;
    const seatNumber = parseInt(player.Seat);
    const playerInstance = global.players[playerName];
    
    if (playerInstance && playerInstance.driver) {
      const navigationPromise = (async () => {
        try {
          const navigated = await navigateToGameShared(playerInstance.driver, tableId, playerName);
          
          if (navigated) {
            playerInstance.seat = seatNumber;
            playerInstance.tableId = tableId;
            console.log(`✅ ${playerName} navigation complete`);
            return true;
          } else {
            console.log(`⚠️ ${playerName} navigation failed`);
            return false;
          }
        } catch (error) {
          console.error(`❌ ${playerName} navigation error: ${error.message}`);
          return false;
        }
      })();
      
      navigationPromises.push(navigationPromise);
    }
  }
  
  // Wait for all navigations to complete
  console.log('⏳ Waiting for all player navigations to complete...');
  
  try {
    const navigationResults = await Promise.all(navigationPromises);
    const successfulNavigations = navigationResults.filter(result => result === true).length;
    
    console.log(`🎯 Navigation complete: ${successfulNavigations}/${players.length} players`);
    
    if (successfulNavigations < players.length) {
      console.log(`⚠️ Some navigations failed, but continuing with ${successfulNavigations} players`);
    }
    
  } catch (error) {
    console.error('❌ Parallel navigation failed:', error.message);
    return false;
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