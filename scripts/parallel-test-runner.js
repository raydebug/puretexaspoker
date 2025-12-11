#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Parallel Test Runner - Starting servers and 5-player test');
console.log('===========================================================\n');

let backendProcess = null;
let frontendProcess = null;
let testProcess = null;

// Function to check if server is ready
function checkServerReady(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${name} is ready at ${url}`);
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Function to wait for both servers to be ready
async function waitForServers() {
  console.log('⏳ Waiting for servers to be ready...');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    const backendReady = await checkServerReady('http://localhost:3001/api/tables', 'Backend');
    const frontendReady = await checkServerReady('http://localhost:3000', 'Frontend');
    
    if (backendReady && frontendReady) {
      console.log('🎉 Both servers are ready! Starting 5-player test...\n');
      return true;
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('❌ Servers failed to start within timeout');
  return false;
}

// Start backend server
function startBackend() {
  console.log('🚀 Starting Backend Server...');
  backendProcess = spawn('npm', ['start'], {
    cwd: './backend',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server is running on port 3001')) {
      console.log('✅ Backend server started successfully');
    }
  });
  
  backendProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('deprecated')) {
      console.log(`[BACKEND-ERR] ${output.trim()}`);
    }
  });
}

// Start frontend server
function startFrontend() {
  console.log('🚀 Starting Frontend Server...');
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: './frontend',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  frontendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Local:   http://localhost:3000/')) {
      console.log('✅ Frontend server started successfully');
    }
  });
  
  frontendProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('deprecated')) {
      console.log(`[FRONTEND-ERR] ${output.trim()}`);
    }
  });
}

// Run the 5-player test
function runTest() {
  console.log('🧪 Running 5-player game test...');
  testProcess = spawn('npx', [
    'cucumber-js',
    'selenium/features/5-player-complete-game-scenario.feature',
    '--require', 'selenium/step_definitions/5-player-complete-game-steps.js',
    '--format', 'summary'
  ], {
    stdio: 'inherit',
    env: { ...process.env, MULTI_BROWSER_TEST: 'true' }
  });
  
  testProcess.on('close', (code) => {
    console.log(`\n🧪 Test completed with exit code: ${code}`);
    cleanup();
  });
}

// Cleanup function
function cleanup() {
  console.log('\n🧹 Cleaning up processes...');
  
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
  }
  
  if (testProcess) {
    testProcess.kill('SIGTERM');
  }
  
  console.log('✅ Cleanup completed');
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main execution
async function main() {
  try {
    // Start both servers in parallel
    startBackend();
    startFrontend();
    
    // Wait for servers to be ready
    const serversReady = await waitForServers();
    
    if (serversReady) {
      // Run the test
      runTest();
    } else {
      console.log('❌ Failed to start servers, exiting...');
      cleanup();
    }
  } catch (error) {
    console.error('❌ Error in main execution:', error);
    cleanup();
  }
}

// Start the main execution
main(); 