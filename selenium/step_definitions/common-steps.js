const { Given, When, Then } = require('@cucumber/cucumber')
const { WebDriverHelpers } = require('../utils/webdriverHelpers')

// Background steps
Given('I am on the poker lobby page', async function() {
  const helpers = this.helpers
  await helpers.navigateTo('/')
  console.log('✅ Navigated to poker lobby page')
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
  await helpers.waitForElement('body')
  console.log('✅ Browsing anonymously')
})

// Common wait steps
When('I wait {int} seconds', async function(seconds) {
  await this.helpers.sleep(seconds * 1000)
  console.log(`✅ Waited ${seconds} seconds`)
})

When('I wait {int} milliseconds', async function(ms) {
  await this.helpers.sleep(ms)
  console.log(`✅ Waited ${ms} milliseconds`)
})

// Common assertion steps
Then('I should see {string}', async function(text) {
  const helpers = this.helpers
  await helpers.waitForText('body', text)
  console.log(`✅ Found text: "${text}"`)
})

Then('I should not see {string}', async function(text) {
  const helpers = this.helpers
  
  // Check if the text is present - expect it not to be
  try {
    await helpers.waitForText('body', text, 2000)
    throw new Error(`Text "${text}" was found but should not be present`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('should not be present')) {
      throw error
    }
    // Expected - text not found
    console.log(`✅ Text not found (as expected): "${text}"`)
  }
})

Then('the page should contain {string}', async function(text) {
  const helpers = this.helpers
  await helpers.shouldContainText('body', text)
  console.log(`✅ Page contains: "${text}"`)
})

Then('the page should not contain {string}', async function(text) {
  const helpers = this.helpers
  await helpers.shouldNotContainText('body', text)
  console.log(`✅ Page does not contain: "${text}"`)
})

// Common element visibility steps
Then('element {string} should be visible', async function(selector) {
  const helpers = this.helpers
  await helpers.shouldBeVisible(selector)
  console.log(`✅ Element is visible: ${selector}`)
})

Then('element {string} should not be visible', async function(selector) {
  const helpers = this.helpers
  await helpers.shouldNotBeVisible(selector)
  console.log(`✅ Element is not visible: ${selector}`)
})

Then('element {string} should exist', async function(selector) {
  const helpers = this.helpers
  await helpers.shouldExist(selector)
  console.log(`✅ Element exists: ${selector}`)
})

Then('element {string} should not exist', async function(selector) {
  const helpers = this.helpers
  await helpers.shouldNotExist(selector)
  console.log(`✅ Element does not exist: ${selector}`)
}) 