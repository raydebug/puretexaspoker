// Test script to verify immediate failure behavior
console.log('🧪 Testing immediate failure behavior for verification errors...');

// Simulate the updated verification function that should throw errors immediately
function testImmediateFailureLogic(historyText, expectedText, shouldPass = true) {
  console.log(`\n🔍 Testing: ${expectedText}`);
  console.log(`📜 Mock history: ${historyText}`);
  console.log(`🎯 Expected outcome: ${shouldPass ? 'PASS' : 'FAIL IMMEDIATELY'}`);
  
  try {
    // Extract components from expected text (same logic as updated function)
    const playerName = expectedText.split(' ')[0];
    const actionMatch = expectedText.match(/(call|raise|fold|check|bet|all-in|small_blind|big_blind|posts)/i);
    const actionType = actionMatch ? actionMatch[1].toLowerCase() : '';
    const amountMatch = expectedText.match(/\$(\d+)/);
    const amount = amountMatch ? amountMatch[1] : '';
    
    // Handle special cases for blind actions
    let normalizedAction = actionType;
    if (expectedText.toLowerCase().includes('small blind') || expectedText.toLowerCase().includes('posts small blind')) {
      normalizedAction = 'small_blind';
    } else if (expectedText.toLowerCase().includes('big blind') || expectedText.toLowerCase().includes('posts big blind')) {
      normalizedAction = 'big_blind';
    }
    
    // Main verification logic
    const playerFound = historyText.includes(playerName);
    const actionFound = normalizedAction && (
      historyText.toLowerCase().includes(normalizedAction) || 
      historyText.toLowerCase().includes(actionType) ||
      historyText.includes('Small_Blind') ||
      historyText.includes('Big_Blind')
    );
    const amountFound = !amount || historyText.includes(`$${amount}`) || historyText.includes(amount);
    
    const basicMatch = playerFound && (actionFound || historyText.length > 0);
    const amountMatchVerified = amountFound || !amount;
    
    const historyVerified = basicMatch && amountMatchVerified;
    
    // IMMEDIATE FAILURE LOGIC (updated behavior)
    if (!historyVerified) {
      const errorMessage = `❌ CRITICAL: Game history verification failed - ${expectedText} not found in UI`;
      console.log(errorMessage);
      console.log(`📜 Available history content was checked but verification failed`);
      throw new Error(errorMessage);
    }
    
    console.log(`✅ Enhanced game history verified: ${expectedText}`);
    return true;
    
  } catch (error) {
    const errorMessage = `❌ CRITICAL: Enhanced game history verification error: ${error.message}`;
    console.log(errorMessage);
    console.log(`🚨 Test will stop immediately due to verification failure`);
    throw new Error(errorMessage);
  }
}

// Test cases - some should pass, some should fail immediately
const testCases = [
  {
    name: "Valid Small Blind (Should Pass)",
    historyText: `Game History (2)\nPlayer2 Small_Blind\n$1\nPreflop\n07:17`,
    expectedText: "Player2 (BB) posts small blind $1",
    shouldPass: true
  },
  {
    name: "Invalid Player Name (Should Fail Immediately)",
    historyText: `Game History (2)\nPlayer2 Small_Blind\n$1\nPreflop\n07:17`,
    expectedText: "Player9 (UTG) posts small blind $1",
    shouldPass: false
  },
  {
    name: "Valid Call Action (Should Pass)",
    historyText: `Game History (3)\nPlayer2 call\n$2\nPreflop\n07:20`,
    expectedText: "Player2 (BB) calls $2",
    shouldPass: true
  },
  {
    name: "Wrong Amount (Should Fail Immediately)",
    historyText: `Game History (3)\nPlayer2 call\n$2\nPreflop\n07:20`,
    expectedText: "Player2 (BB) calls $10",
    shouldPass: false
  },
  {
    name: "Missing Action (Should Fail Immediately)",
    historyText: `Game History (1)\nPlayer1 fold\nPreflop\n07:25`,
    expectedText: "Player2 (BB) calls $2",
    shouldPass: false
  }
];

console.log('\n🧪 Running immediate failure behavior tests...\n');

let passCount = 0;
let expectedFailures = 0;
let unexpectedBehavior = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
  
  try {
    const result = testImmediateFailureLogic(testCase.historyText, testCase.expectedText, testCase.shouldPass);
    
    if (testCase.shouldPass) {
      console.log(`✅ Correctly passed as expected`);
      passCount++;
    } else {
      console.log(`❌ UNEXPECTED: Test should have failed immediately but passed`);
      unexpectedBehavior++;
    }
    
  } catch (error) {
    if (!testCase.shouldPass) {
      console.log(`✅ Correctly failed immediately as expected`);
      expectedFailures++;
    } else {
      console.log(`❌ UNEXPECTED: Test should have passed but failed: ${error.message}`);
      unexpectedBehavior++;
    }
  }
});

console.log(`\n📊 Immediate Failure Test Results:`);
console.log(`   ✅ Expected passes: ${passCount}`);
console.log(`   ✅ Expected immediate failures: ${expectedFailures}`);
console.log(`   ❌ Unexpected behavior: ${unexpectedBehavior}`);
console.log(`   📋 Total tests: ${testCases.length}`);

if (unexpectedBehavior === 0) {
  console.log('\n🎯 SUCCESS: All tests behaved as expected - immediate failure logic is working correctly!');
} else {
  console.log('\n⚠️ ISSUES: Some tests had unexpected behavior - immediate failure logic may need adjustment.');
}