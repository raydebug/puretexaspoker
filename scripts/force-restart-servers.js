#!/usr/bin/env node

/**
 * Force Restart Servers Script
 * 
 * This script forcefully kills any existing servers on ports 3000 and 3001,
 * then starts fresh instances and verifies they're working correctly.
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');

const FRONTEND_PORT = 3000;
const BACKEND_PORT = 3001;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Kill processes on specific ports
async function killProcessesOnPort(port) {
  return new Promise((resolve) => {
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -ti:${port}`;
    }
    
    exec(command, (error, stdout) => {
      if (error || !stdout.trim()) {
        log(`✅ No processes found on port ${port}`, 'green');
        resolve();
        return;
      }
      
      const pids = stdout.trim().split('\n');
      log(`🔍 Found ${pids.length} process(es) on port ${port}`, 'yellow');
      
      pids.forEach(pid => {
        const killCommand = platform === 'win32' ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
        exec(killCommand, (killError) => {
          if (killError) {
            log(`⚠️ Failed to kill process ${pid}: ${killError.message}`, 'yellow');
          } else {
            log(`✅ Killed process ${pid} on port ${port}`, 'green');
          }
        });
      });
      
      // Wait a bit for processes to be killed
      setTimeout(resolve, 2000);
    });
  });
}

// Check if server is responding
async function checkServer(url, name, timeout = 10000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        log(`✅ ${name} is responding (${res.statusCode})`, 'green');
        resolve(true);
      } else {
        log(`⚠️ ${name} responded with status ${res.statusCode}`, 'yellow');
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      log(`❌ ${name} is not responding: ${err.message}`, 'red');
      resolve(false);
    });
    
    req.setTimeout(timeout, () => {
      req.destroy();
      log(`❌ ${name} timeout after ${timeout}ms`, 'red');
      resolve(false);
    });
  });
}

// Start server
function startServer(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    log(`🚀 Starting ${name}...`, 'blue');
    
    const server = spawn(command, args, {
      cwd: path.resolve(cwd),
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    
    server.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;
      
      // Check for startup indicators
      if (message.includes('ready') || message.includes('running') || message.includes('Local:')) {
        log(`✅ ${name} startup detected`, 'green');
      }
    });
    
    server.stderr.on('data', (data) => {
      const message = data.toString();
      if (!message.includes('deprecated')) { // Ignore deprecation warnings
        log(`⚠️ ${name} stderr: ${message.trim()}`, 'yellow');
      }
    });
    
    server.on('error', (error) => {
      log(`❌ Failed to start ${name}: ${error.message}`, 'red');
      reject(error);
    });
    
    server.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${name} exited normally`, 'green');
      } else {
        log(`⚠️ ${name} exited with code ${code}`, 'yellow');
      }
    });
    
    // Wait for startup
    setTimeout(() => {
      resolve(server);
    }, 5000);
  });
}

// Main execution
async function main() {
  try {
    log('🔄 Force Restart Servers Script', 'cyan');
    log('================================', 'cyan');
    
    // Step 1: Kill existing processes
    log('\n📋 Step 1: Killing existing processes...', 'blue');
    await killProcessesOnPort(FRONTEND_PORT);
    await killProcessesOnPort(BACKEND_PORT);
    
    // Step 2: Start backend server
    log('\n📋 Step 2: Starting backend server...', 'blue');
    const backendServer = await startServer('npm', ['start'], './backend', 'Backend Server');
    
    // Step 3: Start frontend server
    log('\n📋 Step 3: Starting frontend server...', 'blue');
    const frontendServer = await startServer('npm', ['run', 'dev'], './frontend', 'Frontend Server');
    
    // Step 4: Verify servers are working
    log('\n📋 Step 4: Verifying servers are working...', 'blue');
    
    // Wait a bit more for servers to fully start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const backendWorking = await checkServer(`${BACKEND_URL}/api/tables`, 'Backend API');
    const frontendWorking = await checkServer(FRONTEND_URL, 'Frontend Server');
    
    if (backendWorking && frontendWorking) {
      log('\n🎉 SUCCESS: Both servers are working correctly!', 'green');
      log('✅ Backend API is responding', 'green');
      log('✅ Frontend server is responding', 'green');
      log('\n📊 Server Status:', 'cyan');
      log(`   Backend: ${BACKEND_URL}`, 'cyan');
      log(`   Frontend: ${FRONTEND_URL}`, 'cyan');
      log(`   API Test: ${BACKEND_URL}/api/tables`, 'cyan');
      
      // Additional verification - check for specific endpoints
      log('\n🔍 Additional verification...', 'blue');
      
      // Check tables endpoint specifically
      const tablesWorking = await checkServer(`${BACKEND_URL}/api/tables`, 'Tables API');
      if (tablesWorking) {
        log('✅ Tables API is working correctly', 'green');
      } else {
        log('⚠️ Tables API may have issues', 'yellow');
      }
      
      log('\n✅ Server restart and verification complete!', 'green');
      log('🚀 Ready for testing!', 'green');
      
    } else {
      log('\n❌ FAILURE: One or both servers are not working correctly', 'red');
      if (!backendWorking) {
        log('❌ Backend server is not responding', 'red');
      }
      if (!frontendWorking) {
        log('❌ Frontend server is not responding', 'red');
      }
      process.exit(1);
    }
    
    // Keep servers running
    log('\n⏳ Servers will continue running. Press Ctrl+C to stop.', 'yellow');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('\n🛑 Shutting down servers...', 'yellow');
      if (backendServer) backendServer.kill();
      if (frontendServer) frontendServer.kill();
      process.exit(0);
    });
    
  } catch (error) {
    log(`❌ Script failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, killProcessesOnPort, checkServer }; 