#!/usr/bin/env node

const CoverageComparator = require('./coverageComparator');

async function runCoverageComparison() {
  try {
    console.log('📊 Running coverage comparison analysis...\n');
    
    const comparator = new CoverageComparator();
    const result = await comparator.compare();
    
    console.log(`\n📋 Comparison report saved: ${result.reportFile}`);
    console.log('✅ Coverage comparison completed successfully!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Coverage comparison failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runCoverageComparison();
}

module.exports = runCoverageComparison;
