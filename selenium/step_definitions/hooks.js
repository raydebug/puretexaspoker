const { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } = require('@cucumber/cucumber')
setDefaultTimeout(180 * 1000);
const axios = require('axios')
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')
const { cleanupBrowserPool } = require('./shared-test-utilities')

const execAsync = promisify(exec)

// Helper function to clean up old screenshots
async function cleanupScreenshots() {
  try {
    console.log('🧹 Screenshots cleanup...')

    const screenshotDir = path.join(__dirname, '..', 'screenshots')

    // Remove all files in screenshots directory but keep the directory structure
    const cleanupCommands = [
      `find "${screenshotDir}" -name "*.png" -type f -delete 2>/dev/null || true`,
      `rm -rf "${screenshotDir}/failure_"*.png 2>/dev/null || true`
    ]

    for (const command of cleanupCommands) {
      try {
        await execAsync(command)
      } catch (error) {
        // Ignore cleanup errors - directory might not exist yet
      }
    }

    console.log('✅ Screenshots ✓')

  } catch (error) {
    console.log(`⚠️ Screenshot cleanup failed (continuing anyway): ${error.message}`)
  }
}

// Kill all Chrome instances using single command
async function killAllChromeInstances() {
  try {
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥 Chrome cleanup...')
    await execAsync("ps aux | grep '[C]hrome' | awk '{print $2}' | xargs kill -9 2>/dev/null || true")
    console.log('✅ Chrome ✓')

    // 5 second countdown after killing Chrome
    for (let i = 5; i >= 1; i--) {
      console.log(`⏳ Waiting ${i} seconds for cleanup to complete...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    console.log('✅ Cleanup wait complete')
  } catch (error) {
    console.log(`⚠️ Chrome cleanup encountered issues: ${error.message}`)
  }
}

// Enhanced server health check with retries
async function checkServersRunning() {
  console.log('🔍 Server check...')

  const checks = [
    {
      name: 'Frontend Server',
      url: 'http://localhost:3000',
      timeout: 180000,
      required: true
    },
    {
      name: 'Backend API',
      url: 'http://localhost:3001/api/tables',
      timeout: 180000,
      required: true
    },
    {
      name: 'Game Page',
      url: 'http://localhost:3000/game?table=1',
      timeout: 180000,
      required: true
    }
  ]

  for (const check of checks) {
    let retries = 3
    let success = false

    console.log(`📡 Checking ${check.name} at ${check.url} using curl...`)

    while (retries > 0 && !success) {
      try {
        await execAsync(`curl -s -f "${check.url}" --connect-timeout 10 --max-time 30`)
        console.log(`✅ ${check.name} OK`)
        success = true
      } catch (error) {
        retries--
        console.log(`⚠️ ${check.name} check failed (${3 - retries}/3): ${error.message}`)

        if (retries > 0) {
          console.log(`   Retrying in 5 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 5000))
        } else {
          console.log(`❌ ${check.name} failed all retries.`)
          throw new Error(`${check.name} is not accessible after 3 attempts - ${error.message}`)
        }
      }
    }
  }

  console.log('🎯 All servers ready!')
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
BeforeAll({ timeout: 180000 }, async function () {
  console.log('🚀 Setup...')

  try {
    // Step 1: FORCE KILL ALL EXISTING BROWSER INSTANCES (FIRST THING)
    await killAllChromeInstances()

    // Step 2: Clean up old screenshots
    await cleanupScreenshots()

    // Step 3: Prepare test environment
    await prepareTestEnvironment()

    // Step 2.5: Start mock backend if MOCK_BACKEND=true

    // Step 2: Wait for environment to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Step 3: Verify servers are running (mandatory for real backend)
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
Before({ timeout: 90000 }, async function () {
  console.log('🔧 Scenario setup...')

  // Skip single-browser setup for multi-browser tests
  if (process.env.MULTI_BROWSER_TEST !== 'true') {
    // Always kill Chrome instances for clean browser state (single-browser only)
    await killAllChromeInstances()
    console.log('✅ Single-browser scenario setup - no additional setup needed')
  } else {
    console.log('🔥 Multi-browser test - preserving persistent browser pool')
    // DO NOT kill Chrome instances when using persistent browser pool
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
After({ timeout: 60000 }, async function (scenario) {
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

    // PERSISTENT POOL: Don't cleanup browser pool after each scenario
    // Browser pool should persist for entire test session
    console.log('🏊‍♂️ Keeping browser pool persistent for performance')

    // PERSISTENT POOL: Skip aggressive Chrome cleanup to preserve browser instances
    console.log('🏊‍♂️ Preserving Chrome instances for persistent browser pool')

    // Additional cleanup for failed scenarios
    // PERSISTENT POOL: Avoid killing chromedriver on failure to keep pool alive
    console.log('💥 Scenario failed - performing scenario-level cleanup (preserving chromedriver for pool)...')
  }

  // Memory cleanup
  if (global.gc) {
    global.gc()
  }

  console.log('✅ Enhanced scenario cleanup completed')
})

// Global cleanup - runs once after all scenarios
AfterAll({ timeout: 60000 }, async function () {
  console.log('🏁 Starting final enhanced cleanup...')

  try {
    // Stop mock backend server if it was started


    // DELAY BROWSER CLEANUP: Wait a moment for test completion before cleanup
    console.log('⏳ Waiting 2 seconds for test completion before browser cleanup...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // FINAL CLEANUP: Now we properly cleanup browser pool at test suite end
    try {
      await cleanupBrowserPool()
      console.log('✅ Browser pool cleaned up at test suite end')
    } catch (error) {
      console.log(`⚠️ Browser pool cleanup failed: ${error.message}`)
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