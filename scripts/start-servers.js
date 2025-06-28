#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting poker game servers...');

// Start backend server
const backendDir = path.join(__dirname, '..', 'backend');
const backend = spawn('npm', ['start'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

// Start frontend server
const frontendDir = path.join(__dirname, '..', 'frontend');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
});

console.log('✅ Backend server starting on http://localhost:3001');
console.log('✅ Frontend server starting on http://localhost:3000');
console.log('');
console.log('Press Ctrl+C to stop both servers');

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

backend.on('close', (code) => {
  console.log(`Backend server exited with code ${code}`);
});

frontend.on('close', (code) => {
  console.log(`Frontend server exited with code ${code}`);
}); 