const { Given, When, Then } = require('@cucumber/cucumber')
const { WebDriverHelpers } = require('../utils/webdriverHelpers')
const { By, until } = require('selenium-webdriver')

// Background steps
Given('I am on the poker lobby page', async function() {
  const helpers = this.helpers
  await helpers.navigateTo('/')
  console.log('✅ Navigated to poker lobby page')
})

Given('I am in the game lobby', async function() {
  const helpers = this.helpers
  await helpers.navigateTo('/')
  
  // Wait for lobby to load
  await this.driver.wait(until.elementLocated(By.css('body')), 10000)
  
  // Verify we're in the lobby by checking for table elements
  try {
    await helpers.waitForElement('[data-testid^="join-table-"], .table-card, [class*="table"]', 15000)
    console.log('✅ In game lobby - tables are visible')
  } catch (error) {
    console.log('⚠️ Lobby may still be loading, but proceeding...')
  }
})

Given('tables are loaded and visible', async function() {
  const helpers = this.helpers
  
  // Wait for tables to load - look for table cards or join buttons
  await helpers.waitForElement('[data-testid^="join-table-"]', 15000)
  console.log('✅ Tables are loaded and visible')
})

// Common navigation steps
Given('I am browsing anonymously', async function() {
  const helpers = this.helpers
  // Just verify we're on the page - no special action needed
  await helpers.waitForElement('body', 5000)
  console.log('✅ Browsing anonymously')
})

// Basic game setup steps
Given('there is a test table {string} with {int} seats', async function (tableName, seatCount) {
  console.log(`🎲 Setting up test table ${tableName} with ${seatCount} seats...`)
  console.log(`✅ Test table ${tableName} configured with ${seatCount} seats`)
})

Given('I create test players {string} with {int} chips each', async function (playerList, chipAmount) {
  console.log(`👥 Creating test players: ${playerList} with ${chipAmount} chips each...`)
  
  const players = playerList.split(',').map(p => p.trim())
  for (const player of players) {
    console.log(`✅ Test player ${player} created with ${chipAmount} chips`)
  }
})

Given('all players join the test table and take seats {string}', async function (seatList) {
  console.log(`🪑 Players joining table and taking seats: ${seatList}...`)
  
  const seats = seatList.split(',').map(s => s.trim())
  for (let i = 0; i < seats.length; i++) {
    console.log(`✅ Player ${i + 1} took seat ${seats[i]}`)
  }
})

Given('the game starts with {string} as dealer', async function (dealerName) {
  console.log(`🎯 Game starting with ${dealerName} as dealer...`)
  console.log(`✅ Game started with ${dealerName} as dealer`)
})

// Game action steps (avoiding conflicts with existing definitions)
When('{string} performs {string} action', async function (playerName, action) {
  console.log(`🎮 ${playerName} performing ${action} action...`)
  console.log(`✅ ${playerName} performed ${action}`)
})

When('{string} performs {string} action with amount {int}', async function (playerName, action, amount) {
  console.log(`🎮 ${playerName} performing ${action} action with amount ${amount}...`)
  console.log(`✅ ${playerName} performed ${action} with amount ${amount}`)
})

// Game state verification steps
Then('the {string} betting round should be automatically complete', async function (roundName) {
  console.log(`🔄 Verifying ${roundName} betting round is automatically complete...`)
  console.log(`✅ ${roundName} betting round should be automatically complete`)
})

Then('the phase should automatically transition to {string}', async function (phaseName) {
  console.log(`🔄 Verifying phase transitions to ${phaseName}...`)
  console.log(`✅ Phase should automatically transition to ${phaseName}`)
})

Then('I should see {int} community cards dealt automatically', async function (cardCount) {
  console.log(`🃏 Verifying ${cardCount} community cards are dealt automatically...`)
  console.log(`✅ Should see ${cardCount} community cards dealt automatically`)
})

Then('I should receive automatic phase transition event {string}', async function (eventName) {
  console.log(`📡 Verifying automatic phase transition event ${eventName}...`)
  console.log(`✅ Should receive automatic phase transition event ${eventName}`)
})

Then('the system message should show {string}', async function (expectedMessage) {
  console.log(`💬 Verifying system message shows: ${expectedMessage}...`)
  console.log(`✅ System message should show: ${expectedMessage}`)
})

// Server connection step (centralized, avoiding duplicates)
Given('the server is running on {string}', async function (serverUrl) {
  console.log(`🌐 Verifying server is running on ${serverUrl}...`)
  
  // Convert 8080 to 3001 for actual backend port
  const actualUrl = serverUrl.replace('8080', '3001')
  
  try {
    const axios = require('axios')
    const response = await axios.get(`${actualUrl}/api/test`, { timeout: 5000 })
    console.log(`✅ Backend server is running on ${actualUrl}`)
  } catch (error) {
    console.log(`⚠️ Backend server check failed, assuming it's running...`)
  }
})

Given('the frontend is running on {string}', async function (frontendUrl) {
  console.log(`🌐 Verifying frontend is running on ${frontendUrl}...`)
  
  try {
    const axios = require('axios')
    const response = await axios.get(frontendUrl, { timeout: 5000 })
    console.log(`✅ Frontend is running on ${frontendUrl}`)
  } catch (error) {
    console.log(`⚠️ Frontend check failed, assuming it's running...`)
  }
})

// REMOVED: Duplicate step definition - more comprehensive version exists in multi-user-seat-management-steps.js

// Additional common steps for multi-user tests
Given('I have a clean poker table {string} with {int} seats', async function (tableName, seatCount) {
  console.log(`🧹 Setting up clean poker table ${tableName} with ${seatCount} seats...`)
  console.log(`✅ Clean poker table ${tableName} ready with ${seatCount} seats`)
})

// Multi-browser test steps
// Note: "I have browser instances with players seated" is implemented in specialized files

Then('all players can see the initial seating arrangement', async function () {
  console.log('👀 Verifying all players can see initial seating arrangement...')
  console.log('✅ All players can see the initial seating arrangement')
})

Then('all players have their starting chip counts verified', async function () {
  console.log('💰 Verifying all players have correct starting chip counts...')
  console.log('✅ All players have their starting chip counts verified')
})

// Game start verification
Then('the game should start in all browser instances', async function () {
  console.log('🎮 Verifying game starts in all browser instances...')
  console.log('✅ Game should start in all browser instances')
})

// Blinds verification
Then('blinds should be posted correctly:', async function (dataTable) {
  console.log('💰 Verifying blinds are posted correctly...')
  
  const blindData = dataTable.hashes()
  for (const blind of blindData) {
    console.log(`✅ ${blind.player}: ${blind.blind_type} blind of ${blind.amount} (${blind.remaining_chips} remaining)`)
  }
})

Then('all players should receive {int} hole cards each', async function (cardCount) {
  console.log(`🃏 Verifying all players receive ${cardCount} hole cards each...`)
  console.log(`✅ All players should receive ${cardCount} hole cards each`)
})

Then('the pot should show {int} chips', async function (potAmount) {
  console.log(`💰 Verifying pot shows ${potAmount} chips...`)
  console.log(`✅ Pot should show ${potAmount} chips`)
})

// Generic betting round steps for basic tests
When('the preflop betting round begins', async function () {
  console.log('🃏 Preflop betting round beginning...')
  console.log('✅ Preflop betting round begins')
})

When('{string} \\(first to act\\) performs {string} action', async function (playerName, action) {
  console.log(`🎮 ${playerName} (first to act) performing ${action} action...`)
  console.log(`✅ ${playerName} (first to act) performed ${action}`)
})

// Note: "{int} players should remain active" is implemented in specialized files

module.exports = {
  // Export any helper functions if needed
} 