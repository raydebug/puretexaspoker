const { Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');

// Global setup and teardown
BeforeAll(async function() {
  console.log('🚀 Starting 2-player test suite with optimizations...');
  
  // Set environment variable to enable browser reuse
  process.env.REUSE_BROWSERS = 'true';
  
  // Initialize global players object
  if (!global.players) {
    global.players = {};
  }
  
  console.log('✅ Global test setup complete');
});

AfterAll(async function() {
  console.log('🏁 Test suite completed, performing final cleanup...');
  
  // Clean up all browser instances at the end
  if (global.players) {
    for (const playerName in global.players) {
      if (global.players[playerName] && global.players[playerName].driver) {
        try {
          await global.players[playerName].driver.quit();
          console.log(`🗑️ Final cleanup: Closed browser for ${playerName}`);
        } catch (error) {
          console.log(`⚠️ Error during final browser cleanup for ${playerName}: ${error.message}`);
        }
      }
    }
    global.players = {};
  }
  
  console.log('✅ Final cleanup complete');
});

// Scenario-level hooks for lightweight isolation
Before(async function(scenario) {
  console.log(`📝 Starting scenario: ${scenario.pickle.name}`);
  
  // Light reset between scenarios - only reset game state, not database
  if (this.latestTableId) {
    try {
      const { execSync } = require('child_process');
      
      // Only reset the game state for the current table, not the entire database
      const resetGameCall = `curl -s -X POST http://localhost:3001/api/test/advance-phase -H "Content-Type: application/json" -d '{"tableId": ${this.latestTableId}, "phase": "waiting"}'`;
      execSync(resetGameCall, { encoding: 'utf8' });
      console.log(`🔄 Reset game state for table ${this.latestTableId}`);
    } catch (error) {
      console.log(`⚠️ Light reset failed: ${error.message}`);
    }
  }
});

After(async function(scenario) {
  console.log(`✅ Completed scenario: ${scenario.pickle.name} - ${scenario.result.status}`);
  
  // No browser cleanup between scenarios to enable reuse
  // Browsers will be reused across scenarios for better performance
});