#!/usr/bin/env node

const CoverageAnalyzer = require('./coverageAnalyzer');
const CoverageComparator = require('./coverageComparator');

async function runCompleteCoverageAnalysis() {
  try {
    console.log('🧪 Running complete post-selenium coverage analysis...\n');
    
    // Step 1: Run coverage analysis
    console.log('Step 1: Analyzing current test coverage...');
    const analyzer = new CoverageAnalyzer();
    const analysisResult = await analyzer.analyze();
    
    // Step 2: Compare with previous runs
    console.log('\nStep 2: Comparing with previous runs...');
    const comparator = new CoverageComparator();
    const comparisonResult = await comparator.compare();
    
    // Step 3: Generate summary insights
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPLETE COVERAGE ANALYSIS INSIGHTS');
    console.log('='.repeat(80));
    
    const insights = generateInsights(analysisResult.report, comparisonResult.comparisonReport);
    printInsights(insights);
    
    // Step 4: Save combined report
    const combinedReport = {
      timestamp: new Date().toISOString(),
      currentAnalysis: analysisResult.report,
      comparison: comparisonResult.comparisonReport,
      insights
    };
    
    const combinedReportPath = require('path').join(__dirname, '../reports', `complete-analysis-${Date.now()}.json`);
    require('fs').writeFileSync(combinedReportPath, JSON.stringify(combinedReport, null, 2));
    
    console.log(`\n📋 Complete analysis saved: ${combinedReportPath}`);
    console.log('✅ Coverage analysis completed successfully!');
    
    // Return appropriate exit code
    const worstCoverage = Math.min(
      analysisResult.report.summary.coverage.apiEndpoints.percentage,
      analysisResult.report.summary.coverage.socketEvents.percentage,
      analysisResult.report.summary.coverage.components.percentage
    );
    
    const duplicateCount = analysisResult.report.summary.duplicateAreas;
    const minCoverage = 70;
    
    if (worstCoverage < minCoverage) {
      console.log(`\n⚠️  Warning: Coverage below ${minCoverage}% threshold`);
      process.exit(1);
    } else if (duplicateCount > 10) {
      console.log(`\n⚠️  Warning: High duplicate coverage (${duplicateCount} areas)`);
      process.exit(1);
    } else {
      console.log(`\n✅ All coverage metrics meet quality thresholds`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Coverage analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function generateInsights(currentReport, comparisonReport) {
  const insights = {
    qualityScore: calculateQualityScore(currentReport),
    riskAreas: identifyRiskAreas(currentReport),
    improvements: [],
    concerns: [],
    recommendations: []
  };
  
  // Add comparison insights if available
  if (comparisonReport && !comparisonReport.error && comparisonReport.summary) {
    const summary = comparisonReport.summary;
    
    if (summary.overallTrend === 'improving') {
      insights.improvements.push('Coverage trend is improving across test runs');
    } else if (summary.overallTrend === 'declining') {
      insights.concerns.push('Coverage trend is declining - investigate test removals');
    }
    
    if (summary.duplicateStatus === 'increased') {
      insights.concerns.push('Duplicate test coverage is increasing - consider test consolidation');
    } else if (summary.duplicateStatus === 'decreased') {
      insights.improvements.push('Duplicate test coverage has been reduced');
    }
    
    if (summary.testChanges.newTests > 0) {
      insights.improvements.push(`${summary.testChanges.newTests} new test files added`);
    }
    
    if (summary.testChanges.removedTests > 0) {
      insights.concerns.push(`${summary.testChanges.removedTests} test files removed`);
    }
  }
  
  // Generate recommendations
  if (insights.riskAreas.length > 0) {
    insights.recommendations.push('Focus testing efforts on low-coverage areas');
  }
  
  if (currentReport.summary.duplicateAreas > 5) {
    insights.recommendations.push('Review and consolidate duplicate test coverage');
  }
  
  if (insights.qualityScore < 75) {
    insights.recommendations.push('Increase overall test coverage to improve quality score');
  }
  
  return insights;
}

function calculateQualityScore(report) {
  const coverage = report.summary.coverage;
  const duplicatePenalty = Math.min(report.summary.duplicateAreas * 2, 20);
  
  const avgCoverage = (
    coverage.apiEndpoints.percentage +
    coverage.socketEvents.percentage +
    coverage.components.percentage
  ) / 3;
  
  return Math.max(0, Math.round(avgCoverage - duplicatePenalty));
}

function identifyRiskAreas(report) {
  const risks = [];
  const coverage = report.summary.coverage;
  
  if (coverage.apiEndpoints.percentage < 60) {
    risks.push('Low API endpoint coverage');
  }
  
  if (coverage.socketEvents.percentage < 50) {
    risks.push('Low WebSocket event coverage');
  }
  
  if (coverage.components.percentage < 40) {
    risks.push('Low component coverage');
  }
  
  if (report.uncoveredAreas.uncoveredEndpoints.length > 10) {
    risks.push('Many uncovered API endpoints');
  }
  
  if (report.summary.duplicateAreas > 10) {
    risks.push('High duplicate test coverage');
  }
  
  return risks;
}

function printInsights(insights) {
  console.log(`🏆 Overall Quality Score: ${insights.qualityScore}/100`);
  
  if (insights.improvements.length > 0) {
    console.log('\n✅ IMPROVEMENTS:');
    insights.improvements.forEach(improvement => {
      console.log(`   • ${improvement}`);
    });
  }
  
  if (insights.concerns.length > 0) {
    console.log('\n⚠️  CONCERNS:');
    insights.concerns.forEach(concern => {
      console.log(`   • ${concern}`);
    });
  }
  
  if (insights.riskAreas.length > 0) {
    console.log('\n🚨 RISK AREAS:');
    insights.riskAreas.forEach(risk => {
      console.log(`   • ${risk}`);
    });
  }
  
  if (insights.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    insights.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }
}

// Run if called directly
if (require.main === module) {
  runCompleteCoverageAnalysis();
}

module.exports = runCompleteCoverageAnalysis;
