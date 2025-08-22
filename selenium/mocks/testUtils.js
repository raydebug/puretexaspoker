/**
 * Test Utilities for Mock Backend
 * 
 * Provides utilities for managing mock server lifecycle and progressive game phases
 * for UI tests with real DOM verification.
 */

const MockBackendServer = require('./mockBackendServer');

class TestUtils {
  constructor() {
    this.mockServer = null;
    this.isServerRunning = false;
  }
  
  /**
   * Start the mock backend server for UI tests
   */
  async startMockServer(port = 3001) {
    if (this.isServerRunning) {
      console.log('⚠️ Mock server already running');
      return;
    }
    
    try {
      this.mockServer = new MockBackendServer();
      await this.mockServer.start(port);
      this.isServerRunning = true;
      console.log('✅ Mock server started successfully');
      
      // Wait a moment for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ Failed to start mock server:', error);
      throw error;
    }
  }
  
  /**
   * Stop the mock backend server
   */
  async stopMockServer() {
    if (!this.isServerRunning || !this.mockServer) {
      console.log('⚠️ Mock server not running');
      return;
    }
    
    try {
      await this.mockServer.stop();
      this.mockServer = null;
      this.isServerRunning = false;
      console.log('✅ Mock server stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop mock server:', error);
      throw error;
    }
  }
  
  /**
   * Update game phase via mock API - triggers progressive history
   */
  async updateTestPhase(phase) {
    if (!this.isServerRunning) {
      throw new Error('Mock server not running - cannot update phase');
    }
    
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/test/set-game-phase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phase })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update phase: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`🎮 Test phase updated: ${result.oldPhase} → ${result.newPhase} (${result.actionCount} actions)`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to update test phase:', error);
      throw error;
    }
  }
  
  /**
   * Reset game state for fresh test
   */
  async resetGameState() {
    if (!this.isServerRunning) {
      throw new Error('Mock server not running - cannot reset game state');
    }
    
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/test/reset-game-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset game state: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Game state reset successfully');
      
      return result;
    } catch (error) {
      console.error('❌ Failed to reset game state:', error);
      throw error;
    }
  }
  
  /**
   * Get current game state for debugging
   */
  async getGameState() {
    if (!this.isServerRunning) {
      throw new Error('Mock server not running - cannot get game state');
    }
    
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/test/game-state');
      
      if (!response.ok) {
        throw new Error(`Failed to get game state: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.gameState;
    } catch (error) {
      console.error('❌ Failed to get game state:', error);
      throw error;
    }
  }
  
  /**
   * Verify mock server is healthy
   */
  async checkHealth() {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/test/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Mock server health check passed');
      return result;
    } catch (error) {
      console.error('❌ Mock server health check failed:', error);
      throw error;
    }
  }
  
  /**
   * Wait for ActionHistory component to load data in UI
   */
  async waitForActionHistoryLoad(driver, expectedCount, maxWaitTime = 15000) {
    console.log(`⏳ Waiting for ActionHistory to show ${expectedCount} actions...`);
    
    const startTime = Date.now();
    let found = false;
    
    while (!found && (Date.now() - startTime) < maxWaitTime) {
      try {
        // Look for game history container
        const historySelectors = [
          '[data-testid="game-history"]',
          '.game-history',
          '*[class*="game"][class*="history"]'
        ];
        
        for (const selector of historySelectors) {
          try {
            const elements = await driver.findElements({ css: selector });
            if (elements.length > 0) {
              const historyText = await elements[0].getText();
              
              // Count GH- IDs in the DOM text
              const ghMatches = (historyText.match(/GH-\d+/g) || []).length;
              
              console.log(`📊 Found ${ghMatches}/${expectedCount} action records in DOM`);
              
              if (ghMatches >= expectedCount) {
                found = true;
                console.log(`✅ ActionHistory loaded with ${ghMatches} actions`);
                return true;
              }
              break;
            }
          } catch (selectorError) {
            // Continue with next selector
          }
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`⚠️ Error checking ActionHistory: ${error.message}`);
      }
    }
    
    if (!found) {
      console.log(`⚠️ Timeout waiting for ${expectedCount} actions in ActionHistory`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Progressive phase mapping for test scenarios
   */
  static getPhaseProgression() {
    return [
      { phase: 'setup', description: 'Blinds posted', expectedActions: 2 },
      { phase: 'preflop_betting', description: 'Pre-flop actions complete', expectedActions: 11 },
      { phase: 'flop_revealed', description: 'Flop dealt', expectedActions: 12 },
      { phase: 'turn_revealed', description: 'Turn dealt', expectedActions: 13 },
      { phase: 'river_revealed', description: 'River dealt', expectedActions: 14 },
      { phase: 'showdown_begin', description: 'Showdown begins', expectedActions: 15 },
      { phase: 'showdown_reveals', description: 'Hand reveals', expectedActions: 16 },
      { phase: 'showdown_complete', description: 'Winner declared', expectedActions: 17 }
    ];
  }
}

// Global test utils instance
const testUtils = new TestUtils();

module.exports = {
  TestUtils,
  testUtils
};