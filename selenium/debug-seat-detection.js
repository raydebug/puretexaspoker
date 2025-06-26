const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function debugSeatDetection() {
  console.log('🔍 DEBUG: Starting seat detection debug test...');
  
  const options = new chrome.Options();
  options.addArguments('--headless=false'); // Run in headed mode for debugging
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  try {
    console.log('🌐 DEBUG: Navigating to frontend...');
    await driver.get('http://localhost:3000');
    await driver.sleep(3000);
    
    console.log('🔍 DEBUG: Looking for body element...');
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    console.log('✅ DEBUG: Body element found');
    
    console.log('🔍 DEBUG: Checking page title...');
    const title = await driver.getTitle();
    console.log(`📝 DEBUG: Page title: "${title}"`);
    
    console.log('�� DEBUG: Looking for login elements...');
    try {
      const loginButton = await driver.findElement(By.css('[data-testid="login-button"]'));
      console.log('✅ DEBUG: Login button found - user needs to login first');
      
      // Try to login
      await loginButton.click();
      await driver.sleep(1000);
      
      const nicknameInput = await driver.wait(until.elementLocated(By.css('[data-testid="nickname-input"]')), 5000);
      await nicknameInput.sendKeys('DebugUser');
      
      const joinButton = await driver.findElement(By.css('[data-testid="join-button"]'));
      await joinButton.click();
      
      await driver.sleep(3000);
      
      console.log('✅ DEBUG: Login completed successfully');
      
      // **CRITICAL STEP**: Join a table from lobby
      console.log('🔍 DEBUG: Looking for table join buttons...');
      const tableJoinButtons = await driver.findElements(By.css('[data-testid^="join-table-"]'));
      console.log(`📊 DEBUG: Found ${tableJoinButtons.length} table join buttons`);
      
      if (tableJoinButtons.length > 0) {
        const firstTableButton = tableJoinButtons[0];
        const testId = await firstTableButton.getAttribute('data-testid');
        console.log(`🎯 DEBUG: Clicking first table join button: ${testId}`);
        
        await firstTableButton.click();
        await driver.sleep(5000); // Give more time for navigation and welcome popup
        
        console.log('🔍 DEBUG: Looking for poker table after joining table...');
        try {
          await driver.wait(until.elementLocated(By.css('[data-testid="poker-table"]')), 15000);
          console.log('✅ DEBUG: Poker table found after joining table');
          
          console.log('🔍 DEBUG: Looking for available seats...');
          const availableSeats = await driver.findElements(By.css('[data-testid^="available-seat-"]'));
          console.log(`📊 DEBUG: Found ${availableSeats.length} available seats`);
          
          for (let i = 0; i < availableSeats.length; i++) {
            const seat = availableSeats[i];
            const testId = await seat.getAttribute('data-testid');
            const isDisplayed = await seat.isDisplayed();
            const text = await seat.getText();
            console.log(`🪑 DEBUG: Seat ${i + 1}: testId="${testId}", displayed=${isDisplayed}, text="${text}"`);
          }
          
          if (availableSeats.length > 0) {
            console.log('🔍 DEBUG: Trying to click first available seat...');
            const firstSeat = availableSeats[0];
            await firstSeat.click();
            await driver.sleep(2000);
            
            console.log('🔍 DEBUG: Looking for seat dialog...');
            try {
              const dialog = await driver.findElement(By.css('[data-testid="seat-dialog"]'));
              const dialogDisplayed = await dialog.isDisplayed();
              console.log(`✅ DEBUG: Seat dialog found, displayed: ${dialogDisplayed}`);
              
              // Try to take the seat
              console.log('🔍 DEBUG: Looking for buyin dropdown...');
              const buyinDropdown = await driver.findElement(By.css('[data-testid="buyin-dropdown"]'));
              console.log('✅ DEBUG: Buyin dropdown found');
              
              console.log('🔍 DEBUG: Selecting custom buyin option...');
              await driver.executeScript("arguments[0].value = '-1'; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", buyinDropdown);
              await driver.sleep(1000);
              
              console.log('🔍 DEBUG: Looking for custom buyin input...');
              const customInput = await driver.findElement(By.css('[data-testid="custom-buyin-input"]'));
              await customInput.sendKeys('500');
              console.log('✅ DEBUG: Custom buyin amount entered');
              
              console.log('🔍 DEBUG: Looking for confirm button...');
              const confirmButton = await driver.findElement(By.css('[data-testid="confirm-seat-btn"]'));
              await confirmButton.click();
              console.log('✅ DEBUG: Confirm button clicked');
              
              await driver.sleep(3000);
              
              console.log('🔍 DEBUG: Checking if dialog closed...');
              const dialogStillThere = await driver.findElements(By.css('[data-testid="seat-dialog"]'));
              if (dialogStillThere.length === 0) {
                console.log('✅ DEBUG: Seat selection successful - dialog closed');
              } else {
                console.log('❌ DEBUG: Seat selection failed - dialog still open');
              }
              
            } catch (e) {
              console.log(`❌ DEBUG: Seat dialog not found: ${e.message}`);
            }
          } else {
            console.log('❌ DEBUG: No available seats found');
          }
          
        } catch (e) {
          console.log(`❌ DEBUG: Poker table not found after joining: ${e.message}`);
          
          console.log('🔍 DEBUG: Checking current URL...');
          const currentUrl = await driver.getCurrentUrl();
          console.log(`📍 DEBUG: Current URL: ${currentUrl}`);
        }
        
      } else {
        console.log('❌ DEBUG: No table join buttons found');
      }
      
    } catch (loginError) {
      console.log(`❌ DEBUG: Login process failed: ${loginError.message}`);
    }
    
  } catch (error) {
    console.error('❌ DEBUG: Error occurred:', error);
  } finally {
    console.log('🔄 DEBUG: Closing browser...');
    await driver.quit();
  }
}

// Run the debug test
debugSeatDetection().catch(console.error); 