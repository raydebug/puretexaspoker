const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

async function captureGameHistoryScreenshots() {
  console.log('🚀 Starting game history screenshot capture...');
  
  // Setup Chrome driver
  const options = new chrome.Options();
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage'); 
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    console.log('📱 Navigating to game page...');
    await driver.get('http://localhost:3000/game?table=4');
    
    console.log('⏳ Waiting for page to load...');
    await driver.sleep(3000);
    
    console.log('📸 Capturing main game page...');
    const screenshot1 = await driver.takeScreenshot();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/selenium/screenshots/gh_test_01_main_page.png', screenshot1, 'base64');
    
    // Try to find and interact with game history
    try {
      console.log('🔍 Looking for game history element...');
      
      // Try multiple selectors for game history
      const selectors = [
        '[data-testid="game-history"]',
        '.game-history',
        '#game-history',
        '.history-panel',
        '[class*="history"]'
      ];
      
      let historyElement = null;
      for (const selector of selectors) {
        try {
          historyElement = await driver.findElement(By.css(selector));
          console.log(`✅ Found game history with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`❌ No history element found with: ${selector}`);
        }
      }
      
      if (historyElement) {
        console.log('📸 Capturing game history screenshot...');
        const screenshot2 = await driver.takeScreenshot();
        fs.writeFileSync('/Users/leiyao/work/puretexaspoker/selenium/screenshots/gh_test_02_game_history_visible.png', screenshot2, 'base64');
        
        // Try to get history text
        const historyText = await historyElement.getText();
        console.log('📋 Game history text preview:', historyText.substring(0, 200) + '...');
        
        // Check if GH- prefix is visible in the text
        if (historyText.includes('GH-')) {
          console.log('✅ GH- prefix found in game history text!');
        } else {
          console.log('⚠️ No GH- prefix found in visible text');
        }
      } else {
        console.log('⚠️ No game history element found with any selector');
      }
      
    } catch (historyError) {
      console.log('⚠️ Error accessing game history:', historyError.message);
    }
    
    // Capture additional screenshots for debugging
    console.log('📸 Capturing page source for debugging...');
    const pageSource = await driver.getPageSource();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/selenium/screenshots/gh_test_page_source.html', pageSource);
    
    console.log('📸 Final screenshot...');
    const screenshot3 = await driver.takeScreenshot();
    fs.writeFileSync('/Users/leiyao/work/puretexaspoker/selenium/screenshots/gh_test_03_final_state.png', screenshot3, 'base64');
    
    console.log('✅ Screenshot capture completed!');
    console.log('📁 Screenshots saved to:', path.resolve('/Users/leiyao/work/puretexaspoker/selenium/screenshots/'));
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    console.log('🧹 Closing browser...');
    await driver.quit();
  }
}

// Run the screenshot capture
captureGameHistoryScreenshots().catch(console.error);