const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

async function testScreenshot() {
  console.log('🧪 Testing screenshot functionality...');
  
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
    console.log('🌐 Navigating to test page...');
    await driver.get('http://localhost:3000');
    
    // Wait for page to load
    await driver.wait(async () => {
      const readyState = await driver.executeScript('return document.readyState');
      return readyState === 'complete';
    }, 10000);
    
    console.log('⏳ Waiting for page content...');
    await driver.sleep(3000);
    
    // Check if page has content
    const bodyText = await driver.findElement({ tagName: 'body' }).getText();
    console.log('📄 Page content length:', bodyText.length);
    console.log('📄 Page title:', await driver.getTitle());
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    const screenshot = await driver.takeScreenshot();
    
    const screenshotDir = 'screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filepath = path.join(screenshotDir, 'test-screenshot.png');
    fs.writeFileSync(filepath, screenshot, 'base64');
    
    const stats = fs.statSync(filepath);
    console.log(`📸 Screenshot saved: ${filepath}`);
    console.log(`📊 File size: ${stats.size} bytes`);
    
    if (stats.size > 10000) {
      console.log('✅ Screenshot appears to have content (large file size)');
    } else {
      console.log('⚠️ Screenshot may be blank (small file size)');
    }
    
  } catch (error) {
    console.error('❌ Screenshot test failed:', error.message);
  } finally {
    await driver.quit();
    console.log('🧹 Browser closed');
  }
}

testScreenshot().catch(console.error); 