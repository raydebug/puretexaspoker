#!/usr/bin/env node

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

async function simpleScreenshotTest() {
  console.log('🚀 Starting simple screenshot test...');
  
  // Create browser with minimal options
  const options = new chrome.Options();
  options.addArguments('--no-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  try {
    console.log('🌐 Navigating to game...');
    await driver.get('http://localhost:3000/game?table=1');
    
    // Wait for page to load
    await driver.sleep(5000);
    
    console.log('📸 Taking screenshot...');
    const screenshot = await driver.takeScreenshot();
    
    // Save screenshot
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotDir, 'simple_test_screenshot.png');
    fs.writeFileSync(screenshotPath, screenshot, 'base64');
    
    console.log(`✅ Screenshot saved: ${screenshotPath}`);
    
    // Get page content to check what's loaded
    const pageContent = await driver.executeScript('return document.body.innerHTML');
    console.log(`📊 Page content length: ${pageContent.length} characters`);
    
    if (pageContent.length < 1000) {
      console.log('⚠️ Page content sample:', pageContent.substring(0, 500));
    }
    
  } finally {
    await driver.quit();
    console.log('✅ Browser closed');
  }
}

simpleScreenshotTest().catch(console.error);