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
Before({timeout: 60000}, async function() {
  console.log('🔧 Setting up scenario...')
  
  // Get or initialize driver
  const driver = await seleniumManager.getDriver()
  helpers = new WebDriverHelpers(driver)
  
  // Store helpers in the world for step definitions to access
  this.helpers = helpers
  this.driver = driver
  
  // Navigate to base URL to start fresh with better error handling
  try {
    await helpers.navigateTo('/')
    console.log('✅ Navigated to base URL')
  } catch (error) {
    console.log(`⚠️ Navigation failed, retrying: ${error.message}`)
    await helpers.sleep(2000)
    await helpers.navigateTo('/')
    console.log('✅ Navigated to base URL (retry)')
  }
})

// Cleanup after each scenario
After({timeout: 60000}, async function(scenario) {
  if (scenario.result?.status === Status.FAILED) {
    console.log(`❌ Scenario failed: ${scenario.pickle.name}`)
    
    // Take screenshot on failure with error handling
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `failed-${scenario.pickle.name.replace(/\s+/g, '-')}-${timestamp}`
      await helpers.takeScreenshot(filename)
      console.log(`📸 Screenshot saved: ${filename}`)
    } catch (screenshotError) {
      console.log(`⚠️ Could not take screenshot: ${screenshotError.message}`)
    }
  } else {
    console.log(`✅ Scenario passed: ${scenario.pickle.name}`)
  }
  
  // Clear browser state but keep driver alive for next scenario
  if (this.driver) {
    try {
      // Set very short timeout for cleanup operations to prevent hanging
      await Promise.race([
        this.driver.manage().setTimeouts({ implicit: 2000, script: 2000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout setting timeouts')), 3000))
      ]);
      
      // Clear cookies and localStorage with aggressive timeout protection
      const clearOperations = [
        this.driver.manage().deleteAllCookies().catch(e => console.log('Cookie clear failed:', e.message)),
        this.driver.executeScript('try { if (window.localStorage) window.localStorage.clear(); } catch(e) { console.log("localStorage clear failed:", e.message); }').catch(e => console.log('localStorage clear failed:', e.message)),
        this.driver.executeScript('try { if (window.sessionStorage) window.sessionStorage.clear(); } catch(e) { console.log("sessionStorage clear failed:", e.message); }').catch(e => console.log('sessionStorage clear failed:', e.message))
      ];
      
      // Run all cleanup operations in parallel with 5-second total timeout
      await Promise.race([
        Promise.all(clearOperations),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup operations timed out')), 5000))
      ]);
      
      console.log('✅ Browser state cleared successfully');
    } catch (error) {
      console.log(`⚠️ Browser cleanup timed out or failed: ${error.message}, continuing...`);
    } finally {
      // Reset timeouts with timeout protection
      try {
        await Promise.race([
          this.driver.manage().setTimeouts({ implicit: 10000, script: 30000 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout reset timed out')), 3000))
        ]);
      } catch (resetError) {
        console.log(`⚠️ Could not reset timeouts: ${resetError.message}, continuing anyway...`);
      }
    }
  }
})

// Global cleanup - runs once after all scenarios
AfterAll({timeout: 30000}, async function() {
  console.log('🧹 Cleaning up Selenium test environment...')
  
  // Quit WebDriver with timeout protection
  try {
    await Promise.race([
      seleniumManager.quitDriver(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Driver quit timed out')), 15000))
    ]);
    console.log('✅ WebDriver quit successfully')
  } catch (error) {
    console.log(`⚠️ WebDriver quit failed: ${error.message}`)
  }
}) 