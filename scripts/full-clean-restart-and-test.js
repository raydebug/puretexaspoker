#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const http = require('http');
const path = require('path');

function log(msg) { console.log(`[FULL-RESTART] ${msg}`); }

async function killProcesses() {
  log('Killing all processes on ports 3000/3001, Vite, Chrome, Node, ts-node...');
  const myPid = process.pid;
  try {
    execSync('lsof -ti:3000 | xargs kill -9 || true');
    execSync('lsof -ti:3001 | xargs kill -9 || true');
    execSync("ps aux | grep vite | grep -v grep | awk '{print $2}' | xargs kill -9 || true");
    execSync("ps aux | grep chrome | grep -v grep | awk '{print $2}' | xargs kill -9 || true");
    // Exclude this script's own PID from node and ts-node kills
    execSync(`ps aux | grep node | grep -v grep | awk '{print $2}' | grep -v '^${myPid}$' | xargs kill -9 || true`);
    execSync(`ps aux | grep ts-node | grep -v grep | awk '{print $2}' | grep -v '^${myPid}$' | xargs kill -9 || true`);
  } catch (e) {
    log('Some processes may not have been found.');
  }
}

function portInUse(port) {
  try {
    execSync(`lsof -i :${port}`);
    return true;
  } catch {
    return false;
  }
}

async function waitForPortsFree() {
  log('Waiting for ports 3000 and 3001 to be free...');
  for (let i = 0; i < 20; i++) {
    if (!portInUse(3000) && !portInUse(3001)) return;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Ports 3000/3001 are still in use after waiting.');
}

async function waitForServer(url, name) {
  log(`Waiting for ${name} at ${url}...`);
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, res => {
          if (res.statusCode === 200) resolve();
          else reject();
        });
        req.on('error', reject);
        req.setTimeout(2000, () => req.destroy());
      });
      log(`${name} is ready!`);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`${name} did not become ready in time.`);
}

async function startServers() {
  log('Starting backend and frontend servers...');
  const proc = spawn('node', ['scripts/start-servers.js'], { stdio: 'inherit' });
  // Wait for servers to be ready
  await waitForServer('http://localhost:3000', 'Frontend');
  await waitForServer('http://localhost:3001/api/tables', 'Backend');
  return proc;
}

async function runTest() {
  log('Running 5-player test with screenshots...');
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['scripts/run-5-player-test.js'], { stdio: 'inherit' });
    proc.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`Test exited with code ${code}`));
    });
  });
}

(async () => {
  try {
    await killProcesses();
    await waitForPortsFree();
    const serverProc = await startServers();
    await runTest();
    log('✅ All done!');
    process.exit(0);
  } catch (e) {
    log(`❌ ERROR: ${e.message}`);
    process.exit(1);
  }
})(); 