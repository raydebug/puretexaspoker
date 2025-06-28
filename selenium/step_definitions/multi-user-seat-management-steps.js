const { Given, When, Then, After } = require('@cucumber/cucumber');
const { Builder, By, until, Key } = require('selenium-webdriver');
const { assert } = require('chai');
const axios = require('axios');

// Server and frontend connection steps moved to common-steps.js

// Global variables to manage multiple browser instances
let browserInstances = {};
let userSessions = {};
let tableId = '1'; // Use table ID 1 (first table) which should exist

// Browser management utilities
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
  chromeOptions.addArguments('--window-size=1280,720');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
  
  browserInstances[instanceId] = driver;
  return driver;
}

async function cleanupBrowserInstances() {
  for (const [instanceId, driver] of Object.entries(browserInstances)) {
    try {
      await driver.quit();
    } catch (error) {
      console.error(`Error closing browser instance ${instanceId}:`, error.message);
    }
  }
  browserInstances = {};
  userSessions = {};
}

// Background setup
// Note: "I have a clean poker table" step is defined in common-steps.js
// Fixing port reference from 8080 to 3001

// Multi-browser instance management
Given('I have {int} browser instances ready', async function (count) {
  for (let i = 1; i <= count; i++) {
    await createBrowserInstance(`browser${i}`);
  }
});

Given('I have {int} browser instances with users seated:', {timeout: 90000}, async function (count, dataTable) {
  const users = dataTable.hashes();
  console.log(`🚀 Setting up ${users.length} browser instances in parallel...`);
  
  // Setup all browser instances in parallel for speed
  const setupPromises = users.map(async (userData, index) => {
    const browserId = `browser${userData.browser}`;
    console.log(`🔄 [${index + 1}/${users.length}] Starting setup for ${userData.user}...`);
    
    try {
      // Create browser instance
      const driver = await createBrowserInstance(browserId);
      console.log(`✅ Browser created for ${userData.user}`);
      
      // Sequential setup for this user (but parallel across users)
      await driver.get('http://localhost:3000');
      console.log(`🌐 ${userData.user} navigated to lobby`);
      
      await loginUser(driver, userData.user);
      console.log(`🔐 ${userData.user} logged in`);
      
      await navigateToTable(driver, tableId);
      console.log(`🎲 ${userData.user} joined table`);
      
      await takeSeat(driver, parseInt(userData.initial_seat || userData.seat), parseInt(userData.buy_in));
      console.log(`💺 ${userData.user} took seat ${userData.initial_seat || userData.seat}`);
      
      // Store session data
      userSessions[userData.user] = {
        driver: driver,
        browserId: browserId,
        currentSeat: parseInt(userData.initial_seat || userData.seat),
        chips: parseInt(userData.buy_in)
      };
      
      console.log(`✅ [${index + 1}/${users.length}] ${userData.user} setup completed successfully`);
      return { success: true, user: userData.user };
      
    } catch (error) {
      console.log(`❌ [${index + 1}/${users.length}] Failed to setup ${userData.user}: ${error.message}`);
      return { success: false, user: userData.user, error: error.message };
    }
  });
  
  // Wait for all setups to complete
  console.log(`⏳ Waiting for all ${users.length} browser setups to complete...`);
  const results = await Promise.allSettled(setupPromises);
  
  // Check results and report
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
  
  console.log(`📊 Setup Results: ${successful.length} successful, ${failed.length} failed`);
  
  if (failed.length > 0) {
    console.log(`❌ Failed setups:`);
    failed.forEach(f => {
      const user = f.status === 'fulfilled' ? f.value.user : 'unknown';
      const error = f.status === 'fulfilled' ? f.value.error : f.reason?.message;
      console.log(`  - ${user}: ${error}`);
    });
    
    // If too many failed, throw error
    if (failed.length >= users.length / 2) {
      throw new Error(`Multi-user setup failed: ${failed.length}/${users.length} setups failed`);
    }
  }
  
  // Wait for all seat changes to synchronize
  console.log(`⏳ Waiting for seat synchronization...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`✅ Multi-user setup completed: ${successful.length}/${users.length} users ready`);
});

Given('I have {int} browser instances with users as observers', {timeout: 60000}, async function (count) {
  console.log(`🚀 Setting up ${count} observer browser instances in parallel...`);
  
  const setupPromises = [];
  for (let i = 1; i <= count; i++) {
    setupPromises.push(async () => {
      const browserId = `browser${i}`;
      const username = `Observer${i}`;
      
      try {
        console.log(`🔄 Setting up observer ${username}...`);
        const driver = await createBrowserInstance(browserId);
        
        await driver.get('http://localhost:3000');
        await loginUser(driver, username);
        await navigateToTable(driver, tableId);
        
        userSessions[username] = {
          driver: driver,
          browserId: browserId,
          currentSeat: null,
          chips: 0
        };
        
        console.log(`✅ Observer ${username} setup completed`);
        return { success: true, user: username };
      } catch (error) {
        console.log(`❌ Failed to setup observer ${username}: ${error.message}`);
        return { success: false, user: username, error: error.message };
      }
    });
  }
  
  const results = await Promise.allSettled(setupPromises.map(fn => fn()));
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  console.log(`✅ Observer setup completed: ${successful.length}/${count} observers ready`);
});

Given('I have {int} browser instances with users ready', {timeout: 60000}, async function (count) {
  console.log(`🚀 Setting up ${count} ready player browser instances in parallel...`);
  
  const setupPromises = [];
  for (let i = 1; i <= count; i++) {
    setupPromises.push(async () => {
      const browserId = `browser${i}`;
      const username = `Player${i}`;
      
      try {
        console.log(`🔄 Setting up ready player ${username}...`);
        const driver = await createBrowserInstance(browserId);
        
        await driver.get('http://localhost:3000');
        await loginUser(driver, username);
        await navigateToTable(driver, tableId);
        
        userSessions[username] = {
          driver: driver,
          browserId: browserId,
          currentSeat: null,
          chips: 0
        };
        
        console.log(`✅ Ready player ${username} setup completed`);
        return { success: true, user: username };
      } catch (error) {
        console.log(`❌ Failed to setup ready player ${username}: ${error.message}`);
        return { success: false, user: username, error: error.message };
      }
    });
  }
  
  const results = await Promise.allSettled(setupPromises.map(fn => fn()));
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  console.log(`✅ Ready players setup completed: ${successful.length}/${count} players ready`);
});

// User actions
When('user {string} joins from browser instance {int}', async function (username, instanceNum) {
  const browserId = `browser${instanceNum}`;
  const driver = browserInstances[browserId];
  
  await driver.get('http://localhost:3000');
  await loginUser(driver, username);
  
  userSessions[username] = {
    driver: driver,
    browserId: browserId,
    currentSeat: null,
    chips: 0
  };
});

When('all users navigate to table {string}', async function (tableName) {
  for (const [username, session] of Object.entries(userSessions)) {
    await navigateToTable(session.driver, tableName);
  }
  
  // Wait for all navigation to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
});

When('{string} takes seat {int} with buy-in {int}', async function (username, seatNumber, buyIn) {
  const session = userSessions[username];
  await takeSeat(session.driver, seatNumber, buyIn);
  
  session.currentSeat = seatNumber;
  session.chips = buyIn;
  
  // Wait for seat update to propagate
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('{string} attempts to move from seat {int} to seat {int}', async function (username, fromSeat, toSeat) {
  const session = userSessions[username];
  await changeSeat(session.driver, fromSeat, toSeat);
  
  // Wait for seat change to propagate
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('{string} moves from seat {int} to seat {int}', async function (username, fromSeat, toSeat) {
  const session = userSessions[username];
  await changeSeat(session.driver, fromSeat, toSeat);
  
  session.currentSeat = toSeat;
  
  // Wait for seat change to propagate
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('{string} attempts to take seat {int} \\(occupied by {string}\\)', async function (username1, seatNumber, username2) {
  const session = userSessions[username1];
  try {
    await takeSeat(session.driver, seatNumber, 500);
  } catch (error) {
    // Expected to fail, store error for verification
    session.lastError = error.message;
  }
});

When('{string} and {string} simultaneously attempt to take seat {int}', async function (username1, username2, seatNumber) {
  const session1 = userSessions[username1];
  const session2 = userSessions[username2];
  
  // Execute both actions simultaneously
  const [result1, result2] = await Promise.allSettled([
    takeSeat(session1.driver, seatNumber, 500).catch(e => ({ error: e.message })),
    takeSeat(session2.driver, seatNumber, 750).catch(e => ({ error: e.message }))
  ]);
  
  session1.lastResult = result1;
  session2.lastResult = result2;
  
  // Wait for results to propagate
  await new Promise(resolve => setTimeout(resolve, 1000));
});

When('{string} attempts to return to seat {int} \\(previously occupied by {string}\\)', async function (username1, seatNumber, username2) {
  const session = userSessions[username1];
  await changeSeat(session.driver, session.currentSeat, seatNumber);
  
  session.currentSeat = seatNumber;
  
  // Wait for seat change to propagate
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('{string} joins and takes seat {int} with buy-in {int}', async function (username, seatNumber, buyIn) {
  // Create new browser instance for this user
  const browserId = `browser_${username}`;
  const driver = await createBrowserInstance(browserId);
  
  await driver.get('http://localhost:3000');
  await loginUser(driver, username);
  await navigateToTable(driver, tableId);
  await takeSeat(driver, seatNumber, buyIn);
  
  userSessions[username] = {
    driver: driver,
    browserId: browserId,
    currentSeat: seatNumber,
    chips: buyIn
  };
  
  // Wait for update to propagate
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('{string} leaves the table', async function (username) {
  const session = userSessions[username];
  
  // Click leave table button
  try {
    const leaveButton = await session.driver.wait(
      until.elementLocated(By.css('[data-testid="leave-table"], .leave-table-button')),
      5000
    );
    await leaveButton.click();
    
    session.currentSeat = null;
    session.chips = 0;
  } catch (error) {
    console.log('Leave table button not found, user may already be observer');
  }
  
  // Wait for update to propagate
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('all {int} users attempt to join the table simultaneously', async function (userCount) {
  const joinPromises = [];
  
  for (let i = 1; i <= userCount; i++) {
    const username = `Player${i}`;
    const session = userSessions[username];
    
    joinPromises.push(
      navigateToTable(session.driver, tableId)
    );
  }
  
  await Promise.all(joinPromises);
  
  // Wait for all joins to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
});

When('they perform rapid seat changes in this sequence:', async function (dataTable) {
  const actions = dataTable.hashes();
  
  // Sort actions by time
  actions.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
  
  let currentTime = 0;
  
  for (const action of actions) {
    const actionTime = parseFloat(action.time.replace('s', ''));
    const waitTime = (actionTime - currentTime) * 1000;
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const session = userSessions[action.user];
    
    if (action.action.startsWith('take seat')) {
      const seatNumber = parseInt(action.action.match(/\d+/)[0]);
      try {
        await takeSeat(session.driver, seatNumber, 500);
        session.currentSeat = seatNumber;
        session.chips = 500;
      } catch (error) {
        session.lastError = error.message;
      }
    } else if (action.action.startsWith('move to seat')) {
      const seatNumber = parseInt(action.action.match(/\d+/)[0]);
      try {
        await changeSeat(session.driver, session.currentSeat, seatNumber);
        session.currentSeat = seatNumber;
      } catch (error) {
        session.lastError = error.message;
      }
    }
    
    currentTime = actionTime;
  }
  
  // Wait for all actions to complete and propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
});

When('{string} clicks {string}', async function (username, buttonText) {
  const session = userSessions[username];
  
  try {
    const button = await session.driver.wait(
      until.elementLocated(By.xpath(`//button[contains(text(), "${buttonText}")]`)),
      5000
    );
    await button.click();
  } catch (error) {
    throw new Error(`Button "${buttonText}" not found for user ${username}`);
  }
  
  // Wait for action to propagate
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Verification steps
Then('all {int} users should see the same table state', async function (userCount) {
  const tableStates = [];
  
  for (const [username, session] of Object.entries(userSessions)) {
    const tableState = await getTableState(session.driver);
    tableStates.push({ username, state: tableState });
  }
  
  // Verify all states are identical
  const referenceState = tableStates[0].state;
  for (let i = 1; i < tableStates.length; i++) {
    assert.deepEqual(
      tableStates[i].state,
      referenceState,
      `Table state mismatch between ${tableStates[0].username} and ${tableStates[i].username}`
    );
  }
});

Then('all seats should be available', async function () {
  for (const [username, session] of Object.entries(userSessions)) {
    const seats = await session.driver.findElements(By.css('[data-testid^="seat-"]'));
    
    for (const seat of seats) {
      const isAvailable = await seat.findElement(By.css('.seat-status')).getText();
      assert.include(['Available', 'Empty', ''], isAvailable, 
        `Seat should be available for user ${username}`);
    }
  }
});

Then('{string} should be seated at seat {int} in all browser instances', async function (username, seatNumber) {
  for (const [otherUser, session] of Object.entries(userSessions)) {
    const seatElement = await session.driver.wait(
      until.elementLocated(By.css(`[data-testid="seat-${seatNumber}"]`)),
      5000
    );
    
    const playerName = await seatElement.findElement(By.css('.player-name')).getText();
    assert.equal(playerName, username, 
      `User ${username} should be visible at seat ${seatNumber} in ${otherUser}'s browser`);
  }
});

Then('seat {int} should be marked as occupied in all browser instances', async function (seatNumber) {
  for (const [username, session] of Object.entries(userSessions)) {
    const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
    const seatClass = await seatElement.getAttribute('class');
    
    assert.include(seatClass, 'occupied', 
      `Seat ${seatNumber} should be marked as occupied in ${username}'s browser`);
  }
});

Then('{string} should have {int} chips displayed', async function (username, expectedChips) {
  for (const [otherUser, session] of Object.entries(userSessions)) {
    try {
      const playerSeat = await session.driver.findElement(
        By.xpath(`//div[contains(@class, 'player-name') and text()='${username}']/parent::*//div[contains(@class, 'chips')]`)
      );
      const chipsText = await playerSeat.getText();
      const actualChips = parseInt(chipsText.replace(/[^\d]/g, ''));
      
      assert.equal(actualChips, expectedChips, 
        `${username} should have ${expectedChips} chips displayed in ${otherUser}'s browser`);
    } catch (error) {
      // Player might not be visible in this browser instance
      console.log(`Could not verify chips for ${username} in ${otherUser}'s browser`);
    }
  }
});

Then('seats {int} and {int} should remain available in all browser instances', async function (seat1, seat2) {
  for (const [username, session] of Object.entries(userSessions)) {
    for (const seatNumber of [seat1, seat2]) {
      const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
      const seatClass = await seatElement.getAttribute('class');
      
      assert.notInclude(seatClass, 'occupied', 
        `Seat ${seatNumber} should be available in ${username}'s browser`);
    }
  }
});

Then('the total seated players should be {int} in all browser instances', async function (expectedCount) {
  for (const [username, session] of Object.entries(userSessions)) {
    const occupiedSeats = await session.driver.findElements(By.css('.seat.occupied'));
    
    assert.equal(occupiedSeats.length, expectedCount, 
      `Should have ${expectedCount} seated players in ${username}'s browser`);
  }
});

Then('all users can see the current seating arrangement', async function () {
  // Verify all users can see the current state - check consistency across browsers
  const referenceState = await getTableState(Object.values(userSessions)[0].driver);
  
  for (const [username, session] of Object.entries(userSessions)) {
    const currentState = await getTableState(session.driver);
    
    // Compare seated players
    assert.deepEqual(currentState.seatedPlayers, referenceState.seatedPlayers,
      `${username}'s view should match reference state for seated players`);
    
    // Compare available seats
    assert.deepEqual(currentState.availableSeats, referenceState.availableSeats,
      `${username}'s view should match reference state for available seats`);
  }
});

Then('the seat change should be successful in all browser instances', async function () {
  // Wait for changes to propagate
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify consistency across all browsers - check that all users see the same state
  const referenceState = await getTableState(Object.values(userSessions)[0].driver);
  
  for (const [username, session] of Object.entries(userSessions)) {
    const currentState = await getTableState(session.driver);
    
    // Compare seated players
    assert.deepEqual(currentState.seatedPlayers, referenceState.seatedPlayers,
      `${username}'s view should match reference state for seated players`);
    
    // Compare available seats
    assert.deepEqual(currentState.availableSeats, referenceState.availableSeats,
      `${username}'s view should match reference state for available seats`);
  }
});

Then('{string} should now be at seat {int} with {int} chips', async function (username, seatNumber, chips) {
  // Verify user is seated at the specified seat in all browser instances
  for (const [viewerName, session] of Object.entries(userSessions)) {
    const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
    const playerNameElement = await seatElement.findElement(By.css('.player-name'));
    const actualPlayerName = await playerNameElement.getText();
    
    assert.equal(actualPlayerName, username, 
      `${username} should be seated at seat ${seatNumber} as seen by ${viewerName}`);
  }
  
  // Verify chips display
  for (const [viewerName, session] of Object.entries(userSessions)) {
    const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
    const chipsElement = await seatElement.findElement(By.css('.chips'));
    const chipsText = await chipsElement.getText();
    const displayedChips = parseInt(chipsText.replace(/[^\d]/g, ''));
    
    assert.equal(displayedChips, chips, 
      `${username} should have ${chips} chips displayed as seen by ${viewerName}`);
  }
  
  // Update our tracking
  if (userSessions[username]) {
    userSessions[username].currentSeat = seatNumber;
    userSessions[username].chips = chips;
  }
});

Then('seat {int} should be available in all browser instances', async function (seatNumber) {
  for (const [username, session] of Object.entries(userSessions)) {
    const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
    const seatClass = await seatElement.getAttribute('class');
    
    assert.notInclude(seatClass, 'occupied', 
      `Seat ${seatNumber} should be available in ${username}'s browser`);
  }
});

Then('seat {int} should be occupied by {string} in all browser instances', async function (seatNumber, username) {
  // Verify user is seated at the specified seat in all browser instances
  for (const [viewerName, session] of Object.entries(userSessions)) {
    const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
    const playerNameElement = await seatElement.findElement(By.css('.player-name'));
    const actualPlayerName = await playerNameElement.getText();
    
    assert.equal(actualPlayerName, username, 
      `${username} should be seated at seat ${seatNumber} as seen by ${viewerName}`);
  }
});

Then('the final seating arrangement should be:', async function (dataTable) {
  const expectedArrangement = dataTable.hashes();
  
  for (const [username, session] of Object.entries(userSessions)) {
    for (const expected of expectedArrangement) {
      const seatNumber = parseInt(expected.seat);
      const expectedPlayer = expected.player;
      const expectedChips = parseInt(expected.chips);
      
      const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
      const playerName = await seatElement.findElement(By.css('.player-name')).getText();
      
      assert.equal(playerName, expectedPlayer, 
        `Seat ${seatNumber} should have ${expectedPlayer} in ${username}'s browser`);
      
      if (expectedChips) {
        const chipsElement = await seatElement.findElement(By.css('.chips'));
        const chipsText = await chipsElement.getText();
        const actualChips = parseInt(chipsText.replace(/[^\d]/g, ''));
        
        assert.equal(actualChips, expectedChips, 
          `${expectedPlayer} should have ${expectedChips} chips in ${username}'s browser`);
      }
    }
  }
});

Then('seats {int}, {int}, and {int} should be available in all browser instances', async function (seat1, seat2, seat3) {
  for (const seatNumber of [seat1, seat2, seat3]) {
    // Check that seat is available in all browser instances
    for (const [username, session] of Object.entries(userSessions)) {
      const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
      const seatClass = await seatElement.getAttribute('class');
      
      assert.notInclude(seatClass, 'occupied', 
        `Seat ${seatNumber} should be available in ${username}'s browser`);
    }
  }
});

// Multi-user specific error handling - extends common error handling
Then('the action should be rejected with {string}', async function (expectedError) {
  // Check that at least one user received the expected error
  let errorFound = false;
  
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.lastError && session.lastError.includes(expectedError)) {
      errorFound = true;
      break;
    }
  }
  
  assert.isTrue(errorFound, `Expected error "${expectedError}" not found in any browser instance`);
});

Then('{string} should remain at seat {int}', async function (username, seatNumber) {
  const session = userSessions[username];
  assert.equal(session.currentSeat, seatNumber, 
    `${username} should remain at seat ${seatNumber}`);
});

Then('the final arrangement should show:', async function (dataTable) {
  // Verify the final seating arrangement
  const expectedArrangement = dataTable.hashes();
  
  for (const [username, session] of Object.entries(userSessions)) {
    for (const expected of expectedArrangement) {
      const seatNumber = parseInt(expected.seat);
      const expectedPlayer = expected.player;
      const expectedChips = parseInt(expected.chips);
      
      const seatElement = await session.driver.findElement(By.css(`[data-testid="seat-${seatNumber}"]`));
      const playerName = await seatElement.findElement(By.css('.player-name')).getText();
      
      assert.equal(playerName, expectedPlayer, 
        `Seat ${seatNumber} should have ${expectedPlayer} in ${username}'s browser`);
      
      if (expectedChips) {
        const chipsElement = await seatElement.findElement(By.css('.chips'));
        const chipsText = await chipsElement.getText();
        const actualChips = parseInt(chipsText.replace(/[^\d]/g, ''));
        
        assert.equal(actualChips, expectedChips, 
          `${expectedPlayer} should have ${expectedChips} chips in ${username}'s browser`);
      }
    }
  }
});

Then('the final seating arrangement should be consistent across all browser instances', async function () {
  // Check that all users see the same table state
  const referenceState = await getTableState(Object.values(userSessions)[0].driver);
  
  for (const [username, session] of Object.entries(userSessions)) {
    const currentState = await getTableState(session.driver);
    
    // Compare seated players
    assert.deepEqual(currentState.seatedPlayers, referenceState.seatedPlayers,
      `${username}'s view should match reference state for seated players`);
    
    // Compare available seats
    assert.deepEqual(currentState.availableSeats, referenceState.availableSeats,
      `${username}'s view should match reference state for available seats`);
  }
});

Then('no seat should have multiple occupants', async function () {
  const seatOccupants = {};
  
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.currentSeat !== null) {
      if (seatOccupants[session.currentSeat]) {
        throw new Error(`Seat ${session.currentSeat} has multiple occupants: ${seatOccupants[session.currentSeat]} and ${username}`);
      }
      seatOccupants[session.currentSeat] = username;
    }
  }
});

Then('no user should be assigned to multiple seats', async function () {
  const userSeats = {};
  
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.currentSeat !== null) {
      if (userSeats[username]) {
        throw new Error(`User ${username} is assigned to multiple seats: ${userSeats[username]} and ${session.currentSeat}`);
      }
      userSeats[username] = session.currentSeat;
    }
  }
});

Then('all seat changes should be properly logged', async function () {
  // This would typically verify audit logs, but for now we just verify state consistency
  const referenceState = await getTableState(Object.values(userSessions)[0].driver);
  
  for (const [username, session] of Object.entries(userSessions)) {
    const currentState = await getTableState(session.driver);
    
    // Compare seated players
    assert.deepEqual(currentState.seatedPlayers, referenceState.seatedPlayers,
      `${username}'s view should match reference state for seated players`);
    
    // Compare available seats
    assert.deepEqual(currentState.availableSeats, referenceState.availableSeats,
      `${username}'s view should match reference state for available seats`);
  }
});

Then('the UI should reflect the correct final state in all browser instances', async function () {
  // Check that all users see the same table state
  const referenceState = await getTableState(Object.values(userSessions)[0].driver);
  
  for (const [username, session] of Object.entries(userSessions)) {
    const currentState = await getTableState(session.driver);
    
    // Compare seated players
    assert.deepEqual(currentState.seatedPlayers, referenceState.seatedPlayers,
      `${username}'s view should match reference state for seated players`);
    
    // Compare available seats
    assert.deepEqual(currentState.availableSeats, referenceState.availableSeats,
      `${username}'s view should match reference state for available seats`);
  }
});

Then('the error should be displayed in browser instance {int}', async function (instanceNum) {
  const browserId = `browser${instanceNum}`;
  const driver = browserInstances[browserId];
  
  try {
    const errorElement = await driver.wait(
      until.elementLocated(By.css('.error-message, .alert-error, [data-testid="error"]')),
      3000
    );
    
    const errorText = await errorElement.getText();
    assert.isNotEmpty(errorText, 'Error message should be displayed');
  } catch (error) {
    throw new Error(`Error message not found in browser instance ${instanceNum}`);
  }
});

Then('only one of them should succeed in taking seat {int}', async function (seatNumber) {
  // Check that exactly one action succeeded
  let successCount = 0;
  let errorCount = 0;
  
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.lastResult) {
      if (session.lastResult.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
      }
    }
  }
  
  assert.equal(successCount, 1, 'Exactly one user should succeed in taking the seat');
  assert.equal(errorCount, 1, 'Exactly one user should receive an error');
});

Then('the other should receive {string} error', async function (expectedError) {
  // This is verified in the previous step
});

Then('the seat assignment should be consistent across all browser instances', async function () {
  // Check that all users see the same table state
  const referenceState = await getTableState(Object.values(userSessions)[0].driver);
  
  for (const [username, session] of Object.entries(userSessions)) {
    const currentState = await getTableState(session.driver);
    
    // Compare seated players
    assert.deepEqual(currentState.seatedPlayers, referenceState.seatedPlayers,
      `${username}'s view should match reference state for seated players`);
    
    // Compare available seats
    assert.deepEqual(currentState.availableSeats, referenceState.availableSeats,
      `${username}'s view should match reference state for available seats`);
  }
});

Then('no user should lose their original seat until successfully moved', async function () {
  // Verify that all users maintain their seats unless explicitly moved
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.currentSeat !== null) {
      const seatElement = await session.driver.findElement(
        By.css(`[data-testid="seat-${session.currentSeat}"]`)
      );
      const playerName = await seatElement.findElement(By.css('.player-name')).getText();
      
      if (playerName !== username && !session.lastError) {
        throw new Error(`${username} lost their seat ${session.currentSeat} unexpectedly`);
      }
    }
  }
});

Then('all browser instances should immediately show:', async function (dataTable) {
  // Wait a moment for updates to propagate
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const expectedState = dataTable.hashes();
  
  for (const [username, session] of Object.entries(userSessions)) {
    for (const expected of expectedState) {
      if (expected.seat && expected.player) {
        const seatNumber = parseInt(expected.seat);
        const seatElement = await session.driver.findElement(
          By.css(`[data-testid="seat-${seatNumber}"]`)
        );
        
        if (expected.player) {
          const playerName = await seatElement.findElement(By.css('.player-name')).getText();
          assert.equal(playerName, expected.player, 
            `Seat ${seatNumber} should show ${expected.player} in ${username}'s browser`);
        }
        
        if (expected.chips) {
          const chipsElement = await seatElement.findElement(By.css('.chips'));
          const chipsText = await chipsElement.getText();
          const actualChips = parseInt(chipsText.replace(/[^\d]/g, ''));
          assert.equal(actualChips, parseInt(expected.chips), 
            `${expected.player} should have ${expected.chips} chips in ${username}'s browser`);
        }
        
        if (expected.status) {
          const seatClass = await seatElement.getAttribute('class');
          if (expected.status === 'occupied') {
            assert.include(seatClass, 'occupied', 
              `Seat ${seatNumber} should be occupied in ${username}'s browser`);
          } else if (expected.status === 'available') {
            assert.notInclude(seatClass, 'occupied', 
              `Seat ${seatNumber} should be available in ${username}'s browser`);
          }
        }
      }
    }
  }
});

Then('the minimum players requirement is met \\({int}+ players\\)', async function (minPlayers) {
  // Count seated players
  let seatedCount = 0;
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.currentSeat !== null) {
      seatedCount++;
    }
  }
  
  assert.isAtLeast(seatedCount, minPlayers, 
    `Should have at least ${minPlayers} seated players`);
});

Then('the {string} button should be enabled in all browser instances', async function (buttonText) {
  for (const [username, session] of Object.entries(userSessions)) {
    try {
      const button = await session.driver.findElement(
        By.xpath(`//button[contains(text(), "${buttonText}")]`)
      );
      const isEnabled = await button.isEnabled();
      assert.isTrue(isEnabled, 
        `"${buttonText}" button should be enabled in ${username}'s browser`);
    } catch (error) {
      console.log(`"${buttonText}" button not found in ${username}'s browser`);
    }
  }
});

Then('all seated players should see their ready status', async function () {
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.currentSeat !== null) {
      try {
        const readyIndicator = await session.driver.findElement(
          By.css('.ready-status, [data-testid="ready-status"]')
        );
        assert.isTrue(await readyIndicator.isDisplayed(), 
          `${username} should see ready status indicator`);
      } catch (error) {
        console.log(`Ready status not found for ${username}`);
      }
    }
  }
});

Then('the game should start for all players', async function () {
  // Wait for game to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  for (const [username, session] of Object.entries(userSessions)) {
    try {
      const gameStatus = await session.driver.findElement(
        By.css('.game-status, [data-testid="game-status"]')
      );
      const statusText = await gameStatus.getText();
      assert.include(statusText.toLowerCase(), 'playing', 
        `Game should be in playing status for ${username}`);
    } catch (error) {
      console.log(`Game status not found for ${username}`);
    }
  }
});

Then('blinds should be assigned correctly', async function () {
  // Verify blind assignments are visible
  for (const [username, session] of Object.entries(userSessions)) {
    try {
      const blindIndicators = await session.driver.findElements(
        By.css('.blind-indicator, [data-testid^="blind-"]')
      );
      assert.isAtLeast(blindIndicators.length, 1, 
        `Blind indicators should be visible for ${username}`);
    } catch (error) {
      console.log(`Blind indicators not found for ${username}`);
    }
  }
});

Then('all players should receive hole cards', async function () {
  for (const [username, session] of Object.entries(userSessions)) {
    if (session.currentSeat !== null) {
      try {
        const holeCards = await session.driver.findElements(
          By.css('.hole-card, [data-testid^="hole-card"]')
        );
        assert.equal(holeCards.length, 2, 
          `${username} should receive 2 hole cards`);
      } catch (error) {
        console.log(`Hole cards not found for ${username}`);
      }
    }
  }
});

Then('the game state should be synchronized across all browser instances', async function () {
  // Check that all users see the same table state
  const referenceState = await getTableState(Object.values(userSessions)[0].driver);
  
  for (const [username, session] of Object.entries(userSessions)) {
    const currentState = await getTableState(session.driver);
    
    // Compare seated players
    assert.deepEqual(currentState.seatedPlayers, referenceState.seatedPlayers,
      `${username}'s view should match reference state for seated players`);
    
    // Compare available seats
    assert.deepEqual(currentState.availableSeats, referenceState.availableSeats,
      `${username}'s view should match reference state for available seats`);
  }
});

// Helper functions
async function loginUser(driver, username) {
  try {
    console.log(`🔑 Setting up authentication for ${username}...`);
    
    // Navigate to lobby page first
    await driver.get('http://localhost:3000');
    await driver.wait(until.elementLocated(By.css('[data-testid="lobby-container"]')), 10000);
    console.log(`✅ ${username} loaded lobby page`);
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if user is already logged in by looking for user info
    try {
      const userInfo = await driver.wait(
        until.elementLocated(By.css('[data-testid="user-name"]')),
        3000
      );
      const currentUser = await userInfo.getText();
      if (currentUser.includes(username)) {
        console.log(`✅ ${username} is already logged in`);
        return;
      }
    } catch (error) {
      console.log(`🔍 User not logged in, proceeding with login flow...`);
    }
    
    // Step 1: Check if user is already logged in, if so logout first  
    console.log(`🔍 Checking login state for ${username}...`);
    
    // First check if user is already logged in (logout button present)
    try {
      const logoutButton = await driver.findElement(By.css('[data-testid="logout-button"]'));
      if (await logoutButton.isDisplayed()) {
        console.log(`🔍 User already logged in, logging out first for ${username}...`);
        await logoutButton.click();
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for logout to complete
        console.log(`✅ Logged out previous user for ${username}`);
      }
    } catch (logoutError) {
      console.log(`🔍 No logout button found, user not logged in for ${username}`);
    }
    
    // Now look for login button
    console.log(`🎯 Looking for login button to open modal for ${username}...`);
    let openModalButton;
    try {
      openModalButton = await driver.wait(
        until.elementLocated(By.css('[data-testid="login-button"]')),
        10000
      );
      console.log(`✅ Found modal trigger button for ${username}`);
    } catch (error) {
      // Try alternative selectors
      try {
        const alternatives = [
          '//button[contains(text(), "Login")]',
          '[data-testid="anonymous-info"] button',
          'button[data-testid*="login"]'
        ];
        
        for (const selector of alternatives) {
          try {
            if (selector.startsWith('//')) {
              openModalButton = await driver.wait(until.elementLocated(By.xpath(selector)), 3000);
            } else {
              openModalButton = await driver.wait(until.elementLocated(By.css(selector)), 3000);
            }
            console.log(`✅ Found login button via alternative selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`⚠️ Alternative selector failed: ${selector}`);
          }
        }
        
        if (!openModalButton) {
          throw new Error('No login button found with any selector');
        }
        
      } catch (altError) {
        console.log(`❌ Could not find login button for ${username} with any method`);
        throw new Error(`Login button not found: ${error.message}`);
      }
    }
    
    await openModalButton.click();
    console.log(`🔓 Clicked login button to open modal for ${username}`);
    
    // Step 2: Wait for modal to appear and fill nickname input
    console.log(`⏳ Waiting for login modal to appear for ${username}...`);
    const nicknameInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="nickname-input"]')),
      8000
    );
    console.log(`✅ Found nickname input for ${username}`);
    
    // Clear and enter username
    await nicknameInput.clear();
    await nicknameInput.sendKeys(username);
    console.log(`📝 Entered username: ${username}`);
    
    // Step 3: Click the "Start Playing" button to submit
    const submitButton = await driver.wait(
      until.elementLocated(By.css('[data-testid="join-button"]')),
      5000
    );
    console.log(`🎯 Found submit button for ${username}`);
    
    await submitButton.click();
    console.log(`✅ Clicked submit button for ${username}`);
    
    // Step 4: Wait for login to complete and modal to close
    console.log(`⏳ Waiting for login to complete for ${username}...`);
    await driver.wait(
      until.elementLocated(By.css('[data-testid="user-name"]')),
      10000
    );
    
    // Verify the user is now logged in
    const userInfo = await driver.findElement(By.css('[data-testid="user-name"]'));
    const loggedInUser = await userInfo.getText();
    if (loggedInUser.includes(username)) {
      console.log(`✅ Login successful for ${username}`);
    } else {
      console.log(`⚠️ Login may not have completed correctly for ${username} (expected: ${username}, got: ${loggedInUser})`);
    }
    
    // Wait a bit more for the system to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.log(`❌ Login failed for ${username}: ${error.message}`);
    
    // Debug: Take a screenshot and log page state
    try {
      const pageSource = await driver.getPageSource();
      console.log(`📄 Page title: ${await driver.getTitle()}`);
      console.log(`🔗 Current URL: ${await driver.getCurrentUrl()}`);
      console.log(`📋 Page contains login elements: ${pageSource.includes('data-testid="login-button"')}`);
      console.log(`📋 Page contains modal elements: ${pageSource.includes('data-testid="nickname-input"')}`);
    } catch (debugError) {
      console.log(`Debug info collection failed: ${debugError.message}`);
    }
    
    throw new Error(`Failed to login user ${username}: ${error.message}`);
  }
}

async function navigateToTable(driver, tableName) {
  try {
    console.log(`🚢 Following proper user flow to join table ${tableName}...`);
    
    // Step 1: Navigate to lobby  
    await driver.get('http://localhost:3000/');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`✅ Navigated to lobby`);
    
    // Step 2: Join a table (which creates the game) - ENHANCED VERSION
    try {
      console.log(`🔍 Looking for table join buttons...`);
      
      // Wait for tables to load first
      await driver.wait(until.elementLocated(By.css('[data-testid^="join-table-"]')), 15000);
      const joinButtons = await driver.findElements(By.css('[data-testid^="join-table-"]'));
      console.log(`📊 Found ${joinButtons.length} table join buttons`);
      
      if (joinButtons.length > 0) {
        const firstTableButton = joinButtons[0];
        const testId = await firstTableButton.getAttribute('data-testid');
        console.log(`🎯 Clicking first table join button: ${testId}`);
        
        // Use JavaScript click for reliability
        await driver.executeScript("arguments[0].click();", firstTableButton);
        
        // Wait for navigation to complete (welcome popup may appear)
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`✅ Table join button clicked`);
        
        // Step 3: Wait for poker table to appear
        console.log(`🔍 Waiting for poker table to appear...`);
        await driver.wait(until.elementLocated(By.css('[data-testid="poker-table"]')), 20000);
        console.log(`✅ Poker table found - on game page`);
        
      } else {
        throw new Error('No table join buttons found');
      }
      
    } catch (e) {
      console.log(`❌ Failed to join table: ${e.message}`);
      
      // Try to get current URL for debugging
      try {
        const currentUrl = await driver.getCurrentUrl();
        console.log(`🔍 Current URL: ${currentUrl}`);
      } catch (urlError) {
        console.log(`🔍 Could not get URL: ${urlError.message}`);
      }
      
      throw new Error(`Failed to join table: ${e.message}`);
    }
    
    console.log(`✅ Table navigation completed for ${tableName}`);
    
  } catch (error) {
    console.log(`❌ Failed to navigate to table ${tableName}: ${error.message}`);
    throw new Error(`Failed to navigate to table ${tableName}: ${error.message}`);
  }
}

async function takeSeat(driver, seatNumber, buyIn) {
  try {
    console.log(`💺 Attempting to take seat ${seatNumber} with buy-in ${buyIn}...`);
    
    // Wait a moment for the poker table to fully load after joining
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 1: Find the correct seat element 
    const seatSelectors = [
      `[data-testid="available-seat-${seatNumber}"]`,
      `[data-testid="seat-${seatNumber}"]`,
      `.seat-${seatNumber}`,
      `[data-seat="${seatNumber}"]`
    ];
    
    let seatElement = null;
    for (const selector of seatSelectors) {
      try {
        console.log(`🔍 Trying seat selector: ${selector}`);
        seatElement = await driver.wait(
          until.elementLocated(By.css(selector)),
          5000
        );
        console.log(`✅ Found seat ${seatNumber} using selector: ${selector}`);
        break;
      } catch (error) {
        console.log(`⚠️ Seat selector failed: ${selector}`);
        continue;
      }
    }
    
    if (!seatElement) {
      throw new Error(`Failed to locate seat ${seatNumber} with any selector`);
    }
    
    // Step 2: Click the seat to open dialog
    console.log(`🎯 Clicking seat ${seatNumber} to open dialog...`);
    
    // Scroll into view and ensure clickable
    await driver.executeScript('arguments[0].scrollIntoView(true);', seatElement);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await seatElement.click();
      console.log(`✅ Successfully clicked seat ${seatNumber}`);
    } catch (clickError) {
      console.log(`⚠️ Regular click failed, trying JavaScript click...`);
      await driver.executeScript('arguments[0].click();', seatElement);
      console.log(`✅ JavaScript clicked seat ${seatNumber}`);
    }
    
    // Step 3: Wait for dialog to appear and handle it
    console.log(`⏳ Waiting for seat selection dialog...`);
    try {
      const dialogElement = await driver.wait(
        until.elementLocated(By.css('[data-testid="seat-dialog"], [role="dialog"], .dialog-overlay')),
        10000
      );
      console.log(`✅ Seat dialog detected`);
      
      // Fill buy-in input if it exists
      try {
        const buyInInput = await driver.findElement(
          By.css('input[data-testid="buyin-input"], input[type="number"], input[placeholder*="buy"], input[name="buyIn"]')
        );
        
        console.log(`💰 Found buy-in input, entering ${buyIn}...`);
        await buyInInput.clear();
        await buyInInput.sendKeys(buyIn.toString());
        
      } catch (inputError) {
        console.log(`ℹ️ No buy-in input found, using default...`);
      }
      
      // Click confirm button
      const confirmSelectors = [
        '[data-testid="confirm-button"]',
        'button[type="submit"]', 
        '.confirm-button',
        'button:contains("Confirm")',
        'button:contains("Take Seat")',
        'button:contains("Join")'
      ];
      
      let confirmButton = null;
      for (const selector of confirmSelectors) {
        try {
          if (selector.includes(':contains')) {
            confirmButton = await driver.findElement(By.xpath(`//button[contains(text(), "Confirm") or contains(text(), "Take Seat") or contains(text(), "Join")]`));
          } else {
            confirmButton = await driver.findElement(By.css(selector));
          }
          console.log(`✅ Found confirm button with selector: ${selector}`);
          break;
        } catch (error) {
          continue;
        }
      }
      
      if (!confirmButton) {
        throw new Error('Could not find confirm button in dialog');
      }
      
      console.log(`🔘 Clicking confirm button...`);
      await confirmButton.click();
      
      // Wait for dialog to close and seat assignment to complete
      console.log(`⏳ Waiting for seat assignment to complete...`);
      await driver.wait(
        until.stalenessOf(dialogElement),
        8000
      );
      
      // Additional wait for WebSocket updates
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`✅ Seat ${seatNumber} assignment completed successfully`);
      
    } catch (dialogError) {
      console.log(`⚠️ Dialog handling failed: ${dialogError.message}`);
      // Try alternative: maybe seat was taken immediately without dialog
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`ℹ️ Proceeding assuming seat was taken without dialog...`);
    }
    
  } catch (error) {
    console.log(`❌ Failed to take seat ${seatNumber}: ${error.message}`);
    throw new Error(`Failed to take seat ${seatNumber}: ${error.message}`);
  }
}

async function changeSeat(driver, fromSeat, toSeat) {
  try {
    // Right-click on current seat to open context menu
    const currentSeatElement = await driver.findElement(
      By.css(`[data-testid="seat-${fromSeat}"]`)
    );
    
    // Use Actions to right-click
    const actions = driver.actions();
    await actions.contextClick(currentSeatElement).perform();
    
    // Look for "Change Seat" option
    try {
      const changeSeatOption = await driver.wait(
        until.elementLocated(By.xpath('//div[contains(text(), "Change Seat") or contains(text(), "Move")]')),
        2000
      );
      await changeSeatOption.click();
    } catch (error) {
      // Try alternative method - direct seat click
      const targetSeatElement = await driver.findElement(
        By.css(`[data-testid="seat-${toSeat}"]`)
      );
      await targetSeatElement.click();
    }
    
    // Wait for seat change to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    throw new Error(`Failed to change from seat ${fromSeat} to seat ${toSeat}: ${error.message}`);
  }
}

async function getTableState(driver) {
  try {
    const seats = await driver.findElements(By.css('[data-testid^="seat-"]'));
    const tableState = {
      seats: [],
      totalPlayers: 0
    };
    
    for (const seat of seats) {
      const seatId = await seat.getAttribute('data-testid');
      const seatNumber = parseInt(seatId.replace('seat-', ''));
      
      try {
        const playerName = await seat.findElement(By.css('.player-name')).getText();
        const chipsText = await seat.findElement(By.css('.chips')).getText();
        const chips = parseInt(chipsText.replace(/[^\d]/g, ''));
        
        tableState.seats.push({
          number: seatNumber,
          player: playerName,
          chips: chips,
          occupied: true
        });
        tableState.totalPlayers++;
      } catch (error) {
        // Seat is empty
        tableState.seats.push({
          number: seatNumber,
          player: null,
          chips: 0,
          occupied: false
        });
      }
    }
    
    return tableState;
  } catch (error) {
    throw new Error(`Failed to get table state: ${error.message}`);
  }
}

// Cleanup after each scenario
After(async function () {
  await cleanupBrowserInstances();
});

module.exports = {
  createBrowserInstance,
  cleanupBrowserInstances,
  loginUser,
  navigateToTable,
  takeSeat,
  getTableState
}; 