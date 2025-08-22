const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome.js');

async function investigateGameHistoryDOM() {
  console.log('🔍 Starting DOM investigation for game history structure...');
  
  const options = new chrome.Options();
  options.addArguments('--headless');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    // Navigate to the poker game
    await driver.get('http://localhost:3000/game?table=1');
    
    // Wait for page to load
    await driver.sleep(3000);
    
    console.log('📋 Page loaded, investigating DOM structure...');
    
    // Look for game history elements
    const potentialSelectors = [
      '[data-testid="game-history"]',
      '.game-history', 
      '#game-history',
      '[class*="history"]',
      '[class*="log"]',
      '[class*="action"]',
      'ul', 'ol'
    ];
    
    for (const selector of potentialSelectors) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
          
          for (let i = 0; i < Math.min(elements.length, 3); i++) {
            const element = elements[i];
            const text = await element.getText();
            const innerHTML = await element.getAttribute('innerHTML');
            
            console.log(`   Element ${i+1}:`);
            console.log(`     Text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
            console.log(`     HTML: ${innerHTML.substring(0, 300)}${innerHTML.length > 300 ? '...' : ''}`);
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    // Check for any elements containing "Player" text
    const playerElements = await driver.findElements(By.xpath("//*[contains(text(), 'Player')]"));
    console.log(`\n📋 Found ${playerElements.length} elements containing 'Player' text`);
    
    if (playerElements.length > 0) {
      console.log('Sample Player elements:');
      for (let i = 0; i < Math.min(playerElements.length, 5); i++) {
        const text = await playerElements[i].getText();
        const tagName = await playerElements[i].getTagName();
        console.log(`   ${i+1}. <${tagName}>: ${text}`);
      }
    }
    
    // Check overall page structure
    const bodyText = await driver.findElement(By.css('body')).getText();
    console.log(`\n📄 Page text preview (first 500 chars):\n${bodyText.substring(0, 500)}`);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  } finally {
    await driver.quit();
  }
}

investigateGameHistoryDOM().catch(console.error);