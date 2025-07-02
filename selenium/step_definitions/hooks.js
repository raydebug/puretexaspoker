const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber')
const { seleniumManager } = require('../config/selenium.config.js')
const { WebDriverHelpers } = require('../utils/webdriverHelpers.js')
const axios = require('axios')

let helpers

// Helper function to check if servers are running
async function checkServersRunning() {
  const maxAttempts = 10
  const delay = 2000
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔍 Checking servers (attempt ${attempt}/${maxAttempts})...`)
      
      // Check backend
      const backendResponse = await axios.get('http://localhost:3001/api/lobby-tables', { timeout: 3000 })
      console.log(`✅ Backend server is running (${backendResponse.status})`)
      
      // Check frontend
      const frontendResponse = await axios.get('http://localhost:3000', { timeout: 3000 })
      console.log(`✅ Frontend server is running (${frontendResponse.status})`)
      
      return true
    } catch (error) {
      console.log(`⚠️ Servers not ready yet (attempt ${attempt}): ${error.message}`)
      if (attempt < maxAttempts) {
        console.log(`⏳ Waiting ${delay/1000}s before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw new Error('❌ Servers are not running after 10 attempts. Please start both frontend (npm start in frontend/) and backend (npm start in backend/) servers.')
}

// Global setup - runs once before all scenarios
BeforeAll({timeout: 60000}, async function() {
  console.log('🚀 Setting up Selenium test environment...')
  
  try {
    // First check if servers are running
    await checkServersRunning()
    console.log('✅ Both servers are confirmed to be running')
    
    // Skip WebDriver initialization for multi-browser scenarios
    // Multi-browser tests (like 5-player) manage their own drivers
    if (process.env.MULTI_BROWSER_TEST !== 'true') {
      // Initialize WebDriver with improved timeout handling
      console.log('🔧 Initializing WebDriver...')
      const driver = await Promise.race([
        seleniumManager.getDriver(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('WebDriver initialization timed out after 45 seconds')), 45000)
        )
      ]);
      console.log(`✅ WebDriver initialized successfully with browser: ${seleniumManager.getConfig().browser}`)
    } else {
      console.log('🔧 Skipping global WebDriver initialization for multi-browser test')
    }
  } catch (error) {
    console.error('❌ Failed to initialize Selenium environment:', error.message)
    throw error
  }
})

// Setup before each scenario
Before({timeout: 60000}, async function() {
  console.log('🔧 Setting up scenario...')
  
  // Skip single-browser setup for multi-browser tests
  if (process.env.MULTI_BROWSER_TEST !== 'true') {
    // Get or initialize driver with timeout protection
    const driver = await Promise.race([
      seleniumManager.getDriver(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Driver retrieval timed out')), 15000))
    ]);
    
    helpers = new WebDriverHelpers(driver)
    
    // Store helpers in the world for step definitions to access
    this.helpers = helpers
    this.driver = driver
    
    // Only navigate if needed (check current URL first to avoid unnecessary navigation)
    try {
      const currentUrl = await driver.getCurrentUrl();
      if (!currentUrl.includes('localhost:3000')) {
        await helpers.navigateTo('/')
        console.log('✅ Navigated to base URL')
      } else {
        console.log('✅ Already on base URL')
      }
    } catch (error) {
      console.log(`⚠️ Navigation failed, retrying: ${error.message}`)
      await helpers.sleep(2000)
      try {
        await helpers.navigateTo('/')
        console.log('✅ Navigated to base URL (retry)')
      } catch (retryError) {
        console.log(`❌ Navigation retry failed: ${retryError.message}`)
        throw retryError
      }
    }
  } else {
    console.log('🔧 Skipping single-browser setup for multi-browser test')
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
  if (this.driver && process.env.MULTI_BROWSER_TEST !== 'true') {
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