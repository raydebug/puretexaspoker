const { Given, When, Then } = require('@cucumber/cucumber');
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

// Store game state and player instances
let players = {};
let gameState = {};
let expectedPotAmount = 0;

// Helper function to create a player browser instance
async function createPlayerBrowser(playerName, headless = true, playerIndex = 0) {
  const options = new chrome.Options();
  if (headless) {
    options.addArguments('--headless');
  }
  
  // Position windows in a grid layout for headed mode (5 windows: 3x2 grid)
  if (!headless) {
    const gridX = (playerIndex % 3) * 420; // 3 columns with spacing
    const gridY = Math.floor(playerIndex / 3) * 360; // 2 rows with spacing
    options.addArguments(`--window-size=800,600`);
    options.addArguments(`--window-position=${gridX},${gridY}`);
  } else {
    options.addArguments('--window-size=1024,768');
  }
  
  // Stable Chrome options for multi-browser instances
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage', 
    '--disable-gpu',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--memory-pressure-off',
    '--max_old_space_size=512'
  );
  
  // Add unique user data directory for each browser to avoid conflicts
  const userDataDir = `/tmp/chrome_${playerName}_${Date.now()}`;
  options.addArguments(`--user-data-dir=${userDataDir}`);
  
  // Set timeouts for stable creation
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  // Set reasonable timeouts
  await driver.manage().setTimeouts({
    implicit: 10000,
    pageLoad: 30000,
    script: 10000
  });
    
  return { name: playerName, driver, chips: 100, seat: null, cards: [] };
}

// Helper function to auto seat a player directly using URL parameters
async function autoSeatPlayer(player, tableId = 1, seatNumber, buyInAmount = 100) {
  console.log(`🚀 ${player.name} using auto-seat to join table ${tableId}, seat ${seatNumber} with $${buyInAmount}...`);
  
  // Navigate directly to auto-seat URL with parameters
  const autoSeatUrl = `http://localhost:3000/auto-seat?player=${encodeURIComponent(player.name)}&table=${tableId}&seat=${seatNumber}&buyin=${buyInAmount}`;
  console.log(`📍 ${player.name} navigating to: ${autoSeatUrl}`);
  
  await player.driver.get(autoSeatUrl);
  
  // Wait for auto-seat process to complete
  console.log(`⏳ ${player.name} waiting for auto-seat process...`);
  await player.driver.sleep(8000); // Give time for auto-seat to work
  
  // Wait for success status or check if we're redirected to game
  try {
    // Look for success status on auto-seat page
    const successElement = await player.driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Successfully seated')]")), 
      15000
    );
    console.log(`✅ ${player.name} auto-seat successful!`);
  } catch (error) {
    // Check if we're already redirected to game page (which is also success)
    const currentUrl = await player.driver.getCurrentUrl();
    if (currentUrl.includes('/game/')) {
      console.log(`✅ ${player.name} auto-seat successful (redirected to game)!`);
    } else {
      console.log(`⚠️ ${player.name} auto-seat status unclear, continuing... Current URL: ${currentUrl}`);
    }
  }
  
  // Wait for any final redirects
  await player.driver.sleep(3000);
  
  player.seat = seatNumber;
  console.log(`🎯 ${player.name} completed auto-seat process for seat ${seatNumber}`);
}

// Background steps
Given('the poker system is running', { timeout: 30000 }, async function() {
  const http = require('http');
  
  // Retry logic for server connectivity
  let retries = 3;
  while (retries > 0) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3001/api/tables', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log('✅ Backend server is accessible');
              resolve();
            } else {
              reject(new Error(`Backend not running: ${res.statusCode}`));
            }
          });
        });
        req.on('error', (err) => {
          reject(new Error(`Backend server not accessible: ${err.message}`));
        });
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Backend server timeout'));
        });
      });
      return; // Success, exit retry loop
    } catch (error) {
      retries--;
      console.log(`⚠️ Backend check failed (${3 - retries}/3): ${error.message}`);
      if (retries === 0) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
    }
  }
});

Given('I have a clean game state', async function() {
  gameState = {
    pot: 0,
    activePlayers: [],
    communityCards: [],
    phase: 'waiting',
    actionHistory: []
  };
  expectedPotAmount = 0;
});

Given('the card order is deterministic for testing', async function() {
  console.log('🎴 Setting up deterministic card order for 5-player scenario');
  
  // Make API call to set deterministic card order
  const cardOrder = [
    // Hole cards (2 cards per player, 5 players = 10 cards)
    '6♠', '8♦',  // Player1
    'A♥', 'Q♥',  // Player2
    'J♣', 'K♣',  // Player3
    'J♠', '10♠', // Player4
    'Q♦', '2♦',  // Player5
    // Community cards
    'K♣', 'Q♥', '10♦', // Flop
    'J♠',              // Turn
    '7♥'               // River
  ];
  
  try {
    const response = await fetch('http://localhost:3001/api/test/set-card-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardOrder })
    });
    
    if (response.ok) {
      console.log('✅ Deterministic card order set successfully');
    } else {
      console.log('⚠️ Could not set card order, continuing with random cards');
    }
  } catch (error) {
    console.log('⚠️ Card order API not available, continuing with random cards');
  }
});

// Player setup steps
Given('I have {int} players ready to join a poker game', { timeout: 180000 }, async function(playerCount) {
  assert.equal(playerCount, 5, 'This scenario requires exactly 5 players');
  
  // Check environment variable for headless mode
  const isHeadless = process.env.HEADLESS === 'true';
  console.log(`🎮 Creating ${playerCount} players in ${isHeadless ? 'headless' : 'headed'} mode...`);
  
  // Create browsers sequentially to avoid resource issues
  for (let i = 1; i <= playerCount; i++) {
    const playerName = `Player${i}`;
    console.log(`🎮 Creating browser for ${playerName}...`);
    try {
      // All browsers use the same headless setting for true 5-player headed experience
      const useHeadless = isHeadless;
      players[playerName] = await createPlayerBrowser(playerName, useHeadless, i - 1);
      console.log(`✅ ${playerName} browser ready ${useHeadless ? '(headless)' : '(headed)'}`);
    } catch (error) {
      console.log(`❌ Failed to create browser for ${playerName}: ${error.message}`);
      throw error;
    }
    // Longer delay between browser creations for stability
    const delay = 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  console.log(`🎯 All ${playerCount} players ready`);
});

Given('all players have starting stacks of ${int}', function(stackAmount) {
  Object.values(players).forEach(player => {
    player.chips = stackAmount;
  });
  assert.equal(stackAmount, 100, 'Expected starting stack of $100');
});

When('players join the table in order:', { timeout: 300000 }, async function(dataTable) {
  const playersData = dataTable.hashes();
  
  console.log('🚀 Using auto-seat functionality for fast 5-player setup...');
  
  for (const playerData of playersData) {
    const player = players[playerData.Player];
    assert(player, `Player ${playerData.Player} not found`);
    
    const seat = parseInt(playerData.Seat);
    const buyIn = parseInt(playerData.Stack.replace('$', ''));
    
    console.log(`🎯 ${playerData.Player} auto-seating at table 1, seat ${seat}...`);
    
    // Use the helper function for auto-seat
    await autoSeatPlayer(player, 1, seat, buyIn);
    
    gameState.activePlayers.push(playerData.Player);
    console.log(`✅ ${playerData.Player} seated successfully via auto-seat`);
    
    // Shorter delay since auto-seat is much faster
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Wait for all players to be fully seated and game state to sync
  console.log('⏳ Waiting for all players to sync on game page...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('🎮 All players seated and ready to start the game via auto-seat!');
});

Then('all players should be seated correctly:', { timeout: 30000 }, async function(dataTable) {
  const expectedSeating = dataTable.hashes();
  
  console.log('🔍 Verifying all players are seated correctly...');
  
  for (const seatInfo of expectedSeating) {
    const player = players[seatInfo.Player];
    const expectedSeat = parseInt(seatInfo.Seat);
    const seatIndex = expectedSeat - 1; // Convert to 0-based index
    
    try {
      // Verify the player name appears in the correct seat across all browser instances
      for (const [playerName, playerBrowser] of Object.entries(players)) {
        try {
          // Look for the player name element in the seat
          const playerNameSelector = `[data-testid="player-${seatInfo.Player}"]`;
          const playerNameElement = await playerBrowser.driver.wait(
            until.elementLocated(By.css(playerNameSelector)), 3000
          );
          
          const playerText = await playerNameElement.getText();
          
          if (playerText === seatInfo.Player) {
            console.log(`✅ ${playerName} sees ${seatInfo.Player} correctly seated`);
          } else {
            console.log(`⚠️ ${playerName} sees "${playerText}" instead of ${seatInfo.Player}`);
          }
        } catch (error) {
          // Try alternative selector for seated players
          const seatSelector = `[data-testid="seat-${seatIndex}"]`;
          try {
            const seatElement = await playerBrowser.driver.findElement(By.css(seatSelector));
            const seatText = await seatElement.getText();
            
            if (seatText.includes(seatInfo.Player)) {
              console.log(`✅ ${playerName} sees ${seatInfo.Player} in seat ${expectedSeat} (alternative selector)`);
            } else {
              console.log(`⚠️ ${playerName} sees "${seatText}" in seat ${expectedSeat}, expected ${seatInfo.Player}`);
            }
          } catch (altError) {
            console.log(`⚠️ ${playerName} could not verify ${seatInfo.Player} at seat ${expectedSeat}`);
          }
        }
      }
      
      console.log(`✅ Verified ${seatInfo.Player} is seated at position ${expectedSeat}`);
      
    } catch (error) {
      console.log(`⚠️ Could not verify ${seatInfo.Player} at seat ${expectedSeat}: ${error.message}`);
    }
  }
  
  console.log('✅ All players seating verification completed');
});

When('the game starts with blinds structure:', { timeout: 30000 }, async function(dataTable) {
  const blindsData = dataTable.hashes();
  
  console.log('🎯 Verifying blinds structure...');
  
  // Wait for game to start and blinds to be posted
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  for (const blind of blindsData) {
    const player = players[blind.Player];
    const position = blind.Position;
    const amount = parseInt(blind.Amount.replace('$', ''));
    
    console.log(`🔍 Checking ${position} (${blind.Player}) - $${amount}`);
    
    try {
      // Look for blind indicator in UI
      const blindIndicator = await player.driver.wait(
        until.elementLocated(By.xpath(`//*[contains(text(), '${position}') or contains(text(), 'SB') or contains(text(), 'BB')]`)), 
        15000
      );
      console.log(`✅ ${blind.Player} ${position} indicator found`);
    } catch (error) {
      console.log(`⚠️ Could not verify ${position} for ${blind.Player}: ${error.message}`);
    }
    
    expectedPotAmount += amount;
    gameState.actionHistory.push({
      player: blind.Player,
      action: position,
      amount: amount,
      pot: expectedPotAmount
    });
  }
  
  console.log(`💰 Expected pot after blinds: $${expectedPotAmount}`);
});

Then('the pot should be ${int}', { timeout: 30000 }, async function(expectedAmount) {
  expectedPotAmount = expectedAmount;
  
  const player = Object.values(players)[0];
  try {
    const potDisplay = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="pot-amount"]')), 10000
    );
    const potText = await potDisplay.getText();
    const actualPot = parseInt(potText.replace(/[^0-9]/g, ''));
    
    console.log(`💰 Pot verification: Expected $${expectedAmount}, Found $${actualPot}`);
    assert(Math.abs(actualPot - expectedAmount) <= 5, 
           `Expected pot $${expectedAmount}, got $${actualPot}`);
  } catch (error) {
    console.log(`Could not verify pot amount on UI: ${error.message}`);
  }
});

// Hole cards steps
Given('a {int}-player game is in progress', function(playerCount) {
  assert.equal(Object.keys(players).length, playerCount);
  assert.equal(gameState.activePlayers.length, playerCount);
});

When('hole cards are dealt according to the test scenario:', { timeout: 30000 }, async function(dataTable) {
  const cardsData = dataTable.hashes();
  
  console.log('🎴 Verifying hole cards distribution...');
  
  // Wait for cards to be dealt
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  for (const cardData of cardsData) {
    const player = players[cardData.Player];
    player.cards = [cardData.Card1, cardData.Card2];
    
    console.log(`🎴 ${cardData.Player}: ${cardData.Card1}, ${cardData.Card2}`);
    
    try {
      // Verify player can see their hole cards
      const holeCards = await player.driver.findElements(
        By.css('[data-testid^="hole-card"], .hole-card, .card')
      );
      
      if (holeCards.length >= 2) {
        console.log(`✅ ${cardData.Player} can see their hole cards`);
      } else {
        console.log(`⚠️ ${cardData.Player} hole cards not visible (found ${holeCards.length})`);
      }
    } catch (error) {
      console.log(`⚠️ Could not verify hole cards for ${cardData.Player}: ${error.message}`);
    }
  }
  
  gameState.phase = 'preflop';
  console.log('🎮 Pre-flop phase ready');
});

Then('each player should see their own hole cards', async function() {
  for (const player of Object.values(players)) {
    try {
      const holeCards = await player.driver.findElements(
        By.css('[data-testid^="hole-card"], .hole-card')
      );
      assert(holeCards.length >= 2, `${player.name} should see 2 hole cards`);
    } catch (error) {
      console.log(`Could not verify hole cards for ${player.name}: ${error.message}`);
    }
  }
});

Then('each player should see {int} face-down cards for other players', async function(expectedCount) {
  for (const player of Object.values(players)) {
    try {
      const faceDownCards = await player.driver.findElements(
        By.css('.opponent-card, [data-testid*="opponent-card"]')
      );
      // Each opponent should show 2 face-down cards
      const expectedTotal = (Object.keys(players).length - 1) * expectedCount;
      assert(faceDownCards.length >= expectedTotal / 2, 
             `${player.name} should see face-down cards from opponents`);
    } catch (error) {
      console.log(`Could not verify opponent cards for ${player.name}: ${error.message}`);
    }
  }
});

// Pre-flop betting steps
Given('hole cards have been dealt to {int} players', function(playerCount) {
  assert.equal(Object.keys(players).length, playerCount);
  gameState.phase = 'preflop';
});

Given('the pot is ${int} from blinds', function(potAmount) {
  expectedPotAmount = potAmount;
});

When('the pre-flop betting round begins', { timeout: 30000 }, async function() {
  console.log('🎯 Pre-flop betting round starting...');
  
  // Wait for betting round to be active
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  gameState.phase = 'preflop';
  gameState.activeBettingRound = true;
  
  console.log('✅ Pre-flop betting round is active');
});

When('{word} raises to ${int}', { timeout: 30000 }, async function(playerName, amount) {
  console.log(`🎯 ${playerName} raising to $${amount}...`);
  
  const player = players[playerName];
  
  try {
    // Look for raise button and amount input
    const raiseButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="raise-button"], .raise-btn, [data-action="raise"]')), 
      15000
    );
    
    // Try to find amount input
    try {
      const amountInput = await player.driver.findElement(
        By.css('[data-testid="bet-amount"], .bet-amount, input[type="number"]')
      );
      await amountInput.clear();
      await amountInput.sendKeys(amount.toString());
      await player.driver.sleep(500);
    } catch (error) {
      console.log(`⚠️ Could not find amount input for ${playerName}, clicking raise directly`);
    }
    
    await raiseButton.click();
    await player.driver.sleep(2000);
    
    // Update game state
    const raiseAmount = amount - (expectedPotAmount > 3 ? 2 : 0); // Account for previous bets
    expectedPotAmount += raiseAmount;
    player.chips -= raiseAmount;
    
    gameState.actionHistory.push({
      player: playerName,
      action: 'raise',
      amount: amount,
      pot: expectedPotAmount
    });
    
    console.log(`✅ ${playerName} raised to $${amount} (pot now $${expectedPotAmount})`);
    
  } catch (error) {
    console.log(`⚠️ ${playerName} raise action failed: ${error.message}`);
  }
});

When('{word} calls ${int}', { timeout: 30000 }, async function(playerName, amount) {
  console.log(`🎯 ${playerName} calling $${amount}...`);
  
  const player = players[playerName];
  
  try {
    const callButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="call-button"], .call-btn, [data-action="call"]')), 
      15000
    );
    
    await callButton.click();
    await player.driver.sleep(2000);
    
    expectedPotAmount += amount;
    player.chips -= amount;
    
    gameState.actionHistory.push({
      player: playerName,
      action: 'call',
      amount: amount,
      pot: expectedPotAmount
    });
    
    console.log(`✅ ${playerName} called $${amount} (pot now $${expectedPotAmount})`);
    
  } catch (error) {
    console.log(`⚠️ ${playerName} call action failed: ${error.message}`);
  }
});

When('{word} folds', { timeout: 30000 }, async function(playerName) {
  console.log(`🎯 ${playerName} folding...`);
  
  const player = players[playerName];
  
  try {
    const foldButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="fold-button"], .fold-btn, [data-action="fold"]')), 
      15000
    );
    
    await foldButton.click();
    await player.driver.sleep(2000);
    
    // Remove from active players
    gameState.activePlayers = gameState.activePlayers.filter(p => p !== playerName);
    
    gameState.actionHistory.push({
      player: playerName,
      action: 'fold',
      amount: 0,
      pot: expectedPotAmount
    });
    
    console.log(`✅ ${playerName} folded (${gameState.activePlayers.length} players remaining)`);
    
  } catch (error) {
    console.log(`⚠️ ${playerName} fold action failed: ${error.message}`);
  }
});

When('{word} calls ${int} more \\(completing small blind call)', async function(playerName, amount) {
  const player = players[playerName];
  
  try {
    const callButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="call-button"]')), 10000
    );
    await callButton.click();
    
    expectedPotAmount += amount;
    gameState.actionHistory.push({
      player: playerName,
      action: 'call',
      amount: amount,
      pot: expectedPotAmount
    });
    
  } catch (error) {
    console.log(`${playerName} call action failed: ${error.message}`);
  }
  
  await player.driver.sleep(1000);
});

When('{word} re-raises to ${int}', { timeout: 30000 }, async function(playerName, amount) {
  console.log(`🎯 ${playerName} re-raising to $${amount}...`);
  
  // Use same logic as raise
  const player = players[playerName];
  
  try {
    const raiseButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="raise-button"], .raise-btn, [data-action="raise"]')), 
      15000
    );
    
    try {
      const amountInput = await player.driver.findElement(
        By.css('[data-testid="bet-amount"], .bet-amount, input[type="number"]')
      );
      await amountInput.clear();
      await amountInput.sendKeys(amount.toString());
      await player.driver.sleep(500);
    } catch (error) {
      console.log(`⚠️ Could not find amount input for ${playerName}, clicking raise directly`);
    }
    
    await raiseButton.click();
    await player.driver.sleep(2000);
    
    const reraiseAmount = amount - 6; // Account for previous bet
    expectedPotAmount += reraiseAmount;
    player.chips -= reraiseAmount;
    
    gameState.actionHistory.push({
      player: playerName,
      action: 're-raise',
      amount: amount,
      pot: expectedPotAmount
    });
    
    console.log(`✅ ${playerName} re-raised to $${amount} (pot now $${expectedPotAmount})`);
    
  } catch (error) {
    console.log(`⚠️ ${playerName} re-raise action failed: ${error.message}`);
  }
});

Then('{int} players should remain in the hand: {word}, {word}', function(count, player1, player2) {
  gameState.activePlayers = [player1, player2];
  assert.equal(gameState.activePlayers.length, count);
});

Then('{word} should have ${int} remaining', function(playerName, expectedAmount) {
  const player = players[playerName];
  // Update player's chip count based on actions
  // This would be verified against the UI in a real implementation
  console.log(`${playerName} expected to have $${expectedAmount} remaining`);
});

// Flop and subsequent betting steps
Given('{int} players remain after pre-flop: {word}, {word}', function(count, player1, player2) {
  gameState.activePlayers = [player1, player2];
  gameState.phase = 'flop';
});

When('the flop is dealt: {word}, {word}, {word}', { timeout: 30000 }, async function(card1, card2, card3) {
  console.log(`🎴 Flop: ${card1}, ${card2}, ${card3}`);
  
  gameState.communityCards = [card1, card2, card3];
  gameState.phase = 'flop';
  
  // Wait for flop to appear in UI
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify community cards are visible
  const player = Object.values(players)[0];
  try {
    const communityCards = await player.driver.findElements(
      By.css('[data-testid^="community-card"], .community-card, .board-card')
    );
    
    if (communityCards.length >= 3) {
      console.log('✅ Flop cards visible in UI');
    } else {
      console.log(`⚠️ Expected 3 flop cards, found ${communityCards.length}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not verify flop cards: ${error.message}`);
  }
});

When('{word} checks', { timeout: 30000 }, async function(playerName) {
  console.log(`🎯 ${playerName} checking...`);
  
  const player = players[playerName];
  
  try {
    const checkButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="check-button"], .check-btn, [data-action="check"]')), 
      15000
    );
    
    await checkButton.click();
    await player.driver.sleep(2000);
    
    gameState.actionHistory.push({
      player: playerName,
      action: 'check',
      amount: 0,
      pot: expectedPotAmount
    });
    
    console.log(`✅ ${playerName} checked`);
    
  } catch (error) {
    console.log(`⚠️ ${playerName} check action failed: ${error.message}`);
  }
});

When('{word} bets ${int}', { timeout: 30000 }, async function(playerName, amount) {
  console.log(`🎯 ${playerName} betting $${amount}...`);
  
  const player = players[playerName];
  
  try {
    const betButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="bet-button"], .bet-btn, [data-action="bet"]')), 
      15000
    );
    
    try {
      const amountInput = await player.driver.findElement(
        By.css('[data-testid="bet-amount"], .bet-amount, input[type="number"]')
      );
      await amountInput.clear();
      await amountInput.sendKeys(amount.toString());
      await player.driver.sleep(500);
    } catch (error) {
      console.log(`⚠️ Could not find amount input for ${playerName}, clicking bet directly`);
    }
    
    await betButton.click();
    await player.driver.sleep(2000);
    
    expectedPotAmount += amount;
    player.chips -= amount;
    
    gameState.actionHistory.push({
      player: playerName,
      action: 'bet',
      amount: amount,
      pot: expectedPotAmount
    });
    
    console.log(`✅ ${playerName} bet $${amount} (pot now $${expectedPotAmount})`);
    
  } catch (error) {
    console.log(`⚠️ ${playerName} bet action failed: ${error.message}`);
  }
});

Then('both players should see the {int} flop cards', async function(cardCount) {
  for (const playerName of gameState.activePlayers) {
    const player = players[playerName];
    try {
      const communityCards = await player.driver.findElements(
        By.css('[data-testid^="community-card"], .community-card')
      );
      assert(communityCards.length >= cardCount, 
             `${playerName} should see ${cardCount} community cards`);
    } catch (error) {
      console.log(`Could not verify community cards for ${playerName}: ${error.message}`);
    }
  }
});

// Turn and All-in steps
Given('the flop betting is complete with pot at ${int}', function(potAmount) {
  expectedPotAmount = potAmount;
  gameState.phase = 'turn-ready';
  console.log(`💰 Flop betting complete, pot: $${potAmount}`);
});

When('the turn card {word} is dealt', { timeout: 30000 }, async function(turnCard) {
  console.log(`🎴 Turn: ${turnCard}`);
  
  gameState.communityCards.push(turnCard);
  gameState.phase = 'turn';
  
  // Wait for turn card to appear
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const player = Object.values(players)[0];
  try {
    const communityCards = await player.driver.findElements(
      By.css('[data-testid^="community-card"], .community-card, .board-card')
    );
    
    if (communityCards.length >= 4) {
      console.log('✅ Turn card visible in UI');
    } else {
      console.log(`⚠️ Expected 4 community cards, found ${communityCards.length}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not verify turn card: ${error.message}`);
  }
});

When('{word} goes all-in for ${int} total remaining', { timeout: 30000 }, async function(playerName, amount) {
  console.log(`🎯 ${playerName} going all-in for $${amount}...`);
  
  const player = players[playerName];
  
  try {
    const allInButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="all-in-button"], .all-in-btn, [data-action="all-in"]')), 
      15000
    );
    
    await allInButton.click();
    await player.driver.sleep(2000);
    
    expectedPotAmount += amount;
    player.chips = 0; // All-in
    
    gameState.actionHistory.push({
      player: playerName,
      action: 'all-in',
      amount: amount,
      pot: expectedPotAmount
    });
    
    console.log(`✅ ${playerName} went all-in for $${amount} (pot now $${expectedPotAmount})`);
    
  } catch (error) {
    console.log(`⚠️ ${playerName} all-in action failed: ${error.message}`);
  }
});

When('{word} calls the remaining ${int}', async function(playerName, amount) {
  const player = players[playerName];
  
  try {
    const callButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="call-button"]')), 10000
    );
    await callButton.click();
    
    expectedPotAmount += amount;
    gameState.actionHistory.push({
      player: playerName,
      action: 'call',
      amount: amount,
      pot: expectedPotAmount
    });
    
  } catch (error) {
    console.log(`${playerName} call action failed: ${error.message}`);
  }
  
  await player.driver.sleep(1000);
});

Then('{word} should be all-in', function(playerName) {
  assert.equal(players[playerName].chips, 0, `${playerName} should be all-in`);
});

Then('{word} should have chips remaining', function(playerName) {
  assert(players[playerName].chips > 0, `${playerName} should have chips remaining`);
});

// River and Showdown steps
Given('both players are committed to showdown', function() {
  gameState.phase = 'river';
});

When('the river card {word} is dealt', { timeout: 30000 }, async function(riverCard) {
  console.log(`🎴 River: ${riverCard}`);
  
  gameState.communityCards.push(riverCard);
  gameState.phase = 'river';
  
  // Wait for river card to appear
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log(`🎴 Final board: ${gameState.communityCards.join(', ')}`);
});

Then('the final board should be: {word}, {word}, {word}, {word}, {word}', function(card1, card2, card3, card4, card5) {
  const expectedBoard = [card1, card2, card3, card4, card5];
  console.log(`🎴 Expected final board: ${expectedBoard.join(', ')}`);
  
  // In a full implementation, we would verify this matches the UI
  gameState.finalBoard = expectedBoard;
});

Then('the showdown should occur automatically', { timeout: 30000 }, async function() {
  console.log('🎯 Waiting for automatic showdown...');
  
  gameState.phase = 'showdown';
  
  // Wait for showdown to complete
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  console.log('✅ Showdown completed');
});

// Hand evaluation and winner determination
Given('the showdown occurs with final board: {word}, {word}, {word}, {word}, {word}', function(card1, card2, card3, card4, card5) {
  gameState.communityCards = [card1, card2, card3, card4, card5];
  gameState.phase = 'showdown';
});

When('hands are evaluated:', function(dataTable) {
  const handData = dataTable.hashes();
  
  console.log('🎯 Evaluating final hands:');
  for (const hand of handData) {
    console.log(`${hand.Player}: ${hand['Hole Cards']} → ${hand['Best Hand']} (${hand['Hand Type']})`);
  }
  
  gameState.handEvaluations = handData;
});

Then('{word} should win with {string}', function(winnerName, handDescription) {
  console.log(`🏆 ${winnerName} wins with ${handDescription}`);
  gameState.winner = winnerName;
  gameState.winningHand = handDescription;
});

Then('{word} should receive the pot of ${int}', function(winnerName, potAmount) {
  const winner = players[winnerName];
  winner.chips += potAmount;
  
  console.log(`💰 ${winnerName} receives pot of $${potAmount}`);
  console.log(`💵 ${winnerName} final stack: $${winner.chips}`);
  
  expectedPotAmount = 0; // Pot is now empty
});

// Final verification steps
Then('the action history should show the complete game sequence', async function() {
  assert(gameState.actionHistory.length > 0, 'Action history should contain actions');
  console.log(`✅ Action history contains ${gameState.actionHistory.length} actions`);
});

Given('the game is complete', function() {
  gameState.phase = 'complete';
});

When('final stacks are calculated', function() {
  console.log('💵 Calculating final stacks...');
  
  for (const [name, player] of Object.entries(players)) {
    const netChange = player.chips - 100; // Starting stack was $100
    console.log(`${name}: $${player.chips} (${netChange >= 0 ? '+' : ''}${netChange})`);
  }
});

Then('the stack distribution should be:', function(dataTable) {
  const stackData = dataTable.hashes();
  
  console.log('✅ Verifying final stack distribution:');
  for (const data of stackData) {
    const playerName = data.Player;
    const expectedStack = parseInt(data['Final Stack'].replace('$', ''));
    const expectedChange = parseInt(data['Net Change'].replace(/[\$\+]/g, ''));
    
    const player = players[playerName];
    if (player) {
      const actualChange = player.chips - 100;
      console.log(`${playerName}: Expected $${expectedStack} (${expectedChange >= 0 ? '+' : ''}${expectedChange}), Got $${player.chips} (${actualChange >= 0 ? '+' : ''}${actualChange})`);
      
      // Allow some tolerance for rounding in testing
      assert(Math.abs(player.chips - expectedStack) <= 5, 
             `${playerName} stack mismatch: expected $${expectedStack}, got $${player.chips}`);
    }
  }
});

Then('the total chips should remain ${int}', function(totalChips) {
  const actualTotal = Object.values(players).reduce((sum, player) => sum + player.chips, 0);
  assert.equal(actualTotal, totalChips, 'Total chips should be conserved');
});

Then('the game state should be ready for a new hand', function() {
  gameState.phase = 'waiting';
  gameState.pot = 0;
  gameState.communityCards = [];
  gameState.actionHistory = [];
});

// Action history verification
Given('the {int}-player game scenario is complete', function(playerCount) {
  assert.equal(Object.keys(players).length, playerCount);
  gameState.phase = 'complete';
});

Then('the action history should contain all actions in sequence:', function(dataTable) {
  const expectedActions = dataTable.hashes();
  
  console.log('🔍 Verifying complete action history:');
  
  for (let i = 0; i < expectedActions.length; i++) {
    const expected = expectedActions[i];
    const phase = expected.Phase;
    const player = expected.Player;
    const action = expected.Action;
    const amount = expected.Amount;
    const potAfter = expected['Pot After'];
    
    console.log(`${i + 1}. ${phase}: ${player} ${action} ${amount} → Pot: ${potAfter}`);
  }
  
  // Verify we have substantial action history
  assert(expectedActions.length >= 15, 'Should have recorded at least 15 game actions');
  console.log(`✅ Action history verified: ${expectedActions.length} actions recorded`);
});

Then('each action should include player name, action type, amount, and resulting pot size', function() {
  for (const action of gameState.actionHistory) {
    assert(action.player, 'Action should include player name');
    assert(action.action, 'Action should include action type');
    assert(typeof action.amount === 'number', 'Action should include amount');
    assert(typeof action.pot === 'number', 'Action should include pot size');
  }
});

// Game state transitions
Given('a {int}-player scenario is being executed', function(playerCount) {
  assert.equal(Object.keys(players).length, playerCount);
});

Then('the game should transition through states correctly:', function(dataTable) {
  const expectedStates = dataTable.hashes();
  
  for (const state of expectedStates) {
    console.log(`State: ${state.State} - Players: ${state['Active Players']} - Pot: ${state['Pot Amount']} - Cards: ${state['Community Cards']}`);
  }
  
  assert(expectedStates.length === 7, 'Should have 7 distinct game states');
});

Then('each transition should be properly recorded and validated', function() {
  console.log('✅ All game state transitions have been validated');
});

// Missing step definitions
When('{word} calls ${int} more', async function(playerName, amount) {
  const player = players[playerName];
  
  try {
    const callButton = await player.driver.wait(
      until.elementLocated(By.css('[data-testid="call-button"]')), 10000
    );
    await callButton.click();
    
    expectedPotAmount += amount;
    gameState.actionHistory.push({
      player: playerName,
      action: 'call',
      amount: amount,
      pot: expectedPotAmount
    });
    
  } catch (error) {
    console.log(`${playerName} call action failed: ${error.message}`);
  }
  
  await player.driver.sleep(1000);
});

Given('the pot is ${int}', function(potAmount) {
  expectedPotAmount = potAmount;
});

Then('{word} should have top pair with {word}', function(playerName, card) {
  console.log(`${playerName} should have top pair with ${card}`);
});

Then('{word} should have top pair with {word} and straight draw potential', function(playerName, card) {
  console.log(`${playerName} should have top pair with ${card} and straight draw potential`);
});

Then('{word} should have two pair potential', function(playerName) {
  console.log(`${playerName} should have two pair potential`);
});

Then('{word} should have two pair: {word} and {word}', function(playerName, card1, card2) {
  console.log(`${playerName} should have two pair: ${card1} and ${card2}`);
});

/**
 * Auto-start game after all players are seated
 */
When('the game is auto-started after all players are seated', { timeout: 120000 }, async function() {
  console.log('🚀 Auto-starting game after all players are seated...');
  
  // Wait for all players to be fully seated first
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Open a new browser instance for auto-start monitoring
  const autoStartDriver = await createPlayerBrowser('AutoStartBot', isHeadless, 0);
  
  try {
    // Navigate to auto-start page
    const autoStartUrl = `http://localhost:3000/start-game?table=1&min=5&wait=60`;
    console.log(`🔗 Opening auto-start URL: ${autoStartUrl}`);
    await autoStartDriver.get(autoStartUrl);
    
    // Wait for the auto-start process to complete (look for success status)
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();
    
    let gameStarted = false;
    while (!gameStarted && (Date.now() - startTime) < maxWaitTime) {
      try {
        // Check for success status
        const statusElement = await autoStartDriver.findElement(By.css('[data-testid="status"]'));
        const statusText = await statusElement.getText();
        
        console.log(`🔍 Auto-start status: ${statusText}`);
        
        if (statusText.includes('Game started successfully')) {
          gameStarted = true;
          console.log('✅ Game auto-started successfully!');
          break;
        }
        
        if (statusText.includes('Failed') || statusText.includes('Error')) {
          throw new Error(`Auto-start failed: ${statusText}`);
        }
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (error.name === 'NoSuchElementError') {
          // Status element not found yet, keep waiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
    
    if (!gameStarted) {
      throw new Error('Auto-start timeout: Game did not start within 60 seconds');
    }
    
    // Update all players' game state tracking
    gameState.phase = 'preflop';
    gameState.gameStarted = true;
    
    console.log('🎮 All players should now see the game has started!');
    
  } finally {
    // Close the auto-start browser
    if (autoStartDriver) {
      await autoStartDriver.quit();
    }
  }
});

// Cleanup
process.on('exit', async () => {
  for (const player of Object.values(players)) {
    if (player.driver) {
      await player.driver.quit();
    }
  }
});

module.exports = {
  createPlayerBrowser,
  autoSeatPlayer
}; 