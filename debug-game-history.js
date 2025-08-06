const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome.js');

async function debugGameHistory() {
  console.log('🔍 Debugging game history detection...');
  
  const options = new chrome.Options();
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-web-security');
  options.addArguments('--disable-features=VizDisplayCompositor');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    // Navigate to game page
    console.log('🌐 Navigating to game page...');
    await driver.get('http://localhost:3000/game?table=1');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to find game history component
    console.log('🔍 Looking for game history component...');
    
    try {
      const historyElement = await driver.findElement(By.css('[data-testid="game-history"]'));
      console.log('✅ Found game history via data-testid!');
      
      const isDisplayed = await historyElement.isDisplayed();
      console.log(`📍 Is displayed: ${isDisplayed}`);
      
      if (isDisplayed) {
        const text = await historyElement.getText();
        console.log(`📚 Game history text: "${text.substring(0, 200)}..."`);
      }
    } catch (err) {
      console.log(`❌ data-testid failed: ${err.message}`);
      
      // Try XPath
      try {
        const elements = await driver.findElements(By.xpath('//*[contains(text(), "Game History")]'));
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} elements via XPath!`);
          const text = await elements[0].getText();
          console.log(`📚 XPath element text: "${text.substring(0, 200)}..."`);
        } else {
          console.log('❌ No elements found via XPath');
        }
      } catch (err2) {
        console.log(`❌ XPath failed: ${err2.message}`);
      }
    }
    
    // List all data-testid attributes
    console.log('🔍 Listing all data-testid attributes...');
    const allTestIds = await driver.executeScript(`
      return Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'));
    `);
    console.log(`📋 Available data-testids: ${allTestIds.join(', ')}`);
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await driver.quit();
  }
}

debugGameHistory().catch(console.error);