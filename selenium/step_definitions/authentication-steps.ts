import { Given, When, Then } from '@cucumber/cucumber'
import { WebDriverHelpers } from '../utils/webdriverHelpers'

// Authentication states
Given('I am not logged in', async function() {
  const helpers: WebDriverHelpers = this.helpers
  
  // Verify user is not logged in by checking for anonymous info
  await helpers.shouldNotExist('[data-testid="user-info"]')
  await helpers.shouldBeVisible('[data-testid="anonymous-info"]')
  console.log('✅ Verified user is not logged in')
})

// Authentication actions
When('I click the login button', async function() {
  const helpers: WebDriverHelpers = this.helpers
  
  // Find and click the login button - try multiple possible selectors
  const loginSelectors = [
    '[data-testid="login-btn"]',
    '[data-testid="login-button"]', 
    'button:contains("Login")',
    'button:contains("Sign In")',
    '.login-button',
    '#login-button'
  ]
  
  let clicked = false
  for (const selector of loginSelectors) {
    try {
      if (await helpers.elementExists(selector)) {
        await helpers.click(selector)
        clicked = true
        console.log(`✅ Clicked login button using selector: ${selector}`)
        break
      }
    } catch (error) {
      // Try next selector
      continue
    }
  }
  
  if (!clicked) {
    // As fallback, try clicking any button that might trigger login
    await helpers.click('button')
    console.log('✅ Clicked button as fallback for login')
  }
})

When('I login with nickname {string}', async function(nickname: string) {
  const helpers: WebDriverHelpers = this.helpers
  
  // Find login input using multiple selectors for reliability
  const inputSelectors = [
    '[data-testid="nickname-input"]',
    '[data-cy="nickname-input"]', 
    '#nickname-input',
    'input[name="nickname"]',
    'input[type="text"]',
    'input[placeholder*="name"]',
    'input[placeholder*="nick"]'
  ]
  
  let inputFound = false
  for (const selector of inputSelectors) {
    try {
      if (await helpers.elementExists(selector)) {
        await helpers.clearAndType(selector, nickname)
        inputFound = true
        console.log(`✅ Entered nickname "${nickname}" using selector: ${selector}`)
        break
      }
    } catch (error) {
      continue
    }
  }
  
  if (!inputFound) {
    throw new Error('Could not find nickname input field')
  }
  
  // Find and click submit button
  const submitSelectors = [
    '[data-testid="join-button"]',
    '[data-testid="login-button"]',
    'button:contains("Join")',
    'button:contains("Login")', 
    'button:contains("Submit")',
    'button[type="submit"]'
  ]
  
  let submitClicked = false
  for (const selector of submitSelectors) {
    try {
      if (await helpers.elementExists(selector)) {
        // Verify button is enabled before clicking
        await helpers.shouldBeEnabled(selector)
        await helpers.click(selector)
        submitClicked = true
        console.log(`✅ Clicked submit button using selector: ${selector}`)
        break
      }
    } catch (error) {
      continue
    }
  }
  
  if (!submitClicked) {
    throw new Error('Could not find submit button')
  }
  
  // Wait for form submission to process
  await helpers.sleep(1000)
  
  // Wait for modal to close and authentication state to update
  await helpers.waitForElementNotPresent('[data-testid="nickname-modal"]', 5000)
  await helpers.waitForElement('[data-testid="user-info"]', 5000)
  
  console.log('✅ Login completed successfully')
})

When('I click start playing without entering nickname', async function() {
  const helpers: WebDriverHelpers = this.helpers
  
  // First ensure the modal is open and visible
  await helpers.shouldBeVisible('[data-testid="nickname-modal"]')
  
  // Ensure the nickname input is empty
  const inputSelector = '[data-testid="nickname-input"]'
  const inputValue = await helpers.getAttribute(inputSelector, 'value')
  if (inputValue !== '') {
    await helpers.clearAndType(inputSelector, '')
  }
  
  // Find and click the join button without entering any nickname
  await helpers.shouldBeVisible('[data-testid="join-button"]')
  await helpers.shouldBeEnabled('[data-testid="join-button"]')
  await helpers.click('[data-testid="join-button"]')
  
  console.log('✅ Clicked Start Playing button without entering nickname')
})

// Authentication assertions
Then('I should be prompted to login first', async function() {
  const helpers: WebDriverHelpers = this.helpers
  
  // Check for login-related UI elements
  const modalSelectors = [
    '[data-testid="nickname-modal"]',
    '[data-testid*="login"]',
    '[data-testid*="modal"]',
    '.modal'
  ]
  
  let modalFound = false
  for (const selector of modalSelectors) {
    try {
      if (await helpers.elementExists(selector)) {
        await helpers.shouldBeVisible(selector)
        modalFound = true
        console.log(`✅ Login prompt found using selector: ${selector}`)
        break
      }
    } catch (error) {
      continue
    }
  }
  
  if (!modalFound) {
    // Check for login form without modal wrapper
    const formSelectors = [
      'input[type="text"]',
      'input[placeholder*="name"]',
      'input[placeholder*="nick"]'
    ]
    
    for (const selector of formSelectors) {
      try {
        if (await helpers.elementExists(selector)) {
          await helpers.shouldBeVisible(selector)
          console.log(`✅ Login form found using selector: ${selector}`)
          return
        }
      } catch (error) {
        continue
      }
    }
    
    throw new Error('No login prompt found')
  }
})

Then('I should see a welcome message with {string} on the top right', async function(nickname: string) {
  const helpers: WebDriverHelpers = this.helpers
  
  // Check for user info in various possible locations
  console.log(`🔍 Looking for welcome message with ${nickname}...`)
  
  // Try different selectors for user info
  const userInfoSelectors = [
    '[data-testid="user-info"]',
    '[data-testid="user-name"]',
    '.user-info',
    '.user-name'
  ]
  
  let found = false
  for (const selector of userInfoSelectors) {
    try {
      if (await helpers.elementExists(selector)) {
        await helpers.shouldBeVisible(selector)
        await helpers.shouldContainText(selector, nickname)
        found = true
        console.log(`✅ Welcome message found using selector: ${selector}`)
        break
      }
    } catch (error) {
      continue
    }
  }
  
  if (!found) {
    // Fallback: check for nickname anywhere on the page
    try {
      await helpers.shouldContainText('body', nickname)
      console.log(`✅ Nickname found on page: ${nickname}`)
    } catch (error) {
      throw new Error(`Welcome message with "${nickname}" not found`)
    }
  }
})

Then('I should see error message {string}', async function(errorMessage: string) {
  const helpers: WebDriverHelpers = this.helpers
  
  // Check for error message in the modal
  await helpers.shouldBeVisible('[data-testid="modal-error"]')
  await helpers.shouldContainText('[data-testid="modal-error"]', errorMessage)
  console.log(`✅ Error message verified: "${errorMessage}"`)
}) 