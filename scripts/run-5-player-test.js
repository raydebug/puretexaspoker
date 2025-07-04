#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🎮 5-Player Poker Game Test Runner');
console.log('===================================\n');

// Configuration
const TEST_CONFIG = {
  featureFile: 'selenium/features/5-player-complete-game-scenario.feature',
  cucumberConfig: 'selenium/cucumber.config.js',
  screenshotsDir: 'selenium/screenshots',
  reportsDir: 'selenium/reports',
  timeout: 300000, // 5 minutes
  retries: 3
};

// Environment setup
const ENV = {
  ...process.env,
  MULTI_BROWSER_TEST: 'true',
  SELENIUM_TEST: 'true',
  HEADLESS: process.env.HEADLESS || 'true',
  SCREENSHOT_MODE: 'true',
  NODE_OPTIONS: '--max-old-space-size=4096'
};

async function ensureDirectories() {
  console.log('📁 Ensuring test directories exist...');
  
  const dirs = [
    TEST_CONFIG.screenshotsDir,
    TEST_CONFIG.reportsDir
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  }
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Clean up screenshots older than 1 hour
    const screenshotsDir = TEST_CONFIG.screenshotsDir;
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(screenshotsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up old screenshot: ${file}`);
        }
      }
    }
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.log(`⚠️ Test data cleanup warning: ${error.message}`);
  }
}

async function startServers() {
  console.log('🚀 Starting servers...');
  
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('node', ['scripts/start-servers.js'], {
      stdio: 'pipe',
      env: ENV
    });
    
    let serversReady = false;
    const timeout = setTimeout(() => {
      if (!serversReady) {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`[SERVERS] ${output}`);
      
      // Check for server readiness indicators
      if (output.includes('Server is running on port 3001') && 
          output.includes('Local:   http://localhost:3000/')) {
        serversReady = true;
        clearTimeout(timeout);
        console.log('✅ Servers are ready!');
        resolve(serverProcess);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(`[SERVERS ERROR] ${data}`);
    });
    
    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    serverProcess.on('close', (code) => {
      if (!serversReady) {
        clearTimeout(timeout);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
  });
}

async function runTest() {
  console.log('🧪 Running 5-player test...');
  
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npx', ['cucumber-js', 
      '--config', TEST_CONFIG.cucumberConfig,
      TEST_CONFIG.featureFile
    ], {
      stdio: 'inherit',
      env: ENV,
      cwd: process.cwd()
    });
    
    const timeout = setTimeout(() => {
      testProcess.kill();
      reject(new Error('Test execution timeout'));
    }, TEST_CONFIG.timeout);
    
    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });
    
    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function generateReport() {
  console.log('📊 Generating test report...');
  
  try {
    const reportPath = path.join(TEST_CONFIG.reportsDir, 'test-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      testName: '5-Player Complete Game Scenario',
      status: 'completed',
      screenshots: [],
      summary: {
        totalSteps: 0,
        passedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0
      }
    };
    
    // Count screenshots
    if (fs.existsSync(TEST_CONFIG.screenshotsDir)) {
      const screenshots = fs.readdirSync(TEST_CONFIG.screenshotsDir);
      report.screenshots = screenshots.map(file => ({
        filename: file,
        path: path.join(TEST_CONFIG.screenshotsDir, file)
      }));
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Test report generated: ${reportPath}`);
    
  } catch (error) {
    console.log(`⚠️ Report generation warning: ${error.message}`);
  }
}

async function main() {
  let serverProcess = null;
  
  try {
    // Step 1: Setup
    await ensureDirectories();
    await cleanupTestData();
    
    // Step 2: Start servers
    serverProcess = await startServers();
    
    // Step 3: Wait for servers to be fully ready
    console.log('⏳ Waiting for servers to be fully ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Run test
    await runTest();
    
    // Step 5: Generate report
    await generateReport();
    
    console.log('\n🎉 5-Player test completed successfully!');
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
    
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('🛑 Stopping servers...');
      serverProcess.kill();
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  main();
}

module.exports = { main, TEST_CONFIG }; 