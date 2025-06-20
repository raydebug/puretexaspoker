const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber')
const { seleniumManager } = require('../config/selenium.config.js')
const { WebDriverHelpers } = require('../utils/webdriverHelpers.js')

let helpers

// Global setup - runs once before all scenarios
BeforeAll(async function() {
  console.log('🚀 Setting up Selenium test environment...')
  
  // Initialize WebDriver
  const driver = await seleniumManager.getDriver()
  console.log(`✅ WebDriver initialized with browser: ${seleniumManager.getConfig().browser}`)
})

// Setup before each scenario
Before(async function() {
  console.log('🔧 Setting up scenario...')
  
  // Get or initialize driver
  const driver = await seleniumManager.getDriver()
  helpers = new WebDriverHelpers(driver)
  
  // Store helpers in the world for step definitions to access
  this.helpers = helpers
  this.driver = driver
  
  // Navigate to base URL to start fresh
  await helpers.navigateTo('/')
  console.log('✅ Navigated to base URL')
})

// Cleanup after each scenario
After(async function(scenario) {
  if (scenario.result?.status === Status.FAILED) {
    console.log(`❌ Scenario failed: ${scenario.pickle.name}`)
    
    // Take screenshot on failure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `failed-${scenario.pickle.name.replace(/\s+/g, '-')}-${timestamp}`
    await helpers.takeScreenshot(filename)
    console.log(`📸 Screenshot saved: ${filename}`)
  } else {
    console.log(`✅ Scenario passed: ${scenario.pickle.name}`)
  }
  
  // Clear browser state but keep driver alive for next scenario
  if (this.driver) {
    // Clear cookies and localStorage
    await this.driver.manage().deleteAllCookies()
    await this.driver.executeScript('window.localStorage.clear()')
    await this.driver.executeScript('window.sessionStorage.clear()')
  }
})

// Global cleanup - runs once after all scenarios
AfterAll(async function() {
  console.log('🧹 Cleaning up Selenium test environment...')
  
  // Quit WebDriver
  await seleniumManager.quitDriver()
  console.log('✅ WebDriver quit successfully')
}) 