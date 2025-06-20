const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runSimpleSeleniumTest() {
  console.log('🚀 Starting simple Selenium test...');
  
  try {
    // Setup Chrome driver with options
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--headless=new');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--window-size=1280,720');
    
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    console.log('✅ Chrome WebDriver initialized');
    
    // Navigate to the application
    await driver.get('http://localhost:3000');
    console.log('✅ Navigated to application');
    
    // Get page title
    const title = await driver.getTitle();
    console.log(`✅ Page title: ${title}`);
    
    // Take a screenshot
    const screenshot = await driver.takeScreenshot();
    require('fs').writeFileSync('selenium/screenshots/simple-test.png', screenshot, 'base64');
    console.log('✅ Screenshot saved');
    
    // Basic element check
    try {
      const bodyElement = await driver.findElement({ tagName: 'body' });
      const bodyText = await bodyElement.getText();
      console.log(`✅ Page loaded with content (${bodyText.length} characters)`);
    } catch (error) {
      console.log('⚠️ Could not read page content');
    }
    
    // Cleanup
    await driver.quit();
    console.log('✅ Simple Selenium test completed successfully!');
    
    console.log('\n🎉 Selenium is working! The infrastructure is ready for Cucumber tests.');
    console.log('📝 To fix the Cucumber tests, we need to resolve the module import issues.');
    
  } catch (error) {
    console.error('❌ Simple Selenium test failed:', error.message);
    process.exit(1);
  }
}

runSimpleSeleniumTest(); 