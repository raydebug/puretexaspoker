const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runHeadedDemo() {
  console.log('🚀 Starting Headed Mode Demo - You should see a Chrome browser window open...');
  
  try {
    // Setup Chrome driver with headed options (no --headless flag)
    const chromeOptions = new chrome.Options();
    // Remove headless mode to show the browser window
    // chromeOptions.addArguments('--headless=new'); // COMMENTED OUT for headed mode
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--window-size=1280,720');
    chromeOptions.addArguments('--disable-web-security');
    
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    console.log('✅ Chrome WebDriver initialized in HEADED mode');
    console.log('👀 You should see a Chrome browser window open now!');
    
    // Navigate to Google as a simple test
    console.log('🌐 Navigating to Google...');
    await driver.get('https://www.google.com');
    
    // Wait a bit so you can see the browser
    console.log('⏳ Waiting 5 seconds so you can see the browser window...');
    await driver.sleep(5000);
    
    // Get page title
    const title = await driver.getTitle();
    console.log(`✅ Page title: ${title}`);
    
    // Take a screenshot
    const screenshot = await driver.takeScreenshot();
    require('fs').writeFileSync('screenshots/headed-demo.png', screenshot, 'base64');
    console.log('✅ Screenshot saved to screenshots/headed-demo.png');
    
    // Search for something
    console.log('🔍 Performing a search...');
    const searchBox = await driver.findElement({ name: 'q' });
    await searchBox.sendKeys('Selenium WebDriver headed mode');
    await searchBox.submit();
    
    // Wait to see search results
    console.log('⏳ Waiting 3 seconds to see search results...');
    await driver.sleep(3000);
    
    console.log('🎉 Headed mode demo completed successfully!');
    console.log('💡 The browser window showed you the actual automation in action');
    
    // Cleanup
    await driver.quit();
    console.log('✅ Browser closed');
    
  } catch (error) {
    console.error('❌ Headed mode demo failed:', error.message);
    process.exit(1);
  }
}

runHeadedDemo(); 