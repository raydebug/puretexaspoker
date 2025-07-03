const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

async function testGamePageLoad() {
  console.log('🧪 Testing game page load...');
  
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--window-size=1280,720');
  chromeOptions.addArguments('--disable-gpu');
  chromeOptions.addArguments('--force-device-scale-factor=1');
  chromeOptions.addArguments('--enable-logging');
  chromeOptions.addArguments('--v=1');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
    
  try {
    console.log('🌐 Navigating to lobby page...');
    await driver.get('http://localhost:3000');
    await driver.sleep(2000);
    
    // Check if lobby loads
    const lobbyContent = await driver.getPageSource();
    console.log('📄 Lobby page loaded, checking content...');
    
    if (lobbyContent.includes('lobby-container')) {
      console.log('✅ Lobby page loaded successfully');
    } else {
      console.log('❌ Lobby page not loading correctly');
      console.log('Page content preview:', lobbyContent.substring(0, 500));
    }
    
    // Try to navigate to a game page
    console.log('🎮 Navigating to game page...');
    await driver.get('http://localhost:3000/game/1');
    await driver.sleep(3000);
    
    // Check for JavaScript errors
    const logs = await driver.manage().logs().get('browser');
    console.log('🔍 Browser console logs:');
    logs.forEach(log => {
      console.log(`[${log.level}] ${log.message}`);
    });
    
    // Check page content
    const gamePageContent = await driver.getPageSource();
    console.log('📄 Game page content check...');
    
    if (gamePageContent.includes('game-container') || gamePageContent.includes('observer-view')) {
      console.log('✅ Game page loaded successfully');
    } else if (gamePageContent.includes('loading')) {
      console.log('⏳ Game page is still loading...');
    } else if (gamePageContent.includes('error')) {
      console.log('❌ Game page has errors');
    } else {
      console.log('❓ Game page content unclear');
      console.log('Page content preview:', gamePageContent.substring(0, 1000));
    }
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'game-page-load-test.png');
    await driver.takeScreenshot().then(data => {
      fs.writeFileSync(screenshotPath, data, 'base64');
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    });
    
    // Check file size
    const stats = fs.statSync(screenshotPath);
    console.log(`📊 Screenshot size: ${stats.size} bytes`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await driver.quit();
  }
}

testGamePageLoad(); 