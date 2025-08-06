#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('🧪 Testing All-In Fix...');

try {
  // Test the all-in raise API directly
  const tableId = 1;
  const playerName = 'Player1';
  const allInAmount = 99;

  console.log(`Testing raise API: tableId=${tableId}, player=${playerName}, amount=${allInAmount}`);

  const result = execSync(`curl -s -X POST http://localhost:3001/api/test/raise -H "Content-Type: application/json" -d '{"tableId": ${tableId}, "playerName": "${playerName}", "amount": ${allInAmount}}'`, { encoding: 'utf8' });
  
  console.log('API Response:', result);

  const parsedResult = JSON.parse(result);
  if (parsedResult.success) {
    console.log('✅ Raise API test successful');
  } else {
    console.log('❌ Raise API test failed:', parsedResult.error);
  }

} catch (error) {
  console.log('❌ Test failed:', error.message);
}