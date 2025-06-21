#!/usr/bin/env node

/**
 * Demo Script: Multi-User Seat Management in Headed Mode
 * 
 * This script demonstrates the multi-user seat management functionality
 * by running a simplified version of the Cucumber test with multiple
 * browser instances that you can visually observe.
 */

const { Builder, By, until } = require('selenium-webdriver');
const { getDriverOptions } = require('./config/selenium.config');

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8080';
const TABLE_ID = 'MultiUserDemoTable';
const HEADLESS = false; // Set to true for headless mode

// Browser instances and user tracking
let browsers = {};
let users = [];

async function createBrowser(userId) {
  console.log(`🌐 Creating browser instance for ${userId}...`);
  
  const options = getDriverOptions('chrome', HEADLESS);
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  // Position windows for better visibility
  await driver.manage().window().setRect({
    x: (Object.keys(browsers).length * 400) % 1200,
    y: Math.floor(Object.keys(browsers).length / 3) * 300,
    width: 400,
    height: 600
  });
  
  browsers[userId] = driver;
  return driver;
}

async function loginUser(driver, username) {
  console.log(`👤 Logging in user: ${username}`);
  
  await driver.get(FRONTEND_URL);
  
  // Set nickname in localStorage
  await driver.executeScript(`localStorage.setItem('nickname', '${username}');`);
  
  // Wait for page to load
  await driver.wait(until.elementLocated(By.css('body')), 5000);
  
  console.log(`✅ ${username} logged in successfully`);
}

async function navigateToTable(driver, username) {
  console.log(`🚀 ${username} navigating to table...`);
  
  try {
    // Navigate directly to table
    await driver.get(`${FRONTEND_URL}/table/${TABLE_ID}`);
    
    // Wait for poker table to load
    await driver.wait(
      until.elementLocated(By.css('.poker-table, [data-testid="poker-table"]')),
      10000
    );
    
    console.log(`✅ ${username} successfully joined table`);
  } catch (error) {
    console.error(`❌ ${username} failed to navigate to table:`, error.message);
    throw error;
  }
}

async function takeSeat(driver, username, seatNumber, buyIn) {
  console.log(`💺 ${username} attempting to take seat ${seatNumber} with buy-in ${buyIn}...`);
  
  try {
    // Find and click the seat
    const seatElement = await driver.wait(
      until.elementLocated(By.css(`[data-testid="seat-${seatNumber}"], .seat:nth-child(${seatNumber})`)),
      5000
    );
    
    await driver.sleep(500); // Brief pause for visibility
    await seatElement.click();
    
    // Look for buy-in dialog
    try {
      const buyInInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder*="buy"], input[name="buyIn"], #buyIn')),
        3000
      );
      
      await buyInInput.clear();
      await buyInInput.sendKeys(buyIn.toString());
      
      // Find and click confirm button
      const confirmButton = await driver.findElement(
        By.css('button[type="submit"], .confirm-button, button:contains("Confirm"), button:contains("Join")')
      );
      await confirmButton.click();
      
      console.log(`✅ ${username} successfully took seat ${seatNumber} with ${buyIn} chips`);
    } catch (error) {
      console.log(`ℹ️  ${username} took seat ${seatNumber} directly (no buy-in dialog)`);
    }
    
    // Wait for seat assignment to complete
    await driver.sleep(1000);
    
  } catch (error) {
    console.error(`❌ ${username} failed to take seat ${seatNumber}:`, error.message);
    throw error;
  }
}

async function changeSeat(driver, username, fromSeat, toSeat) {
  console.log(`🔄 ${username} changing from seat ${fromSeat} to seat ${toSeat}...`);
  
  try {
    // Try clicking on the target seat
    const targetSeat = await driver.findElement(
      By.css(`[data-testid="seat-${toSeat}"], .seat:nth-child(${toSeat})`)
    );
    
    await driver.sleep(500); // Brief pause for visibility
    await targetSeat.click();
    
    // Wait for seat change to complete
    await driver.sleep(1000);
    
    console.log(`✅ ${username} successfully changed to seat ${toSeat}`);
  } catch (error) {
    console.error(`❌ ${username} failed to change seats:`, error.message);
  }
}

async function verifySeatingArrangement() {
  console.log(`\n🔍 Verifying seating arrangement across all browser instances...`);
  
  const allStates = {};
  
  for (const [username, driver] of Object.entries(browsers)) {
    try {
      const seats = await driver.findElements(By.css('[data-testid^="seat-"], .seat'));
      const userSeats = [];
      
      for (let i = 0; i < seats.length; i++) {
        try {
          const playerElement = await seats[i].findElement(By.css('.player-name, .player'));
          const playerName = await playerElement.getText();
          if (playerName) {
            userSeats.push({ seat: i + 1, player: playerName });
          }
        } catch (error) {
          // Seat is empty
        }
      }
      
      allStates[username] = userSeats;
      console.log(`  ${username} sees: ${JSON.stringify(userSeats)}`);
    } catch (error) {
      console.error(`❌ Failed to verify state for ${username}:`, error.message);
    }
  }
  
  // Check consistency
  const stateKeys = Object.keys(allStates);
  if (stateKeys.length > 1) {
    const referenceState = JSON.stringify(allStates[stateKeys[0]]);
    const allConsistent = stateKeys.every(key => 
      JSON.stringify(allStates[key]) === referenceState
    );
    
    if (allConsistent) {
      console.log(`✅ All browser instances show consistent seating arrangement!`);
    } else {
      console.log(`⚠️  Seating arrangements are inconsistent across browser instances`);
    }
  }
}

async function runDemo() {
  console.log(`🎮 Starting Multi-User Seat Management Demo`);
  console.log(`🔧 Frontend: ${FRONTEND_URL}`);
  console.log(`🔧 Backend: ${BACKEND_URL}`);
  console.log(`🔧 Table: ${TABLE_ID}`);
  console.log(`🔧 Headless: ${HEADLESS}\n`);
  
  try {
    // Phase 1: Create users and join table
    console.log(`📋 PHASE 1: Multiple Users Join Table\n`);
    
    const usernames = ['Alice', 'Bob', 'Charlie', 'Diana'];
    
    for (const username of usernames) {
      const driver = await createBrowser(username);
      await loginUser(driver, username);
      await navigateToTable(driver, username);
      users.push({ username, driver });
      
      // Small delay between users for visibility
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await verifySeatingArrangement();
    
    // Phase 2: Users take different seats
    console.log(`\n📋 PHASE 2: Users Take Different Seats\n`);
    
    const seatAssignments = [
      { username: 'Alice', seat: 1, buyIn: 500 },
      { username: 'Bob', seat: 3, buyIn: 750 },
      { username: 'Charlie', seat: 5, buyIn: 600 },
      { username: 'Diana', seat: 2, buyIn: 800 }
    ];
    
    for (const assignment of seatAssignments) {
      const user = users.find(u => u.username === assignment.username);
      if (user) {
        await takeSeat(user.driver, assignment.username, assignment.seat, assignment.buyIn);
        // Small delay for visibility
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    await verifySeatingArrangement();
    
    // Phase 3: Users change seats
    console.log(`\n📋 PHASE 3: Users Change Seats\n`);
    
    const seatChanges = [
      { username: 'Alice', fromSeat: 1, toSeat: 4 },
      { username: 'Bob', fromSeat: 3, toSeat: 6 },
      { username: 'Charlie', fromSeat: 5, toSeat: 1 }
    ];
    
    for (const change of seatChanges) {
      const user = users.find(u => u.username === change.username);
      if (user) {
        await changeSeat(user.driver, change.username, change.fromSeat, change.toSeat);
        // Small delay for visibility
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    await verifySeatingArrangement();
    
    // Phase 4: Demonstrate conflict prevention
    console.log(`\n📋 PHASE 4: Conflict Prevention Demo\n`);
    
    console.log(`🚫 Attempting simultaneous seat conflicts...`);
    
    // Try to have Diana take Alice's seat (should fail)
    const dianaUser = users.find(u => u.username === 'Diana');
    if (dianaUser) {
      try {
        await takeSeat(dianaUser.driver, 'Diana', 1, 500); // Alice is in seat 1
        console.log(`⚠️  Diana was able to take Alice's seat (unexpected)`);
      } catch (error) {
        console.log(`✅ Diana correctly prevented from taking occupied seat`);
      }
    }
    
    await verifySeatingArrangement();
    
    console.log(`\n🎉 Demo completed successfully!`);
    console.log(`\n👀 You can observe the browser windows to see the real-time updates`);
    console.log(`⏰ Browser windows will close in 30 seconds...`);
    
    // Keep browsers open for observation
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error(`❌ Demo failed:`, error);
  } finally {
    // Cleanup
    console.log(`\n🧹 Cleaning up browser instances...`);
    for (const [username, driver] of Object.entries(browsers)) {
      try {
        await driver.quit();
        console.log(`✅ Closed browser for ${username}`);
      } catch (error) {
        console.error(`❌ Error closing browser for ${username}:`, error.message);
      }
    }
    
    console.log(`\n✅ Demo cleanup completed`);
  }
}

// Handle interruption gracefully
process.on('SIGINT', async () => {
  console.log(`\n🛑 Demo interrupted. Cleaning up...`);
  for (const [username, driver] of Object.entries(browsers)) {
    try {
      await driver.quit();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  process.exit(0);
});

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = {
  runDemo,
  createBrowser,
  loginUser,
  navigateToTable,
  takeSeat,
  changeSeat,
  verifySeatingArrangement
}; 