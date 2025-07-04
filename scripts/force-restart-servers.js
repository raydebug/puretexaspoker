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

async function killProcessesOnPorts() {
  log('🔫 Killing all processes on ports 3000 and 3001...', 'cyan');
  
  try {
    // Kill processes on port 3000 (frontend)
    await new Promise((resolve, reject) => {
      exec('lsof -ti:3000 | xargs kill -9', (error) => {
        if (error && !error.message.includes('No such process')) {
          log('⚠️ No processes found on port 3000', 'yellow');
        } else {
          log('✅ Killed processes on port 3000', 'green');
        }
        resolve();
      });
    });

    // Kill processes on port 3001 (backend)
    await new Promise((resolve, reject) => {
      exec('lsof -ti:3001 | xargs kill -9', (error) => {
        if (error && !error.message.includes('No such process')) {
          log('⚠️ No processes found on port 3001', 'yellow');
        } else {
          log('✅ Killed processes on port 3001', 'green');
        }
        resolve();
      });
    });

    // Kill all Chrome processes
    await new Promise((resolve, reject) => {
      exec('pkill -f chrome', (error) => {
        if (error && !error.message.includes('No matching processes')) {
          log('⚠️ No Chrome processes found', 'yellow');
        } else {
          log('✅ Killed Chrome processes', 'green');
        }
        resolve();
      });
    });

    // Kill all Vite processes
    await new Promise((resolve, reject) => {
      exec('pkill -f vite', (error) => {
        if (error && !error.message.includes('No matching processes')) {
          log('⚠️ No Vite processes found', 'yellow');
        } else {
          log('✅ Killed Vite processes', 'green');
        }
        resolve();
      });
    });

    // Wait for ports to be free
    log('⏳ Waiting for ports to be free...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    log('⚠️ Error killing processes:', error.message, 'yellow');
  }
}

async function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(false); // Port is in use
    });
    
    req.on('error', () => {
      resolve(true); // Port is available
    });
    
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(true); // Port is available
    });
  });
}

async function startServers() {
  log('🚀 Starting servers...', 'cyan');
  
  // Start backend server
  const backendProcess = spawn('npm', ['start'], {
    cwd: './backend',
    stdio: 'pipe',
    shell: true
  });

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server is running on port 3001')) {
      log('✅ Backend server started successfully', 'green');
    }
    process.stdout.write(`[BACKEND] ${output}`);
  });

  backendProcess.stderr.on('data', (data) => {
    process.stderr.write(`[BACKEND ERROR] ${data}`);
  });

  // Start frontend server
  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: './frontend',
    stdio: 'pipe',
    shell: true
  });

  frontendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Local:   http://localhost:3000/')) {
      log('✅ Frontend server started successfully', 'green');
    }
    process.stdout.write(`[FRONTEND] ${output}`);
  });

  frontendProcess.stderr.on('data', (data) => {
    process.stderr.write(`[FRONTEND ERROR] ${data}`);
  });

  // Wait for both servers to be ready
  log('⏳ Waiting for servers to be ready...', 'cyan');
  
  let backendReady = false;
  let frontendReady = false;
  
  const checkServers = async () => {
    if (!backendReady) {
      backendReady = await checkPortAvailable(3001);
    }
    if (!frontendReady) {
      frontendReady = await checkPortAvailable(3000);
    }
    
    if (backendReady && frontendReady) {
      log('🎉 Both servers are ready!', 'green');
      log('✅ Backend: http://localhost:3001', 'green');
      log('✅ Frontend: http://localhost:3000', 'green');
      return;
    }
    
    setTimeout(checkServers, 1000);
  };
  
  checkServers();

  // Handle process cleanup
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down servers...', 'yellow');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });

  return { backendProcess, frontendProcess };
}

async function main() {
  try {
    await killProcessesOnPorts();
    await startServers();
  } catch (error) {
    log('❌ Error in force restart:', error.message, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main }; 