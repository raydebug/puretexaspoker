// Quick test of just the fold scenario
const { execSync } = require('child_process');

console.log('🚀 Running focused test up to Player3 fold...');

try {
  // Kill any existing cucumber processes
  try {
    execSync('pkill -f cucumber-js', { stdio: 'ignore' });
  } catch (e) {
    // Ignore if no processes found
  }

  // Run the test with a timeout and capture output
  const result = execSync('timeout 180s npx cucumber-js features/5-player-comprehensive-game-scenario.feature --config=cucumber.config.js 2>&1', {
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  
  console.log('Test output:');
  console.log(result);
  
} catch (error) {
  console.log('Test completed or timed out. Checking output...');
  if (error.stdout) {
    const output = error.stdout;
    
    // Look for the key parts we care about
    const foldSectionIndex = output.indexOf('Player3 (UTG) folds with weak hand');
    const gameHistorySectionIndex = output.indexOf('game history should show 3 action records');
    
    if (foldSectionIndex > -1) {
      console.log('\n🎯 Found Player3 fold section:');
      const foldSection = output.substring(foldSectionIndex, foldSectionIndex + 2000);
      console.log(foldSection.substring(0, 1000));
    }
    
    if (gameHistorySectionIndex > -1) {
      console.log('\n📊 Found game history verification section:');
      const historySection = output.substring(gameHistorySectionIndex, gameHistorySectionIndex + 2000);
      console.log(historySection.substring(0, 1000));
    }
    
    // Look for verification results
    if (output.includes('action records verified')) {
      console.log('\n✅ Found verification results!');
      const regex = /(\d+) action records verified/g;
      let match;
      while ((match = regex.exec(output)) !== null) {
        console.log(`Found: ${match[1]} action records verified`);
      }
    }
    
    // Check for error patterns
    if (output.includes('Expected 3 actions, found')) {
      console.log('\n❌ Found expected error pattern');
      const regex = /Expected 3 actions, found (\d+)/g;
      const match = regex.exec(output);
      if (match) {
        console.log(`Expected 3, found ${match[1]} - this confirms the issue`);
      }
    }
  }
}

console.log('\n✅ Test analysis complete');