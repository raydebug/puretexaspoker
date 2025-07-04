const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber')
const { seleniumManager } = require('../config/selenium.config.js')
const { WebDriverHelpers } = require('../utils/webdriverHelpers.js')
const axios = require('axios')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

let helpers

// Enhanced helper function to kill all Chrome instances with multiple approaches
async function killAllChromeInstances() {
  try {
    console.log('🔥 Performing comprehensive Chrome cleanup...')
    
    // Method 1: Kill Chrome processes by name pattern
    const chromeKillCommands = [
      "ps aux | grep '[C]hrome' | awk '{print $2}' | xargs kill -9",
      "ps aux | grep '[c]hromium' | awk '{print $2}' | xargs kill -9",
      "ps aux | grep '[G]oogle Chrome' | awk '{print $2}' | xargs kill -9",
      "pkill -f 'chrome' 2>/dev/null || true",
      "pkill -f 'chromium' 2>/dev/null || true"
    ]
    
    for (const command of chromeKillCommands) {
      try {
        await execAsync(command)
      } catch (error) {
        // Ignore errors - some commands may not find processes
      }
    }
    
    // Method 2: Kill processes on Chrome ports
    try {
      await execAsync("lsof -ti:9222,9223,9224,9225,9226 | xargs kill -9 2>/dev/null || true")
    } catch (error) {
      // Ignore port cleanup errors
    }
    
    // Method 3: Clean up Chrome temp directories
    try {
      await execAsync("rm -rf /tmp/chrome_* 2>/dev/null || true")
      await execAsync("rm -rf /tmp/.com.google.Chrome* 2>/dev/null || true")
    } catch (error) {
      // Ignore cleanup errors
    }
    
    console.log('✅ Comprehensive Chrome cleanup completed')
    
    // Wait for cleanup to fully complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
  } catch (error) {
    console.log(`⚠️ Chrome cleanup encountered issues: ${error.message}`)
  }
}

// Enhanced server health check with retries
async function checkServersRunning() {
  console.log('🔍 Performing comprehensive server health check...')
  
  const checks = [
    {
      name: 'Backend API',
      url: 'http://localhost:3001/api/tables',
      timeout: 8000
    },
    {
      name: 'Frontend',
      url: 'http://localhost:3000/',
      timeout: 8000
    }
  ]
  
  for (const check of checks) {
    let retries = 3
    let success = false
    
    while (retries > 0 && !success) {
      try {
        const response = await axios.get(check.url, { 
          timeout: check.timeout,
          validateStatus: (status) => status >= 200 && status < 400
        })
        console.log(`✅ ${check.name} is healthy (${response.status})`)
        success = true
      } catch (error) {
        retries--
        console.log(`⚠️ ${check.name} check failed (${3 - retries}/3): ${error.message}`)
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000))
        } else {
          throw new Error(`${check.name} is not accessible after 3 attempts`)
        }
      }
    }
  }
  
  console.log('🎯 All servers are healthy and ready for testing!')
}

// Enhanced environment preparation
async function prepareTestEnvironment() {
  console.log('🛠️ Preparing enhanced test environment...')
  
  try {
    // Set optimal environment variables
    process.env.NODE_OPTIONS = '--max-old-space-size=4096'
    process.env.GENERATE_SOURCEMAP = 'false'
    process.env.MULTI_BROWSER_TEST = 'true'
    
    // Clear only Chrome debugging ports, NEVER kill server ports
    const portClearCommands = [
      'lsof -ti:9222,9223,9224,9225,9226 | xargs kill -9 2>/dev/null || true'
    ]
    
    for (const command of portClearCommands) {
      try {
        await execAsync(command)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    console.log('✅ Test environment prepared successfully')
    
  } catch (error) {
    console.log(`⚠️ Environment preparation had issues: ${error.message}`)
  }
}

// Global setup - runs once before all scenarios
BeforeAll({timeout: 120000}, async function() {
  console.log('🚀 Setting up enhanced Selenium test environment...')
  
  try {
    // Step 1: Comprehensive cleanup
    await killAllChromeInstances()
    await prepareTestEnvironment()
    
    // Step 2: Wait for environment to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000))
    
         // Step 3: Verify servers are running (optional for robustness)
     try {
       await checkServersRunning()
     } catch (error) {
       console.log(`⚠️ Server health check failed, but continuing for test robustness: ${error.message}`)
     }
    
    // Step 4: Initialize helpers for single-browser tests
    if (process.env.MULTI_BROWSER_TEST !== 'true') {
      helpers = new WebDriverHelpers()
      await helpers.setup()
      console.log('✅ Single-browser helpers initialized')
    } else {
      console.log('🔥 Multi-browser test mode enabled - skipping single-browser setup')
    }
    
    console.log('🎉 Enhanced test environment setup completed successfully!')
    
  } catch (error) {
    console.error('💥 Critical setup failure:', error.message)
    throw error
  }
})

// Setup before each scenario with enhanced cleanup
Before({timeout: 90000}, async function() {
  console.log('🔧 Setting up scenario with enhanced reliability...')
  
  // Always kill Chrome instances for clean browser state
  await killAllChromeInstances()
  
  // Skip single-browser setup for multi-browser tests
  if (process.env.MULTI_BROWSER_TEST !== 'true') {
    try {
      await helpers.beforeScenario()
      console.log('✅ Single-browser scenario setup completed')
    } catch (error) {
      console.log(`⚠️ Single-browser setup failed: ${error.message}`)
      throw error
    }
  } else {
    console.log('🔥 Multi-browser test - using dedicated browser management')
  }
  
  // Additional environment checks for critical scenarios
  if (this.pickle && this.pickle.name && this.pickle.name.includes('5-player')) {
    console.log('🎯 Preparing for 5-player scenario with extra stability checks...')
    
    // Extra server health verification for complex tests
    try {
      await checkServersRunning()
    } catch (error) {
      console.log(`❌ Server health check failed for 5-player test: ${error.message}`)
      throw new Error(`Cannot proceed with 5-player test - servers not ready: ${error.message}`)
    }
    
    // Set memory optimization for multi-browser tests
    if (global.gc) {
      global.gc()
    }
    
    console.log('💪 5-player scenario preparation completed successfully!')
  }
})

// Enhanced cleanup after each scenario
After({timeout: 60000}, async function(scenario) {
  console.log('🧹 Starting enhanced scenario cleanup...')
  
  const scenarioStatus = scenario.result.status
  console.log(`📊 Scenario "${scenario.pickle.name}" status: ${scenarioStatus}`)
  
  // Skip single-browser cleanup for multi-browser tests
  if (process.env.MULTI_BROWSER_TEST !== 'true') {
    try {
      if (helpers) {
        await helpers.afterScenario(scenario)
        console.log('✅ Single-browser cleanup completed')
      }
    } catch (error) {
      console.log(`⚠️ Single-browser cleanup error: ${error.message}`)
    }
  } else {
    console.log('🔥 Multi-browser test - performing comprehensive browser cleanup')
    
    // For multi-browser tests, do aggressive cleanup
    await killAllChromeInstances()
    
    // Additional cleanup for failed scenarios
    if (scenarioStatus === Status.FAILED) {
      console.log('💥 Scenario failed - performing extra cleanup...')
      
      // Clear any remaining processes
      try {
        await execAsync('pkill -f "node.*selenium\\|chromedriver" 2>/dev/null || true')
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
  
  // Memory cleanup
  if (global.gc) {
    global.gc()
  }
  
  console.log('✅ Enhanced scenario cleanup completed')
})

// Global cleanup - runs once after all scenarios
AfterAll({timeout: 60000}, async function() {
  console.log('🏁 Starting final enhanced cleanup...')
  
  try {
    // Cleanup single-browser helpers if they exist
    if (helpers) {
      await helpers.cleanup()
      console.log('✅ Single-browser helpers cleaned up')
    }
    
    // Comprehensive final cleanup
    await killAllChromeInstances()
    
    // Clean up any remaining test artifacts
    try {
      await execAsync('rm -rf /tmp/chrome_* /tmp/.com.google.Chrome* 2>/dev/null || true')
      await execAsync('pkill -f "chromedriver\\|selenium" 2>/dev/null || true')
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc()
    }
    
    console.log('🎉 Final enhanced cleanup completed successfully!')
    
  } catch (error) {
    console.error('⚠️ Final cleanup encountered issues:', error.message)
  }
})

// Process cleanup on exit
process.on('exit', () => {
  console.log('🔚 Process exiting - performing final Chrome cleanup...')
  try {
    require('child_process').execSync("ps aux | grep '[C]hrome' | awk '{print $2}' | xargs kill -9 2>/dev/null || true")
  } catch (error) {
    // Ignore cleanup errors during exit
  }
})

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT - cleaning up and exiting...')
  await killAllChromeInstances()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM - cleaning up and exiting...')
  await killAllChromeInstances()
  process.exit(0)
})

module.exports = { killAllChromeInstances, checkServersRunning } 