#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting poker game servers in parallel...');

// Start backend server
const backendDir = path.join(__dirname, '..', 'backend');
const backend = spawn('npm', ['start'], {
  cwd: backendDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// Start frontend server
const frontendDir = path.join(__dirname, '..', 'frontend');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

console.log('✅ Backend server starting on http://localhost:3001');
console.log('✅ Frontend server starting on http://localhost:3000');
console.log('');
console.log('Press Ctrl+C to stop both servers');

// Handle backend output
backend.stdout.on('data', (data) => {
  process.stdout.write(`[BACKEND] ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[BACKEND-ERR] ${data}`);
});

// Handle frontend output
frontend.stdout.on('data', (data) => {
  process.stdout.write(`[FRONTEND] ${data}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`[FRONTEND-ERR] ${data}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(0);
});

// Handle server exits
backend.on('close', (code) => {
  console.log(`[BACKEND] Server exited with code ${code}`);
  if (code !== 0) {
    console.log('[BACKEND] Server crashed, restarting...');
    // Restart backend if it crashes
    setTimeout(() => {
      const newBackend = spawn('npm', ['start'], {
        cwd: backendDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });
      newBackend.stdout.on('data', (data) => {
        process.stdout.write(`[BACKEND] ${data}`);
      });
      newBackend.stderr.on('data', (data) => {
        process.stderr.write(`[BACKEND-ERR] ${data}`);
      });
    }, 2000);
  }
});

frontend.on('close', (code) => {
  console.log(`[FRONTEND] Server exited with code ${code}`);
  if (code !== 0) {
    console.log('[FRONTEND] Server crashed, restarting...');
    // Restart frontend if it crashes
    setTimeout(() => {
      const newFrontend = spawn('npm', ['run', 'dev'], {
        cwd: frontendDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });
      newFrontend.stdout.on('data', (data) => {
        process.stdout.write(`[FRONTEND] ${data}`);
      });
      newFrontend.stderr.on('data', (data) => {
        process.stderr.write(`[FRONTEND-ERR] ${data}`);
      });
    }, 2000);
  }
});

// Handle errors
backend.on('error', (error) => {
  console.error('[BACKEND] Error:', error);
});

frontend.on('error', (error) => {
  console.error('[FRONTEND] Error:', error);
}); 