#!/usr/bin/env node

const TestRunner = require('./utils/testRunner');

async function main() {
    const runner = new TestRunner();
    
    console.log('🎯 POKER GAME TEST RUNNER');
    console.log('='.repeat(50));
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    try {
        switch (command) {
            case 'quick':
                console.log('⚡ Running quick test (subset of features)...');
                await runner.runQuickTest();
                break;
                
            case 'comprehensive':
                console.log('🔍 Running comprehensive test (all features)...');
                await runner.runComprehensiveTest();
                break;
                
            case 'category':
                const category = args[1];
                if (!category) {
                    console.log('❌ Please specify a category: game, ui, auth, multiplayer, timeout, action');
                    process.exit(1);
                }
                console.log(`🎯 Running ${category} tests...`);
                await runner.runCategoryTest(category);
                break;
                
            case 'pattern':
                const pattern = args[1];
                if (!pattern) {
                    console.log('❌ Please specify a pattern to match feature files');
                    process.exit(1);
                }
                console.log(`🔍 Running tests matching pattern: ${pattern}`);
                await runner.runTests({ pattern });
                break;
                
            case 'all':
                console.log('🔍 Running all tests...');
                await runner.runComprehensiveTest();
                break;
                
            case 'help':
            default:
                console.log(`
🎯 POKER GAME TEST RUNNER

Usage: node run-tests-with-reporting.js [command] [options]

Commands:
  quick           Run quick test (subset of features)
  comprehensive   Run comprehensive test (all features)
  category <cat>  Run tests by category (game, ui, auth, multiplayer, timeout, action)
  pattern <pat>   Run tests matching pattern
  all             Run all tests (same as comprehensive)
  help            Show this help

Examples:
  node run-tests-with-reporting.js quick
  node run-tests-with-reporting.js category game
  node run-tests-with-reporting.js pattern "5-player"
  node run-tests-with-reporting.js comprehensive

The test runner will:
1. Track each scenario's pass/fail status
2. Generate detailed reports
3. Compare with previous test runs
4. Wait for your input after completion
                `);
                break;
        }
        
    } catch (error) {
        console.error('❌ Test run failed:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⏹️ Test run interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️ Test run terminated');
    process.exit(0);
});

// Run the main function
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main }; 