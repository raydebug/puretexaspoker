#!/usr/bin/env node

const CoverageAnalyzer = require('./coverageAnalyzer');

async function runCoverageAnalysis() {
  try {
    console.log('🧪 Running post-selenium test coverage analysis...\n');
    
    const analyzer = new CoverageAnalyzer();
    const result = await analyzer.analyze();
    
    console.log('\n✅ Coverage analysis completed successfully!');
    console.log(`📄 Report saved: ${result.reportFile}`);
    
    // Exit with appropriate code based on coverage
    const coverage = result.report.summary.coverage;
    const minCoverage = 70; // Set minimum expected coverage
    
    const lowestCoverage = Math.min(
      coverage.apiEndpoints.percentage,
      coverage.socketEvents.percentage,
      coverage.components.percentage
    );
    
    if (lowestCoverage < minCoverage) {
      console.log(`\n⚠️  Warning: Coverage below ${minCoverage}% threshold (lowest: ${lowestCoverage}%)`);
      process.exit(1);
    } else {
      console.log(`\n✅ All coverage areas meet the ${minCoverage}% threshold`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Coverage analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runCoverageAnalysis();
}

module.exports = runCoverageAnalysis; 