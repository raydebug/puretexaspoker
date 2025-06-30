const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * UI State Verification Script
 * Verifies that players state and observers list are identical across all browser instances
 * for the same table (following multi-browser synchronization requirements)
 */

class UIStateVerification {
  constructor() {
    this.browsers = [];
    this.testResults = {
      playersStateSynced: false,
      observersListSynced: false,
      gameStateSynced: false,
      errors: []
    };
  }

  async initialize(playerCount = 3) {
    console.log(`🔍 UI State Verification: Initializing ${playerCount} browser instances...`);
    
    for (let i = 0; i < playerCount; i++) {
      const playerName = `VerifyPlayer${i + 1}`;
      
      const options = new chrome.Options();
      options.addArguments(`--user-data-dir=/tmp/verify_player_${i + 1}`);
      options.addArguments('--disable-web-security');
      options.addArguments('--disable-features=VizDisplayCompositor');
      options.addArguments('--no-sandbox');
      
      const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
      
      this.browsers.push({
        driver,
        playerName,
        index: i + 1
      });
      
      console.log(`✅ Browser ${i + 1} (${playerName}) initialized`);
    }
  }

  async loginAllPlayers() {
    console.log(`🔐 Logging in all verification players...`);
    
    for (const browser of this.browsers) {
      await browser.driver.get('http://localhost:3000');
      await browser.driver.wait(until.titleContains("Texas Hold'em Poker"), 10000);
      
      // Set test mode
      await browser.driver.executeScript('window.SELENIUM_TEST = true;');
      
      // Store nickname
      await browser.driver.executeScript(`localStorage.setItem('nickname', '${browser.playerName}');`);
      
      // Navigate to table 1
      await browser.driver.get('http://localhost:3000/join-table/1');
      await browser.driver.sleep(3000); // Wait for page load and WebSocket connection
      
      console.log(`✅ ${browser.playerName} logged in and navigated to table 1`);
    }
  }

  async getPlayerStateFromBrowser(browser) {
    try {
      const gameState = await browser.driver.executeScript(`
        // Extract current game state visible in this browser
        const state = {
          players: [],
          observers: [],
          gameInfo: {},
          timestamp: Date.now()
        };
        
        // Method 1: Try to get state from socketService
        if (window.socketService && window.socketService.gameState) {
          const gameState = window.socketService.gameState;
          state.players = gameState.players ? gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            seatNumber: p.seatNumber,
            chips: p.chips,
            isActive: p.isActive,
            isDealer: p.isDealer
          })) : [];
          
          state.gameInfo = {
            phase: gameState.phase,
            pot: gameState.pot,
            currentPlayerId: gameState.currentPlayerId,
            status: gameState.status
          };
        }
        
        // Method 2: Try to get observers from UI elements
        try {
          const observerElements = document.querySelectorAll('[data-testid="observers-list"] .observer, .observers-list .observer, .online-users .observer');
          state.observers = Array.from(observerElements).map(el => el.textContent.trim());
        } catch (e) {
          // Observers list might not be visible or have different structure
        }
        
        // Method 3: Try to get players from seat elements in UI
        if (state.players.length === 0) {
          try {
            const seatElements = document.querySelectorAll('[data-testid^="seat-"]:not([data-testid*="available"])');
            state.players = Array.from(seatElements).map(seat => {
              const nameElement = seat.querySelector('.player-name, [data-testid*="player-name"]');
              const chipsElement = seat.querySelector('.player-chips, [data-testid*="chips"]');
              const seatMatch = seat.getAttribute('data-testid').match(/seat-(\\d+)/);
              
              return {
                name: nameElement ? nameElement.textContent.trim() : 'Unknown',
                chips: chipsElement ? parseInt(chipsElement.textContent.replace(/[^\\d]/g, '')) : 0,
                seatNumber: seatMatch ? parseInt(seatMatch[1]) : 0,
                fromUI: true
              };
            }).filter(p => p.name !== 'Unknown');
          } catch (e) {
            console.log('Could not read players from UI elements');
          }
        }
        
        // Method 4: Get total counts from UI
        try {
          const potElement = document.querySelector('[data-testid="pot-amount"], .pot-amount');
          if (potElement) {
            state.gameInfo.pot = parseInt(potElement.textContent.replace(/[^\\d]/g, '')) || 0;
          }
          
          const phaseElement = document.querySelector('[data-testid="game-phase"], .game-phase, [data-testid="game-status"]');
          if (phaseElement) {
            state.gameInfo.phase = phaseElement.textContent.trim();
          }
        } catch (e) {
          // Game info elements might not be visible
        }
        
        return state;
      `);
      
      return gameState;
    } catch (error) {
      console.error(`❌ Error getting state from ${browser.playerName}:`, error.message);
      return {
        players: [],
        observers: [],
        gameInfo: {},
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async verifyStateSync() {
    console.log(`🔍 Verifying UI state synchronization across all browsers...`);
    
    // Collect state from all browsers
    const allStates = [];
    for (const browser of this.browsers) {
      const state = await this.getPlayerStateFromBrowser(browser);
      state.browserName = browser.playerName;
      allStates.push(state);
      
      console.log(`📊 ${browser.playerName} sees:`, {
        players: state.players.length,
        observers: state.observers.length,
        pot: state.gameInfo.pot,
        phase: state.gameInfo.phase
      });
    }
    
    // Compare states for synchronization
    this.testResults = this.compareStates(allStates);
    
    return this.testResults;
  }

  compareStates(allStates) {
    const results = {
      playersStateSynced: true,
      observersListSynced: true,
      gameStateSynced: true,
      errors: [],
      details: {
        playerComparison: {},
        observerComparison: {},
        gameInfoComparison: {}
      }
    };
    
    if (allStates.length < 2) {
      results.errors.push('Not enough browser instances to compare (need at least 2)');
      return results;
    }
    
    const baseState = allStates[0];
    
    // Compare players state
    for (let i = 1; i < allStates.length; i++) {
      const currentState = allStates[i];
      
      // Players comparison
      const basePlayerNames = baseState.players.map(p => p.name).sort();
      const currentPlayerNames = currentState.players.map(p => p.name).sort();
      
      if (JSON.stringify(basePlayerNames) !== JSON.stringify(currentPlayerNames)) {
        results.playersStateSynced = false;
        results.errors.push(`Players list mismatch between ${baseState.browserName} and ${currentState.browserName}`);
        results.details.playerComparison[`${baseState.browserName}_vs_${currentState.browserName}`] = {
          base: basePlayerNames,
          current: currentPlayerNames
        };
      }
      
      // Observers comparison
      const baseObservers = [...baseState.observers].sort();
      const currentObservers = [...currentState.observers].sort();
      
      if (JSON.stringify(baseObservers) !== JSON.stringify(currentObservers)) {
        results.observersListSynced = false;
        results.errors.push(`Observers list mismatch between ${baseState.browserName} and ${currentState.browserName}`);
        results.details.observerComparison[`${baseState.browserName}_vs_${currentState.browserName}`] = {
          base: baseObservers,
          current: currentObservers
        };
      }
      
      // Game info comparison
      if (baseState.gameInfo.pot !== currentState.gameInfo.pot) {
        results.gameStateSynced = false;
        results.errors.push(`Pot amount mismatch: ${baseState.browserName} sees ${baseState.gameInfo.pot}, ${currentState.browserName} sees ${currentState.gameInfo.pot}`);
      }
      
      if (baseState.gameInfo.phase !== currentState.gameInfo.phase) {
        results.gameStateSynced = false;
        results.errors.push(`Game phase mismatch: ${baseState.browserName} sees ${baseState.gameInfo.phase}, ${currentState.browserName} sees ${currentState.gameInfo.phase}`);
      }
    }
    
    return results;
  }

  displayResults() {
    console.log('\n🎯 UI STATE SYNCHRONIZATION VERIFICATION RESULTS:');
    console.log('================================================');
    
    console.log(`✅ Players State Synced: ${this.testResults.playersStateSynced ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Observers List Synced: ${this.testResults.observersListSynced ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Game State Synced: ${this.testResults.gameStateSynced ? 'PASS' : 'FAIL'}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      this.testResults.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    } else {
      console.log('\n🎉 ALL STATE SYNCHRONIZATION TESTS PASSED!');
    }
    
    if (Object.keys(this.testResults.details.playerComparison).length > 0) {
      console.log('\n📊 Player List Comparison Details:');
      Object.entries(this.testResults.details.playerComparison).forEach(([comparison, data]) => {
        console.log(`   ${comparison}:`);
        console.log(`     Base: [${data.base.join(', ')}]`);
        console.log(`     Current: [${data.current.join(', ')}]`);
      });
    }
    
    return this.testResults;
  }

  async cleanup() {
    console.log('🧹 Cleaning up verification browsers...');
    
    for (const browser of this.browsers) {
      try {
        await browser.driver.quit();
        console.log(`✅ ${browser.playerName} browser closed`);
      } catch (error) {
        console.log(`⚠️ Error closing ${browser.playerName} browser: ${error.message}`);
      }
    }
  }
}

// Main execution
async function runUIStateVerification() {
  const verification = new UIStateVerification();
  
  try {
    await verification.initialize(3); // Test with 3 browser instances
    await verification.loginAllPlayers();
    
    console.log('\n⏳ Waiting 5 seconds for state to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const results = await verification.verifyStateSync();
    verification.displayResults();
    
    return results;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return {
      playersStateSynced: false,
      observersListSynced: false,
      gameStateSynced: false,
      errors: [error.message]
    };
  } finally {
    await verification.cleanup();
  }
}

// Run verification if called directly
if (require.main === module) {
  runUIStateVerification()
    .then(results => {
      const allPassed = results.playersStateSynced && results.observersListSynced && results.gameStateSynced;
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = { UIStateVerification, runUIStateVerification }; 