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
    try {
      // Set shorter timeout for cleanup operations
      await this.driver.manage().setTimeouts({ implicit: 2000, script: 2000 });
      
      // Clear cookies and localStorage with timeout protection
      await Promise.race([
        this.driver.manage().deleteAllCookies(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout clearing cookies')), 3000))
      ]);
      
      await Promise.race([
        this.driver.executeScript('window.localStorage.clear()'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout clearing localStorage')), 3000))
      ]);
      
      await Promise.race([
        this.driver.executeScript('window.sessionStorage.clear()'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout clearing sessionStorage')), 3000))
      ]);
      
      console.log('✅ Browser state cleared successfully');
    } catch (error) {
      console.log(`⚠️ Could not clear browser state: ${error.message}, continuing...`);
    } finally {
      // Reset timeouts
      try {
        await this.driver.manage().setTimeouts({ implicit: 10000, script: 30000 });
      } catch (resetError) {
        console.log(`⚠️ Could not reset timeouts: ${resetError.message}`);
      }
    }
  }
})

// Global cleanup - runs once after all scenarios
AfterAll(async function() {
  console.log('🧹 Cleaning up Selenium test environment...')
  
  // Quit WebDriver
  await seleniumManager.quitDriver()
  console.log('✅ WebDriver quit successfully')
}) 