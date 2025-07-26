#!/usr/bin/env node

const { Builder, By, until } = require('selenium-webdriver');

async function testBrowserWebSocket() {
  console.log('🧪 Testing WebSocket connection in browser...');
  
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // Navigate to game page
    console.log('🌐 Navigating to game page...');
    await driver.get('http://localhost:3000/game?table=1');
    await driver.sleep(3000);
    
    // Execute JavaScript to manually test socket connection
    console.log('🔧 Testing manual socket connection in browser...');
    const result = await driver.executeScript(`
      return new Promise((resolve) => {
        try {
          // Try to access the existing socket service
          if (window.socketService) {
            resolve({
              hasSocketService: true,
              socketExists: !!window.socketService.getSocket(),
              socketConnected: window.socketService.getSocket()?.connected || false
            });
            return;
          }
          
          // If no socket service, test direct connection
          const testSocket = io('http://localhost:3001', {
            transports: ['websocket', 'polling']
          });
          
          const timeout = setTimeout(() => {
            resolve({ error: 'Connection timeout', hasSocketService: false });
          }, 5000);
          
          testSocket.on('connect', () => {
            clearTimeout(timeout);
            resolve({
              success: true,
              socketId: testSocket.id,
              hasSocketService: false,
              directConnectionWorks: true
            });
            testSocket.disconnect();
          });
          
          testSocket.on('connect_error', (error) => {
            clearTimeout(timeout);
            resolve({
              error: error.toString(),
              hasSocketService: false,
              directConnectionWorks: false
            });
          });
          
        } catch (e) {
          resolve({ error: e.toString(), hasSocketService: false });
        }
      });
    `);
    
    console.log('🔍 Browser WebSocket test result:', JSON.stringify(result, null, 2));
    
    // Get console logs for additional debugging
    console.log('📋 Getting console logs...');
    const logs = await driver.manage().logs().get('browser');
    const wsLogs = logs.filter(log => 
      log.message.includes('socket') || 
      log.message.includes('WebSocket') ||
      log.message.includes('connect') ||
      log.message.includes('CORS')
    );
    
    if (wsLogs.length > 0) {
      console.log('📋 WebSocket-related logs:');
      wsLogs.forEach((log, i) => {
        console.log(`   ${i + 1}. [${log.level}] ${log.message}`);
      });
    } else {
      console.log('📋 No WebSocket-related logs found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await driver.quit();
  }
}

testBrowserWebSocket().catch(console.error);