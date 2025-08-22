#!/usr/bin/env node
/**
 * Pre-test server verification script
 * Ensures both frontend and backend servers are running before tests
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';
const NAKAMA_URL = 'http://localhost:7350';
const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds

async function checkServer(url, name, retries = 0) {
  try {
    console.log(`🔍 Checking ${name} at ${url}...`);
    const response = await axios.get(url, { 
      timeout: 5000,
      validateStatus: (status) => status >= 200 && status < 400
    });
    console.log(`✅ ${name} is running (Status: ${response.status})`);
    return true;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`⚠️ ${name} not ready (attempt ${retries + 1}/${MAX_RETRIES}). Waiting ${RETRY_DELAY/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return checkServer(url, name, retries + 1);
    } else {
      console.error(`❌ ${name} failed after ${MAX_RETRIES} attempts:`, error.message);
      return false;
    }
  }
}

async function checkBackendAPIs() {
  console.log('\n🧪 Testing critical backend APIs...');
  
  try {
    // Test game history API
    const historyResponse = await axios.get(`${BACKEND_URL}/api/test/test_game_history/4`);
    console.log('✅ Game history API working');
    
    // Verify GH- prefix in response
    if (historyResponse.data && historyResponse.data.length > 0) {
      const firstId = historyResponse.data[0].id;
      if (firstId && firstId.startsWith('GH-')) {
        console.log(`✅ GH- prefix confirmed: ${firstId}`);
      } else {
        console.log(`⚠️ GH- prefix missing: ${firstId}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Backend API test failed:', error.message);
    return false;
  }
}

async function checkGamePage() {
  console.log('\n🎮 Testing game page accessibility...');
  
  try {
    const gamePageResponse = await axios.get(`${FRONTEND_URL}/game?table=4`, { timeout: 10000 });
    console.log('✅ Game page accessible');
    return true;
  } catch (error) {
    console.error('❌ Game page failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Server Verification Started');
  console.log('============================');
  
  const results = [];
  
  // Check all servers
  results.push(await checkServer(FRONTEND_URL, 'Frontend Server'));
  results.push(await checkServer(`${BACKEND_URL}/api/test/test_game_history/4`, 'Backend Server')); 
  results.push(await checkServer(`${NAKAMA_URL}/`, 'Nakama Server'));
  
  // Additional API tests if servers are running
  if (results[1]) { // Backend is running
    results.push(await checkBackendAPIs());
  }
  
  if (results[0]) { // Frontend is running
    results.push(await checkGamePage());
  }
  
  console.log('\n📊 Verification Summary');
  console.log('======================');
  
  const allPassed = results.every(result => result === true);
  
  if (allPassed) {
    console.log('✅ All servers verified and ready for testing!');
    process.exit(0);
  } else {
    console.log('❌ Server verification failed!');
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Start frontend: npm run dev (in root directory)');
    console.log('2. Start backend: npm run dev (in backend directory)');
    console.log('3. Start Nakama: docker-compose up (in nakama directory)');
    console.log('4. Wait 30-60 seconds for full startup');
    console.log('5. Re-run verification: node verify-servers.js');
    process.exit(1);
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n🛑 Verification interrupted');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

main().catch(console.error);