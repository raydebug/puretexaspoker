#!/usr/bin/env node

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

async function generateComprehensiveScreenshots() {
  console.log('🚀 Starting comprehensive screenshot generation...');
  
  // Create screenshots directory
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  let screenshotCounter = 1;
  
  async function captureScreenshot(driver, name, description) {
    try {
      console.log(`📸 Capturing: ${name}`);
      const screenshot = await driver.takeScreenshot();
      const filename = `${String(screenshotCounter++).padStart(3, '0')}_${name}.png`;
      const filepath = path.join(screenshotDir, filename);
      fs.writeFileSync(filepath, screenshot, 'base64');
      console.log(`✅ ${filename} - ${description}`);
      return filepath;
    } catch (error) {
      console.log(`❌ Failed to capture ${name}: ${error.message}`);
      return null;
    }
  }
  
  // Create browser
  const options = new chrome.Options();
  options.addArguments('--no-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  try {
    // Screenshot 1: Game loading
    console.log('🌐 Navigating to game...');
    await driver.get('http://localhost:3000/game?table=1');
    await driver.sleep(3000);
    await captureScreenshot(driver, 'game_loading', 'Initial game page load');
    
    // Screenshot 2: After longer wait for full UI
    await driver.sleep(5000);
    await captureScreenshot(driver, 'game_interface_loaded', 'Full poker table interface');
    
    // Screenshot 3: Check page content
    const pageContent = await driver.executeScript('return document.body.innerHTML');
    console.log(`📊 Page content: ${pageContent.length} characters`);
    await captureScreenshot(driver, 'game_content_check', `Game with ${pageContent.length} chars of content`);
    
    // Screenshot 4: Lobby page
    console.log('🌐 Navigating to lobby...');
    await driver.get('http://localhost:3000');
    await driver.sleep(3000);
    await captureScreenshot(driver, 'lobby_page', 'Main lobby interface');
    
    // Screenshot 5: About page  
    console.log('🌐 Navigating to about...');
    await driver.get('http://localhost:3000/about');
    await driver.sleep(2000);
    await captureScreenshot(driver, 'about_page', 'About page');
    
    console.log(`🎉 Generated ${screenshotCounter - 1} screenshots in ${screenshotDir}`);
    
  } finally {
    await driver.quit();
    console.log('✅ Browser closed');
  }
}

generateComprehensiveScreenshots().catch(console.error);