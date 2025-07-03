const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

async function testRealScreenshots() {
  console.log('🧪 Testing real screenshot functionality with page ready indicators...');
  
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--window-size=1280,720');
  chromeOptions.addArguments('--disable-gpu');
  chromeOptions.addArguments('--force-device-scale-factor=1');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
    
  try {
    console.log('🌐 Navigating to lobby page...');
    await driver.get('http://localhost:3000');
    
    // Wait for page ready indicator
    console.log('⏳ Waiting for page ready indicator...');
    await driver.wait(async () => {
      try {
        const readyElement = await driver.findElement({ css: '[data-testid="page-ready"]' });
        return await readyElement.isDisplayed();
      } catch (e) {
        return false;
      }
    }, 10000);
    
    console.log('✅ Page ready indicator found!');
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    const screenshot = await driver.takeScreenshot();
    const filename = path.join(__dirname, 'screenshots', 'real-lobby-screenshot.png');
    fs.writeFileSync(filename, screenshot, 'base64');
    
    const stats = fs.statSync(filename);
    console.log(`📸 Screenshot saved: ${filename}`);
    console.log(`📊 File size: ${stats.size} bytes`);
    
    if (stats.size > 10000) {
      console.log('✅ Screenshot appears to have content (large file size)');
    } else {
      console.log('❌ Screenshot appears to be blank (small file size)');
    }
    
    // Test auto-seat URL
    console.log('🌐 Testing auto-seat URL...');
    await driver.get('http://localhost:3000/auto-seat?player=TestPlayer&table=1&seat=1&buyin=100');
    
    // Wait for game page ready indicator
    console.log('⏳ Waiting for game page ready indicator...');
    await driver.wait(async () => {
      try {
        const readyElement = await driver.findElement({ css: '[data-testid="page-ready"]' });
        return await readyElement.isDisplayed();
      } catch (e) {
        return false;
      }
    }, 10000);
    
    console.log('✅ Game page ready indicator found!');
    
    // Take screenshot
    console.log('📸 Taking game page screenshot...');
    const gameScreenshot = await driver.takeScreenshot();
    const gameFilename = path.join(__dirname, 'screenshots', 'real-game-screenshot.png');
    fs.writeFileSync(gameFilename, gameScreenshot, 'base64');
    
    const gameStats = fs.statSync(gameFilename);
    console.log(`📸 Game screenshot saved: ${gameFilename}`);
    console.log(`📊 File size: ${gameStats.size} bytes`);
    
    if (gameStats.size > 10000) {
      console.log('✅ Game screenshot appears to have content (large file size)');
    } else {
      console.log('❌ Game screenshot appears to be blank (small file size)');
    }
    
  } catch (error) {
    console.error('❌ Screenshot test failed:', error.message);
  } finally {
    console.log('🧹 Browser closed');
    await driver.quit();
  }
}

testRealScreenshots(); 