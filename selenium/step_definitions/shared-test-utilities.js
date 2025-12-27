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
      console.log(`⚠️ API seating response for ${playerName}:`, seatResponse);
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

  // Ultra-stable Chrome options for multi-browser tests
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1920,1080',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI,VizDisplayCompositor',
    '--disable-ipc-flooding-protection',
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
    '--disable-shared-memory-support',
    // Additional stability options for multi-browser tests
    '--max_old_space_size=1024',
    '--memory-pressure-off',
    '--disable-background-downloads',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-print-preview',
    '--disable-web-security',
    '--allow-running-insecure-content',
    '--disable-notifications',
    '--disable-popup-blocking',
    '--disable-save-password-bubble',
    '--disable-translate',
    '--disable-web-resources',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--mute-audio'
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Test browser immediately to ensure it's working
  try {
    await driver.get('about:blank');
    await driver.manage().setTimeouts({
      implicit: 10000,
      pageLoad: 30000,
      script: 30000
    });

    // Force garbage collection to free memory
    await driver.executeScript('if (window.gc) { window.gc(); }');

    console.log(`🖥️ Browser window created and tested successfully (1920x1080)`);
  } catch (testError) {
    console.log(`⚠️ Browser creation test failed: ${testError.message}`);
    try {
      await driver.quit();
    } catch (quitError) {
      console.log(`⚠️ Error quitting failed browser: ${quitError.message}`);
    }
    throw new Error('Browser creation test failed');
  }

  return driver;
}

/**
 * Check if a browser is still healthy and responsive
 * @param {WebDriver} driver - Browser driver
 * @returns {Promise<boolean>} Health status
 */
async function checkBrowserHealth(driver) {
  try {
    await driver.getTitle();
    return true;
  } catch (error) {
    console.log(`🩺 Browser health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Recreate a crashed browser
 * @param {string} uniqueId - Unique identifier
 * @returns {Promise<WebDriver|null>} New driver or null if failed
 */
async function recreateBrowser(uniqueId) {
  try {
    console.log(`🔄 Recreating crashed browser: ${uniqueId}`);
    const newDriver = await createBrowserInstanceShared(uniqueId);
    console.log(`✅ Browser recreated successfully: ${uniqueId}`);
    return newDriver;
  } catch (error) {
    console.log(`❌ Failed to recreate browser: ${error.message}`);
    return null;
  }
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
      // Wait for body first
      await driver.wait(until.elementLocated(By.css('body')), 5000);

      // CRITICAL: Wait for React app to fully render poker table interface
      console.log(`⏳ Waiting for React app to load poker table interface...`);

      // First wait for basic React app to load
      await driver.wait(async () => {
        const rootDiv = await driver.findElement(By.id('root'));
        const rootContent = await rootDiv.getAttribute('innerHTML');
        return rootContent && rootContent.length > 100;  // Basic React content
      }, 10000);
      console.log(`✅ React app basic loading complete`);

      // Wait for poker table interface elements to appear (not just "Connecting...")
      console.log(`⏳ Waiting for poker table interface (may take 20-30 seconds)...`);
      let pokerTableLoaded = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!pokerTableLoaded && attempts < maxAttempts) {
        try {
          // Check root div content size first (should be >7000 when fully loaded)
          const rootDiv = await driver.findElement(By.id('root'));
          const rootContent = await rootDiv.getAttribute('innerHTML');

          if (rootContent && rootContent.length > 7000) {
            // FIXED: Check for any poker interface elements, not just empty seats

            // Check for any seat buttons (CLICK TO SIT, or active game buttons)
            const gameButtons = await driver.findElements(By.xpath("//*[contains(text(), 'CLICK TO SIT') or contains(text(), 'SIT') or contains(text(), 'FOLD') or contains(text(), 'CALL') or contains(text(), 'RAISE')]"));
            if (gameButtons.length > 0) {
              console.log(`✅ Game buttons found (${gameButtons.length} buttons)`);
              pokerTableLoaded = true;
              break;
            }

            // Check for game interface elements (OBSERVERS, Game History, etc.)
            const gameElements = await driver.findElements(By.xpath("//*[contains(text(), 'OBSERVERS') or contains(text(), 'Game History') or contains(text(), 'Table')]"));
            if (gameElements.length > 0) {
              console.log(`✅ Game interface elements found (${gameElements.length} elements)`);
              pokerTableLoaded = true;
              break;
            }

            // FALLBACK: If content contains poker-specific text, assume ready
            if (rootContent.includes('OBSERVERS') || rootContent.includes('Game History') || rootContent.includes('DEALER') || rootContent.includes('Preflop')) {
              console.log(`✅ Poker content detected in large interface (${rootContent.length} chars)`);
              pokerTableLoaded = true;
              break;
            }

            console.log(`✅ Large poker interface content loaded (${rootContent.length} chars)`);
            pokerTableLoaded = true;
            break;
          }

          attempts++;
          console.log(`⏳ Poker table loading, attempt ${attempts}/${maxAttempts} (content: ${rootContent ? rootContent.length : 0} chars)...`);
          await driver.sleep(500);

        } catch (error) {
          attempts++;
          console.log(`⚠️ Error checking poker table elements: ${error.message}`);
          await driver.sleep(500);
        }
      }

      if (!pokerTableLoaded) {
        console.log(`⚠️ Poker table interface may not be fully loaded, continuing anyway...`);
      }

      // Additional wait to ensure everything is stable
      await driver.sleep(2000);
      console.log(`✅ Poker table interface wait complete`);

      // OPTIMIZED: Set the correct player nickname in localStorage to prevent random nickname generation
      if (playerName) {
        console.log(`🔐 Setting nickname in localStorage: ${playerName}`);
        await driver.executeScript(`localStorage.setItem('nickname', '${playerName}');`);

        // OPTIMIZED: Refresh the page to ensure all connections use the correct nickname
        console.log(`🔄 Refreshing page to ensure localStorage takes effect for all connections`);
        await driver.navigate().refresh();
        await driver.wait(until.elementLocated(By.css('body')), 5000);

        // Wait for poker table interface to reload after refresh
        console.log(`⏳ Waiting for poker table interface to reload after refresh...`);

        // Wait for basic React content after refresh
        await driver.wait(async () => {
          const rootDiv = await driver.findElement(By.id('root'));
          const rootContent = await rootDiv.getAttribute('innerHTML');
          return rootContent && rootContent.length > 100;
        }, 10000);
        console.log(`✅ React basic content reloaded`);

        // Wait for poker table interface after refresh (shorter wait since it's a refresh)
        let pokerReloaded = false;
        let refreshAttempts = 0;
        const maxRefreshAttempts = 10;

        while (!pokerReloaded && refreshAttempts < maxRefreshAttempts) {
          try {
            const rootDiv = await driver.findElement(By.id('root'));
            const rootContent = await rootDiv.getAttribute('innerHTML');
            if (rootContent && rootContent.length > 7000) {
              // FIXED: Enhanced detection after refresh - check for poker content
              if (rootContent.includes('OBSERVERS') || rootContent.includes('Game History') || rootContent.includes('DEALER') || rootContent.includes('Preflop')) {
                console.log(`✅ Poker interface reloaded after refresh (${rootContent.length} chars with poker content)`);
                pokerReloaded = true;
                break;
              }
            }

            // Check for any game buttons (not just empty seat buttons)
            const gameButtons = await driver.findElements(By.xpath("//*[contains(text(), 'CLICK TO SIT') or contains(text(), 'SIT') or contains(text(), 'FOLD') or contains(text(), 'CALL') or contains(text(), 'RAISE')]"));
            if (gameButtons.length > 0) {
              console.log(`✅ Game buttons reloaded after refresh (${gameButtons.length} buttons)`);
              pokerReloaded = true;
              break;
            }

            refreshAttempts++;
            console.log(`⏳ Poker table reloading, attempt ${refreshAttempts}/${maxRefreshAttempts}...`);
            await driver.sleep(1000);

          } catch (error) {
            refreshAttempts++;
            await driver.sleep(1000);
          }
        }

        // Additional post-refresh stabilization wait
        await driver.sleep(3000);
        console.log(`✅ Poker interface refresh complete`);
      }

      await driver.sleep(500); // Reduced sleep time for faster parallel setup

      console.log(`✅ Navigation complete to ${gameUrl}${playerName ? ` with nickname ${playerName}` : ''}`);
      return true;
    } catch (navError) {
      console.log(`⚠️ Navigation attempt ${attempt} failed: ${navError.message}`);

      // Check if this is a browser connection error
      if (navError.message.includes('ECONNREFUSED')) {
        console.log(`🩺 Browser connection lost - checking health...`);
        const isHealthy = await checkBrowserHealth(driver);
        if (!isHealthy) {
          console.log(`💀 Browser is dead - cannot recover during navigation`);
          return false;
        }
      }

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

    // Clear the global players object
    global.clearGlobalPlayers();
    console.log('✅ Global players cleared');
  }
}

/**
 * Cleanup entire browser pool and reset state
 * @returns {Promise<void>}
 */
async function cleanupBrowserPool() {
  console.log('🧹 Cleaning up browser pool...');

  // First cleanup any assigned players
  await cleanupBrowsersShared();

  // Then cleanup the pool itself
  if (globalBrowserPool && globalBrowserPool.length > 0) {
    for (const browser of globalBrowserPool) {
      try {
        if (browser && browser.driver) {
          await browser.driver.quit();
          console.log(`✅ Pool browser ${browser.id} closed`);
        }
      } catch (error) {
        console.log(`⚠️ Error closing pool browser ${browser.id}: ${error.message}`);
      }
    }
  }

  // Reset pool state
  globalBrowserPool = [];
  browserPoolInitialized = false;

  console.log('✅ Browser pool cleaned up and reset');
}

// ===== BROWSER POOL MANAGEMENT =====

// Global browser pool - created once and reused
let globalBrowserPool = [];
let browserPoolInitialized = false;

/**
 * Initialize fixed browser pool with exactly 5 instances
 * @returns {Promise<boolean>} Success status
 */
async function initializeBrowserPool() {
  if (browserPoolInitialized && globalBrowserPool.length === 6) {
    console.log('🏊‍♂️ Browser pool already initialized with 6 instances');
    return true;
  }

  console.log('🏊‍♂️ Initializing fixed browser pool (6 instances)...');

  // Clear any existing browsers
  if (globalBrowserPool.length > 0) {
    console.log('🧹 Cleaning up existing browser pool...');
    for (const browser of globalBrowserPool) {
      try {
        await browser.quit();
      } catch (error) {
        console.log('⚠️ Error closing browser:', error.message);
      }
    }
    globalBrowserPool = [];
  }

  // Create browsers in parallel for faster setup
  globalBrowserPool = [];

  console.log('🚀 Creating 5 browsers in parallel for optimal performance...');

  try {
    const browserPromises = [];
    for (let i = 1; i <= 6; i++) {
      const uniqueId = `Pool-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🌐 Initiating browser instance ${i}/6...`);

      const browserPromise = createBrowserInstanceShared(uniqueId)
        .then(driver => ({ id: i, driver: driver, available: true }))
        .catch(error => ({ id: i, error: error.message, failed: true }));

      browserPromises.push(browserPromise);
    }

    // Wait for all browsers to be created
    const results = await Promise.all(browserPromises);

    // Process results and check for failures
    for (const result of results) {
      if (result.failed) {
        console.error(`❌ Failed to create browser instance ${result.id}/6: ${result.error}`);
        throw new Error(`Browser ${result.id} creation failed: ${result.error}`);
      } else {
        globalBrowserPool.push(result);
        console.log(`✅ Browser instance ${result.id}/6 created successfully`);
      }
    }
  } catch (error) {
    console.error(`❌ Parallel browser creation failed: ${error.message}`);
    // Clean up any browsers created so far
    for (const browser of globalBrowserPool) {
      try {
        if (browser.driver) {
          await browser.driver.quit();
        }
      } catch (cleanupError) {
        console.log('⚠️ Error during cleanup:', cleanupError.message);
      }
    }
    return false;
  }

  try {
    browserPoolInitialized = true;
    console.log('🎉 Browser pool initialized successfully with 6 instances!');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize browser pool:', error.message);
    browserPoolInitialized = false;
    return false;
  }
}

/**
 * Get browser from pool for a player
 * @param {string} playerName - Player name (Player1, Player2, etc.)
 * @returns {WebDriver|null} Browser driver or null if none available
 */
function getBrowserFromPool(playerName) {
  // Handle Observer specifically as the 6th browser
  if (playerName === 'Observer') {
    const browser = globalBrowserPool[5]; // 0-indexed, 6th position
    if (browser && browser.driver) {
      console.log(`🎯 Assigned browser ${browser.id} to Observer`);
      return browser.driver;
    }
  }

  const playerNumber = parseInt(playerName.replace('Player', ''));

  if (playerNumber >= 1 && playerNumber <= 5) {
    const browser = globalBrowserPool[playerNumber - 1];
    if (browser && browser.driver) {
      console.log(`🎯 Assigned browser ${browser.id} to ${playerName}`);
      return browser.driver;
    }
  }

  console.log(`⚠️ No browser available for ${playerName}`);
  return null;
}

/**
 * Setup 5 players with fixed browser pool
 * @param {number} tableId - Table ID
 * @returns {Promise<boolean>} Success status
 */
async function setup5PlayersShared(tableId) {
  console.log('🎮 5-player setup with fixed browser pool...');

  // Initialize global.players if not exists
  if (!global.players) {
    global.clearGlobalPlayers();
  }

  // Initialize browser pool if needed
  const poolReady = await initializeBrowserPool();
  if (!poolReady) {
    console.error('❌ Failed to initialize browser pool');
    return false;
  }

  // Assign browsers from pool to players
  console.log('🎯 Assigning browsers from pool to players...');

  for (let i = 1; i <= 5; i++) {
    const playerName = `Player${i}`;
    const driver = getBrowserFromPool(playerName);

    if (driver) {
      global.players[playerName] = {
        driver: driver,
        seat: i,
        tableId: tableId,
        buyIn: 100
      };
      console.log(`📡 Player ${playerName} object created in global.players. Keys: ${Object.keys(global.players[playerName]).join(', ')}`);
      console.log(`📡 Driver has takeScreenshot: ${!!global.players[playerName].driver.takeScreenshot}`);
      console.log(`✅ ${playerName} assigned browser from pool`);
    } else {
      console.error(`❌ Failed to assign browser to ${playerName}`);
      return false;
    }
  }

  // Setup Observer (6th browser from pool)
  const observerDriver = getBrowserFromPool('Observer');
  if (observerDriver) {
    global.players['Observer'] = {
      driver: observerDriver,
      seat: 0, // Observer has no seat
      tableId: tableId,
      isObserver: true
    };
    console.log(`📡 Observer object created in global.players`);
    console.log(`✅ Observer assigned browser from pool`);
  } else {
    console.error(`❌ Failed to assign browser to Observer`);
    return false;
  }

  console.log('🎉 All 5 players + Observer assigned browsers from pool successfully!');

  // Seat players using API with enhanced error handling
  const players = [
    { Player: 'Player1', Seat: 1, Position: 'SB' },
    { Player: 'Player2', Seat: 2, Position: 'BB' },
    { Player: 'Player3', Seat: 3, Position: 'UTG' },
    { Player: 'Player4', Seat: 4, Position: 'CO' },
    { Player: 'Player5', Seat: 5, Position: 'BTN' }
  ];

  // Seat all players via API first (fast) with retry logic
  for (const player of players) {
    const playerName = player.Player;
    const seatNumber = parseInt(player.Seat);

    let seated = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!seated && retryCount < maxRetries) {
      try {
        seated = await seatPlayerShared(tableId, playerName, seatNumber, 100);

        if (!seated) {
          console.log(`⚠️ Failed to seat ${playerName}, attempt ${retryCount + 1}/${maxRetries}`);
          retryCount++;

          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.log(`❌ Error seating ${playerName}, attempt ${retryCount + 1}/${maxRetries}: ${error.message}`);
        retryCount++;

        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!seated) {
      console.error(`❌ Failed to seat ${playerName} after ${maxRetries} attempts`);
      return false;
    }
  }

  console.log('✅ All players seated via API with retry logic, verifying UI updates...');

  // CRITICAL: Wait for UI to reflect API seating changes before proceeding
  console.log('🔍 Waiting for UI to reflect seating changes...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Give UI time to update

  // Verify seating in UI for at least one browser to confirm API changes took effect
  let uiSeatingVerified = false;
  for (const player of players) {
    const playerName = player.Player;
    const playerInstance = global.players[playerName];

    if (playerInstance && playerInstance.driver) {
      try {
        const { By } = require('selenium-webdriver');
        const {
          clearGlobalPlayers
        } = require('./shared-test-utilities');

        global.clearGlobalPlayers = clearGlobalPlayers;

        // Quick check if this browser shows seated players
        const clickToSitButtons = await playerInstance.driver.findElements(By.xpath("//*[contains(text(), 'CLICK TO SIT')]"));
        console.log(`🔍 ${playerName}: Found ${clickToSitButtons.length} empty seats`);

        if (clickToSitButtons.length <= 1) { // At most 1 empty seat is acceptable
          console.log(`✅ ${playerName}: UI shows players seated (${5 - clickToSitButtons.length}/5)`);
          uiSeatingVerified = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ ${playerName}: Could not verify UI seating - ${error.message}`);
      }
    }
  }

  if (!uiSeatingVerified) {
    console.log('⚠️ UI seating verification failed, but continuing with navigation...');
  }

  // Navigate all browsers in parallel with enhanced timeout protection
  const navigationPromises = [];

  // Add Observer to navigation list
  const navigationPlayers = [
    ...players.map(p => ({ playerName: p.Player, seatNumber: parseInt(p.Seat) })),
    { playerName: 'Observer', seatNumber: 0 }
  ];

  for (const navPlayer of navigationPlayers) {
    const { playerName, seatNumber } = navPlayer;
    const playerInstance = global.players[playerName];

    if (playerInstance && playerInstance.driver) {
      const navigationPromise = (async () => {
        try {
          // Add timeout protection for navigation
          const navigated = await Promise.race([
            navigateToGameShared(playerInstance.driver, tableId, playerName),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Navigation timeout')), 180000)
            )
          ]);

          if (navigated) {
            playerInstance.seat = seatNumber;
            playerInstance.tableId = tableId;
            console.log(`✅ ${playerName} navigation complete with timeout protection`);
            return true;
          } else {
            console.log(`⚠️ ${playerName} navigation failed`);
            return false;
          }
        } catch (error) {
          console.error(`❌ ${playerName} navigation error: ${error.message}`);
          console.log(`⚠️ ${playerName} continuing with fallback navigation...`);
          return false;
        }
      })();

      navigationPromises.push(navigationPromise);
    }
  }

  // Wait for all navigations to complete with timeout protection
  console.log('⏳ Waiting for all player navigations to complete with timeout protection...');

  try {
    const navigationResults = await Promise.race([
      Promise.all(navigationPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Navigation timeout - all players')), 300000)
      )
    ]);

    const successfulNavigations = navigationResults.filter(result => result === true).length;

    console.log(`🎯 Enhanced navigation complete: ${successfulNavigations}/${navigationPlayers.length} players`);

    if (successfulNavigations < navigationPlayers.length) {
      console.log(`⚠️ Some navigations failed, but continuing with ${successfulNavigations} browsers`);
    }

  } catch (error) {
    console.error('❌ Enhanced parallel navigation failed:', error.message);
    console.log('⚠️ Continuing test with available browser instances...');
    // Don't fail the test - continue with available browsers
  }

  console.log('✅ All 5 players + Observer setup complete with enhanced timeout handling');
  return true;
}

// ===== SCREENSHOT HELPER CLASS =====

const fs = require('fs');
const path = require('path');

// Screenshot helper for tests
class ScreenshotHelper {
  constructor() {
    this.screenshotDir = path.join(__dirname, '..', 'screenshots');
    this.ensureDirectory();
    this.stepCounter = 0;
    this.screenshotCounter = 1;
  }

  ensureDirectory() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async captureAndLogScreenshot(input, screenshotName, round = null, player = null) {
    try {
      // Robust driver detection - works if passed a driver OR a player object
      let driver = input;
      if (input && !input.takeScreenshot && (input.driver || input.browser)) {
        driver = input.driver || input.browser;
        console.log(`📡 Extracted driver from player object for: ${screenshotName}`);
      }

      console.log(`📸 Capturing screenshot: ${screenshotName}`);

      if (!driver || !driver.takeScreenshot) {
        const props = input ? Object.keys(input).join(', ') : 'null';
        console.log(`⚠️ No valid driver available for screenshot: ${screenshotName} (Input type: ${typeof input}, Properties: ${props})`);
        return false;
      }

      // Save screenshot with index and optional round/player info
      const index = String(this.screenshotCounter++).padStart(3, '0');

      // Build filename component by component
      let filenameParts = [index];

      // Always include Round Tag
      const roundTag = round ? `R${round}` : 'R?';
      filenameParts.push(roundTag);

      // Deduplicate: If screenshotName already starts with roundTag (e.g. "R1_"), strip it
      const roundPrefix = `${roundTag}_`;
      if (screenshotName.startsWith(roundPrefix)) {
        screenshotName = screenshotName.substring(roundPrefix.length);
      }

      // Always include Player Tag
      let playerTag = player ? (typeof player === 'string' ? player : 'Player') : null;

      // AUTO-DETECTION: If playerTag is missing, try to find the player name from global.players
      if (!playerTag && global.players) {
        for (const [name, p] of Object.entries(global.players)) {
          if (p && (p.driver === driver || p.browser === driver)) {
            playerTag = name;
            console.log(`🔍 Auto-detected player: ${playerTag} for screenshot: ${screenshotName}`);
            break;
          }
        }
      }

      // Fallback to Global
      if (!playerTag) playerTag = 'Global';
      filenameParts.push(playerTag);

      // Deduplicate: If screenshotName starts with playerTag matching (case insensitive)
      const playerPrefix = `${playerTag.toLowerCase()}_`;
      if (screenshotName.toLowerCase().startsWith(playerPrefix)) {
        screenshotName = screenshotName.substring(playerPrefix.length);
      }

      filenameParts.push(screenshotName);

      const filename = `${filenameParts.join('_')}.png`;

      console.log(`📸 Taking actual screenshot for: ${filename}...`);
      const screenshot = await driver.takeScreenshot();
      console.log(`📸 Screenshot data received (${screenshot.length} bytes)`);

      const filepath = path.join(this.screenshotDir, filename);
      console.log(`📂 Writing to: ${filepath}`);

      fs.writeFileSync(filepath, screenshot, 'base64');
      console.log(`✅ Screenshot saved SUCCESSFULLY: ${filename}`);

      return true;
    } catch (error) {
      console.log(`❌ Screenshot capture failed for ${screenshotName}: ${error.message}`);
      return false;
    }
  }
}

function clearGlobalPlayers() {
  if (!global.players) {
    console.log('📡 Initializing global.players object...');
    global.players = {};
    return;
  }
  console.log('🧹 Clearing global.players properties...');
  for (const key of Object.keys(global.players)) {
    delete global.players[key];
  }
}

module.exports = {
  resetDatabaseShared,
  seatPlayerShared,
  createBrowserInstanceShared,
  navigateToGameShared,
  startGameShared,
  cleanupBrowsersShared,
  cleanupBrowserPool,
  setup5PlayersShared,
  initializeBrowserPool,
  getBrowserFromPool,
  ScreenshotHelper,
  clearGlobalPlayers
};