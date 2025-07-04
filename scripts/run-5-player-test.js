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

async function ensureDirs() {
  [TEST_CONFIG.screenshotsDir, TEST_CONFIG.reportsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

async function cleanupScreenshots() {
  if (fs.existsSync(TEST_CONFIG.screenshotsDir)) {
    fs.readdirSync(TEST_CONFIG.screenshotsDir).forEach(f => {
      if (f !== '.gitkeep') fs.rmSync(path.join(TEST_CONFIG.screenshotsDir, f), { force: true });
    });
  }
}

async function runCucumber() {
  return new Promise((resolve, reject) => {
    const args = [
      'cucumber-js',
      TEST_CONFIG.featureFile,
      '--require', 'selenium/step_definitions/all-steps.js',
      '--require', 'selenium/step_definitions/hooks.js',
      '--format', 'json:selenium/reports/cucumber-report.json',
      '--format', 'progress',
      '--config', TEST_CONFIG.cucumberConfig,
      '--retry', TEST_CONFIG.retries,
      '--fail-fast',
      '--exit'
    ];
    const proc = spawn('npx', args, { stdio: 'inherit', env: ENV });
    proc.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`Cucumber exited with code ${code}`));
    });
  });
}

(async () => {
  try {
    await ensureDirs();
    await cleanupScreenshots();
    await runCucumber();
    console.log('✅ Test completed successfully!');
    process.exit(0);
  } catch (e) {
    console.error(`❌ Test failed: ${e.message}`);
    process.exit(1);
  }
})(); 