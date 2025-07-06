const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testAutoSeat() {
  console.log('🧪 Testing auto-seat functionality...');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments('--headless'))
    .build();
  
  try {
    // Test auto-seat URL
    const autoSeatUrl = 'http://localhost:3000/auto-seat?player=TestPlayer&table=1&seat=1&buyin=100';
    console.log(`🌐 Navigating to: ${autoSeatUrl}`);
    
    await driver.get(autoSeatUrl);
    
    // Wait for page to load
    await driver.wait(until.titleContains('Texas Hold\'em Poker'), 10000);
    console.log('✅ Auto-seat page loaded');
    
    // Wait for success message
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Successfully seated')]")), 30000);
    console.log('✅ Auto-seat completed successfully');
    
    // Check if redirected to game page
    const currentUrl = await driver.getCurrentUrl();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/game/')) {
      console.log('✅ Successfully redirected to game page');
      
      // Wait for poker table element
      await driver.wait(until.elementLocated(By.css('[data-testid="poker-table"]')), 10000);
      console.log('✅ Poker table element found');
      
    } else {
      console.log('❌ Not redirected to game page');
    }
    
  } catch (error) {
    console.error('❌ Auto-seat test failed:', error.message);
  } finally {
    await driver.quit();
  }
}

testAutoSeat(); 