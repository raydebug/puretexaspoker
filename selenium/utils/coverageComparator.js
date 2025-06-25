const fs = require('fs');
const path = require('path');

class CoverageComparator {
  constructor() {
    this.reportsPath = path.join(__dirname, '../reports');
    this.comparisonPath = path.join(this.reportsPath, 'coverage-comparisons');
  }

  // Get all coverage reports sorted by timestamp
  getAllReports() {
    if (!fs.existsSync(this.reportsPath)) {
      return [];
    }

    const reportFiles = fs.readdirSync(this.reportsPath)
      .filter(file => file.startsWith('coverage-report-') && file.endsWith('.json'))
      .map(file => {
        const content = JSON.parse(fs.readFileSync(path.join(this.reportsPath, file), 'utf8'));
        return {
          filename: file,
          timestamp: content.timestamp,
          report: content
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return reportFiles;
  }

  // Compare two coverage reports
  compareReports(report1, report2) {
    const comparison = {
      timestamp1: report1.timestamp,
      timestamp2: report2.timestamp,
      coverageChanges: this.compareCoverageMetrics(report1, report2),
      duplicateChanges: this.compareDuplicateCoverage(report1, report2),
      newTests: this.findNewTests(report1, report2),
      removedTests: this.findRemovedTests(report1, report2),
      testChanges: this.analyzeTestChanges(report1, report2)
    };

    return comparison;
  }

  // Compare coverage metrics between reports
  compareCoverageMetrics(report1, report2) {
    const cov1 = report1.summary.coverage;
    const cov2 = report2.summary.coverage;

    return {
      apiEndpoints: {
        previous: cov2.apiEndpoints.percentage,
        current: cov1.apiEndpoints.percentage,
        change: cov1.apiEndpoints.percentage - cov2.apiEndpoints.percentage,
        newCovered: cov1.apiEndpoints.covered - cov2.apiEndpoints.covered
      },
      socketEvents: {
        previous: cov2.socketEvents.percentage,
        current: cov1.socketEvents.percentage,
        change: cov1.socketEvents.percentage - cov2.socketEvents.percentage,
        newCovered: cov1.socketEvents.covered - cov2.socketEvents.covered
      },
      components: {
        previous: cov2.components.percentage,
        current: cov1.components.percentage,
        change: cov1.components.percentage - cov2.components.percentage,
        newCovered: cov1.components.covered - cov2.components.covered
      }
    };
  }

  // Compare duplicate coverage between reports
  compareDuplicateCoverage(report1, report2) {
    const dup1 = report1.duplicateCoverage || {};
    const dup2 = report2.duplicateCoverage || {};

    const resolved = [];
    const newDuplicates = [];
    const persistent = [];

    // Find resolved duplicates
    Object.keys(dup2).forEach(area => {
      if (!dup1[area]) {
        resolved.push({ area, testFiles: dup2[area] });
      }
    });

    // Find new duplicates
    Object.keys(dup1).forEach(area => {
      if (!dup2[area]) {
        newDuplicates.push({ area, testFiles: dup1[area] });
      } else {
        persistent.push({ 
          area, 
          testFiles: dup1[area],
          previousCount: dup2[area].length,
          currentCount: dup1[area].length
        });
      }
    });

    return {
      resolved,
      newDuplicates,
      persistent,
      summary: {
        totalResolved: resolved.length,
        totalNew: newDuplicates.length,
        totalPersistent: persistent.length,
        netChange: newDuplicates.length - resolved.length
      }
    };
  }

  // Find new test files
  findNewTests(report1, report2) {
    const tests1 = Object.keys(report1.detailedCoverage || {});
    const tests2 = Object.keys(report2.detailedCoverage || {});
    return tests1.filter(test => !tests2.includes(test));
  }

  // Find removed test files
  findRemovedTests(report1, report2) {
    const tests1 = Object.keys(report1.detailedCoverage || {});
    const tests2 = Object.keys(report2.detailedCoverage || {});
    return tests2.filter(test => !tests1.includes(test));
  }

  // Analyze changes in test step counts
  analyzeTestChanges(report1, report2) {
    const changes = [];
    const detailed1 = report1.detailedCoverage || {};
    const detailed2 = report2.detailedCoverage || {};

    Object.keys(detailed1).forEach(testFile => {
      if (detailed2[testFile]) {
        const current = detailed1[testFile];
        const previous = detailed2[testFile];

        if (current.stepCount !== previous.stepCount) {
          changes.push({
            testFile,
            previousSteps: previous.stepCount,
            currentSteps: current.stepCount,
            change: current.stepCount - previous.stepCount
          });
        }
      }
    });

    return changes;
  }

  // Generate comprehensive comparison report
  generateComparisonReport(reports) {
    if (reports.length < 2) {
      return { error: 'Need at least 2 reports to compare' };
    }

    const latestReport = reports[0];
    const comparisons = [];

    // Compare with previous reports (up to 5)
    for (let i = 1; i < Math.min(reports.length, 6); i++) {
      const comparison = this.compareReports(latestReport.report, reports[i].report);
      comparison.label = i === 1 ? 'vs Previous' : `vs ${i} runs ago`;
      comparisons.push(comparison);
    }

    return {
      latest: latestReport.report,
      comparisons,
      summary: this.generateComparisonSummary(comparisons[0])
    };
  }

  // Generate summary of comparison
  generateComparisonSummary(comparison) {
    if (!comparison) return { message: 'No comparison available' };

    const summary = {
      overallTrend: 'stable',
      significantChanges: [],
      duplicateStatus: 'unchanged',
      testChanges: {
        newTests: comparison.newTests.length,
        removedTests: comparison.removedTests.length,
        modifiedTests: comparison.testChanges.length
      }
    };

    // Analyze coverage changes
    const coverageChanges = comparison.coverageChanges;
    Object.keys(coverageChanges).forEach(area => {
      const change = coverageChanges[area];
      if (Math.abs(change.change) >= 5) {
        summary.significantChanges.push({
          area,
          change: change.change,
          direction: change.change > 0 ? 'improvement' : 'decline'
        });
      }
    });

    // Analyze duplicate status
    const dupChanges = comparison.duplicateChanges;
    if (dupChanges.summary.netChange > 0) {
      summary.duplicateStatus = 'increased';
    } else if (dupChanges.summary.netChange < 0) {
      summary.duplicateStatus = 'decreased';
    }

    // Overall trend
    if (summary.significantChanges.length > 0) {
      const improvements = summary.significantChanges.filter(c => c.direction === 'improvement').length;
      const declines = summary.significantChanges.filter(c => c.direction === 'decline').length;
      
      if (improvements > declines) {
        summary.overallTrend = 'improving';
      } else if (declines > improvements) {
        summary.overallTrend = 'declining';
      }
    }

    return summary;
  }

  // Save comparison report
  saveComparisonReport(comparisonReport) {
    if (!fs.existsSync(this.comparisonPath)) {
      fs.mkdirSync(this.comparisonPath, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const reportFile = path.join(this.comparisonPath, `comparison-${Date.now()}.json`);
    const latestFile = path.join(this.comparisonPath, 'latest-comparison.json');

    const report = {
      timestamp,
      ...comparisonReport
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    fs.writeFileSync(latestFile, JSON.stringify(report, null, 2));

    return reportFile;
  }

  // Print comparison summary
  printComparisonSummary(comparisonReport) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COVERAGE COMPARISON ANALYSIS');
    console.log('='.repeat(80));

    if (comparisonReport.error) {
      console.log(`❌ ${comparisonReport.error}`);
      return;
    }

    const summary = comparisonReport.summary;
    if (summary && summary.message) {
      console.log(`ℹ️  ${summary.message}`);
      return;
    }

    console.log(`📈 Overall Trend: ${summary.overallTrend.toUpperCase()}`);
    
    if (summary.significantChanges.length > 0) {
      console.log('\n🔄 SIGNIFICANT CHANGES:');
      summary.significantChanges.forEach(change => {
        const emoji = change.direction === 'improvement' ? '📈' : '📉';
        const sign = change.change > 0 ? '+' : '';
        console.log(`   ${emoji} ${change.area}: ${sign}${change.change}%`);
      });
    }

    console.log(`\n🔁 DUPLICATE STATUS: ${summary.duplicateStatus.toUpperCase()}`);
    
    const dupChanges = comparisonReport.comparisons[0].duplicateChanges;
    if (dupChanges.summary.totalResolved > 0) {
      console.log(`   ✅ Resolved: ${dupChanges.summary.totalResolved} duplicate areas`);
    }
    if (dupChanges.summary.totalNew > 0) {
      console.log(`   ⚠️  New: ${dupChanges.summary.totalNew} duplicate areas`);
    }

    console.log('\n📝 TEST CHANGES:');
    console.log(`   New tests: ${summary.testChanges.newTests}`);
    console.log(`   Removed tests: ${summary.testChanges.removedTests}`);
    console.log(`   Modified tests: ${summary.testChanges.modifiedTests}`);

    console.log('\n' + '='.repeat(80));
  }

  // Main comparison method
  async compare() {
    const reports = this.getAllReports();
    const comparisonReport = this.generateComparisonReport(reports);
    const reportFile = this.saveComparisonReport(comparisonReport);
    
    this.printComparisonSummary(comparisonReport);
    
    return { comparisonReport, reportFile };
  }
}

module.exports = CoverageComparator; 