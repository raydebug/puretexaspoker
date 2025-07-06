const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testAutoSeat() {
  console.log('🧪 Testing auto-seat functionality...');
  
  // First, get the available tables
  console.log('📋 Getting available tables...');
  const tablesResponse = await fetch('http://localhost:3001/api/tables');
  const tables = await tablesResponse.json();
  console.log('📋 Available tables:', tables.map(t => ({ id: t.id, name: t.name })));
  
  if (tables.length === 0) {
    console.error('❌ No tables available');
    return;
  }
  
  const tableId = tables[0].id; // Use the first table
  console.log(`🎯 Using table ID: ${tableId}`);
  
  const options = new chrome.Options();
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1200,800');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    // Test auto-seat for Player1 with actual table ID
    console.log('🎮 Testing Player1 auto-seat...');
    await driver.get(`http://localhost:3000/auto-seat?player=Player1&table=${tableId}&seat=1&buyin=100`);
    
    // Wait for auto-seat processing
    console.log('⏳ Waiting for auto-seat processing...');
    await driver.sleep(10000);
    
    // Get browser console logs
    console.log('📋 Getting browser console logs...');
    const logs = await driver.manage().logs().get('browser');
    console.log('🔍 Console logs:');
    logs.forEach(log => {
      console.log(`[${log.level}] ${log.message}`);
    });
    
    // Check if we're on the game page
    const currentUrl = await driver.getCurrentUrl();
    console.log(`🌐 Current URL: ${currentUrl}`);
    
    // Look for the poker table
    try {
      const pokerTable = await driver.findElement({ css: '[data-testid="poker-table"]' });
      console.log('✅ Found poker table on game page');
    } catch (error) {
      console.log('❌ Poker table not found on game page');
    }
    
    // Check backend API to see if player is seated
    console.log('🔍 Checking backend API for seated players...');
    const response = await fetch('http://localhost:3001/api/test/start-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId })
    });
    
    const result = await response.json();
    console.log('📊 Backend API response:', result);
    
    // Take a screenshot
    await driver.takeScreenshot().then(data => {
      require('fs').writeFileSync('auto-seat-test-screenshot.png', data, 'base64');
      console.log('📸 Screenshot saved: auto-seat-test-screenshot.png');
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await driver.quit();
    console.log('🧹 Test completed');
  }
}

testAutoSeat(); 