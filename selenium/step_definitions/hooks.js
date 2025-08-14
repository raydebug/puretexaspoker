const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber')
const axios = require('axios')
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')

const execAsync = promisify(exec)

// Helper function to clean up old screenshots
async function cleanupScreenshots() {
  try {
    console.log('🧹 Screenshots cleanup...')
    
    const screenshotDir = path.join(__dirname, '..', 'screenshots')
    
    // Remove all files in screenshots directory but keep the directory structure
    const cleanupCommands = [
      `find "${screenshotDir}" -name "*.png" -type f -delete 2>/dev/null || true`,
      `rm -rf "${screenshotDir}/fresh-test/"*.png 2>/dev/null || true`,
      `rm -rf "${screenshotDir}/failure_"*.png 2>/dev/null || true`
    ]
    
    for (const command of cleanupCommands) {
      try {
        await execAsync(command)
      } catch (error) {
        // Ignore cleanup errors - directory might not exist yet
      }
    }
    
    // Ensure fresh-test directory exists
    const freshTestDir = path.join(screenshotDir, 'fresh-test')
    if (!fs.existsSync(freshTestDir)) {
      fs.mkdirSync(freshTestDir, { recursive: true })
    }
    
    console.log('✅ Screenshots ✓')
    
  } catch (error) {
    console.log(`⚠️ Screenshot cleanup failed (continuing anyway): ${error.message}`)
  }
}

// Enhanced helper function to kill all Chrome instances with multiple approaches
async function killAllChromeInstances() {
  try {
    console.log('🔥 Chrome cleanup...')
    
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
    
    console.log('✅ Chrome ✓')
    
    // Wait for cleanup to fully complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
  } catch (error) {
    console.log(`⚠️ Chrome cleanup encountered issues: ${error.message}`)
  }
}

// Enhanced server health check with retries
async function checkServersRunning() {
  console.log('🔍 Server check...')
  
  const checks = [
    {
      name: 'Backend API',
      url: 'http://localhost:3001/api/tables',
      timeout: 8000,
      required: true
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
        console.log(`✅ ${check.name} OK`)
        success = true
      } catch (error) {
        retries--
        console.log(`⚠️ ${check.name} check failed (${3 - retries}/3): `)
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000))
        } else {
          throw new Error(`${check.name} is not accessible after 3 attempts`)
        }
      }
    }
  }
  
  console.log('🎯 Backend API ready!')
}

// Enhanced environment preparation
async function prepareTestEnvironment() {
  console.log('🛠️ Test env...')
  
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
    
    console.log('✅ Env ready')
    
  } catch (error) {
    console.log(`⚠️ Environment preparation had issues: ${error.message}`)
  }
}

// Global setup - runs once before all scenarios
BeforeAll({timeout: 120000}, async function() {
  console.log('🚀 Setup...')
  
  try {
    // Step 1: Clean up old screenshots
    await cleanupScreenshots()
    
    // Step 2: Comprehensive browser cleanup
    await killAllChromeInstances()
    await prepareTestEnvironment()
    
    // Step 2: Wait for environment to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000))
    
         // Step 3: Verify servers are running (mandatory)
     try {
       await checkServersRunning()
     } catch (error) {
       console.log(`❌ Server check failed: ${error.message}`)
       throw new Error(`Cannot run tests - backend server required: ${error.message}`)
     }
    
    // Step 4: Test environment ready
    if (process.env.MULTI_BROWSER_TEST !== 'true') {
      console.log('✅ Single-browser mode ready')
    } else {
      console.log('🔥 Multi-browser test mode enabled - skipping single-browser setup')
    }
    
    console.log('🎉 Setup complete!')
    
  } catch (error) {
    console.error('💥 Critical setup failure:', error.message)
    throw error
  }
})

// Setup before each scenario with enhanced cleanup
Before({timeout: 90000}, async function() {
  console.log('🔧 Scenario setup...')
  
  // Always kill Chrome instances for clean browser state
  await killAllChromeInstances()
  
  // Skip single-browser setup for multi-browser tests
  if (process.env.MULTI_BROWSER_TEST !== 'true') {
    console.log('✅ Single-browser scenario setup - no additional setup needed')
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
      console.log(`❌ Server check failed: ${error.message}`)
      throw new Error(`Cannot proceed with 5-player test - servers not ready: ${error.message}`)
    }
    
    // Set memory optimization for multi-browser tests
    if (global.gc) {
      global.gc()
    }
    
    console.log('💪 5-player ready!')
  }
})

// Enhanced cleanup after each scenario with screenshot capture
After({timeout: 60000}, async function(scenario) {
  console.log('🧹 Starting enhanced scenario cleanup...')
  
  const scenarioStatus = scenario.result.status
  console.log(`📊 Scenario "${scenario.pickle.name}" status: ${scenarioStatus}`)
  
  // Capture screenshot on failure
  if (scenarioStatus === Status.FAILED) {
    console.log('📸 Scenario failed - capturing screenshots...')
    
    try {
      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.join(__dirname, '../screenshots')
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true })
      }
      
      // Capture screenshot for each player browser if available
      if (global.players && typeof global.players === 'object') {
        for (const [playerName, player] of Object.entries(global.players)) {
          if (player && player.driver) {
            try {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
              const screenshotPath = path.join(screenshotsDir, `failure_${scenario.pickle.name}_${playerName}_${timestamp}.png`)
              await player.driver.takeScreenshot().then(data => {
                fs.writeFileSync(screenshotPath, data, 'base64')
                console.log(`📸 Screenshot saved for ${playerName}: ${screenshotPath}`)
              })
            } catch (screenshotError) {
              console.log(`⚠️ Failed to capture screenshot for ${playerName}: ${screenshotError.message}`)
            }
          }
        }
      }
      
      // Single browser screenshots not available in this setup
      console.log('ℹ️ Single browser screenshot capture not configured')
      
    } catch (error) {
      console.log(`⚠️ Screenshot capture failed: ${error.message}`)
    }
  }
  
  // Skip single-browser cleanup for multi-browser tests
  if (process.env.MULTI_BROWSER_TEST !== 'true') {
    console.log('✅ Single-browser cleanup - no additional cleanup needed')
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
    
    console.log('🎉 Cleanup complete!')
    
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