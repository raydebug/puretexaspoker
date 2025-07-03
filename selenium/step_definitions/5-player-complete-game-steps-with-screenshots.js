const { Given, When, Then } = require('@cucumber/cucumber');
const { WebDriverHelpers } = require('../utils/webdriverHelpers');
const { By, until } = require('selenium-webdriver');

// Import original steps
const originalSteps = require('./5-player-complete-game-steps.js');

// Helper function to take screenshots
async function takeScreenshot(world, name) {
  if (process.env.SCREENSHOT_MODE === 'true') {
    try {
      // Add specific waits based on the step
      switch (name) {
        case 'system-ready':
          // Wait for lobby to be visible
          await world.helpers.waitForElementVisible('.lobby-container, .table-grid', 10000);
          break;
        case 'players-seated':
          // Wait for game table to be visible
          await world.helpers.waitForElementVisible('.poker-table, .game-board', 10000);
          break;
        case 'seating-verified':
          // Wait for player seats to be visible
          await world.helpers.waitForElementVisible('.player-seat', 10000);
          break;
        case 'game-started':
          // Wait for game status to show "playing"
          await world.helpers.waitForText('[data-testid="game-status"], .game-status', 'playing', 10000);
          break;
        case 'blinds-posted':
          // Wait for pot to show blinds
          await world.helpers.waitForElementVisible('[data-testid="pot"], .pot', 10000);
          break;
        case 'hole-cards-dealt':
          // Wait for hole cards to be visible
          await world.helpers.waitForElementVisible('.hole-cards, .player-cards', 10000);
          break;
        case 'preflop-complete':
          // Wait for community cards area
          await world.helpers.waitForElementVisible('.community-cards, .board-cards', 10000);
          break;
        case 'flop-dealt':
          // Wait for 3 community cards
          await world.helpers.waitForElementVisible('.community-cards .card, .board-cards .card', 10000);
          break;
        case 'turn-dealt':
          // Wait for 4 community cards
          await world.helpers.waitForElementVisible('.community-cards .card, .board-cards .card', 10000);
          break;
        case 'river-dealt':
          // Wait for 5 community cards
          await world.helpers.waitForElementVisible('.community-cards .card, .board-cards .card', 10000);
          break;
        case 'showdown':
          // Wait for showdown elements
          await world.helpers.waitForElementVisible('.showdown, .winner', 10000);
          break;
        default:
          // Default wait for any content
          await world.helpers.waitForElementVisible('body', 5000);
      }
      
      // Additional wait for animations
      await world.helpers.sleep(2000);
      
      await world.helpers.takeScreenshot(`5-player-game-${name}`);
      console.log(`📸 Screenshot taken: 5-player-game-${name}`);
    } catch (error) {
      console.log(`⚠️ Failed to take screenshot: ${error.message}`);
    }
  }
}

// Wrap each step with screenshot functionality
Given('the poker system is ready for a 5-player game', async function() {
  await originalSteps['the poker system is ready for a 5-player game'].call(this);
  await takeScreenshot(this, 'system-ready');
});

When('all 5 players join the game via auto-seat', async function() {
  await originalSteps['all 5 players join the game via auto-seat'].call(this);
  await takeScreenshot(this, 'players-seated');
});

Then('all players should be correctly seated', async function() {
  await originalSteps['all players should be correctly seated'].call(this);
  await takeScreenshot(this, 'seating-verified');
});

Then('the game should start automatically', async function() {
  await originalSteps['the game should start automatically'].call(this);
  await takeScreenshot(this, 'game-started');
});

Then('blinds should be posted correctly for the 5-player game', async function() {
  await originalSteps['blinds should be posted correctly for the 5-player game'].call(this);
  await takeScreenshot(this, 'blinds-posted');
});

Then('hole cards should be dealt to all players', async function() {
  await originalSteps['hole cards should be dealt to all players'].call(this);
  await takeScreenshot(this, 'hole-cards-dealt');
});

When('the pre-flop betting round completes', async function() {
  await originalSteps['the pre-flop betting round completes'].call(this);
  await takeScreenshot(this, 'preflop-complete');
});

Then('the flop should be dealt', async function() {
  await originalSteps['the flop should be dealt'].call(this);
  await takeScreenshot(this, 'flop-dealt');
});

When('the flop betting round completes', async function() {
  await originalSteps['the flop betting round completes'].call(this);
  await takeScreenshot(this, 'flop-betting-complete');
});

Then('the turn should be dealt', async function() {
  await originalSteps['the turn should be dealt'].call(this);
  await takeScreenshot(this, 'turn-dealt');
});

When('the turn betting round completes', async function() {
  await originalSteps['the turn betting round completes'].call(this);
  await takeScreenshot(this, 'turn-betting-complete');
});

Then('the river should be dealt', async function() {
  await originalSteps['the river should be dealt'].call(this);
  await takeScreenshot(this, 'river-dealt');
});

When('the river betting round completes', async function() {
  await originalSteps['the river betting round completes'].call(this);
  await takeScreenshot(this, 'river-betting-complete');
});

Then('the showdown should occur', async function() {
  await originalSteps['the showdown should occur'].call(this);
  await takeScreenshot(this, 'showdown');
});

Then('the winner should be determined correctly', async function() {
  await originalSteps['the winner should be determined correctly'].call(this);
  await takeScreenshot(this, 'winner-determined');
});

Then('the game state transitions should be verified', async function() {
  await originalSteps['the game state transitions should be verified'].call(this);
  await takeScreenshot(this, 'game-state-verified');
});

Then('the complete action history should be verified', async function() {
  await originalSteps['the complete action history should be verified'].call(this);
  await takeScreenshot(this, 'action-history-verified');
});

// Export all step definitions
module.exports = {
  'the poker system is ready for a 5-player game': Given('the poker system is ready for a 5-player game', async function() {
    await originalSteps['the poker system is ready for a 5-player game'].call(this);
    await takeScreenshot(this, 'system-ready');
  }),
  // ... export other steps similarly
}; 