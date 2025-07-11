const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class TestReporter {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.currentReportFile = path.join(this.reportsDir, 'current-test-report.json');
        this.previousReportFile = path.join(this.reportsDir, 'previous-test-report.json');
        this.scenarioResults = [];
        this.startTime = new Date();
        this.featureReports = new Map(); // Track individual feature reports
        this.verbose = true; // Enable detailed output
    }

    // Initialize reporter
    init() {
        console.log('📊 Test Reporter initialized');
        console.log(`📁 Reports directory: ${this.reportsDir}`);
        this.ensureReportsDirectory();
    }

    // Ensure reports directory exists
    ensureReportsDirectory() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
            console.log('📁 Created reports directory');
        } else {
            console.log('📁 Reports directory exists');
        }
    }

    // Record scenario result with detailed output
    recordScenario(scenarioName, status, duration = 0, error = null) {
        const result = {
            name: scenarioName,
            status: status, // 'PASS' or 'FAIL'
            duration: duration,
            error: error,
            timestamp: new Date().toISOString()
        };
        
        this.scenarioResults.push(result);
        
        const statusIcon = status === 'PASS' ? '✅' : '❌';
        const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;
        
        console.log(`${statusIcon} ${scenarioName} - ${status} (${durationStr})`);
        
        if (error && this.verbose) {
            console.log(`   ❌ Error: ${error.substring(0, 200)}${error.length > 200 ? '...' : ''}`);
        }
        
        return result;
    }

    // Create individual feature report with detailed output
    createFeatureReport(featureName, result) {
        const featureReportFile = path.join(this.reportsDir, `${featureName}-report.json`);
        
        console.log(`\n📄 Creating feature report for: ${featureName}`);
        console.log(`   📁 Report file: ${featureReportFile}`);
        
        const featureReport = {
            featureName: featureName,
            timestamp: new Date().toISOString(),
            status: result.status,
            duration: result.duration,
            error: result.error,
            summary: {
                status: result.status,
                duration: result.duration,
                success: result.status === 'PASS',
                stepCount: result.stepCount || 0,
                scenarioCount: result.scenarioCount || 0
            },
            details: {
                output: result.output,
                error: result.error,
                code: result.code,
                command: result.command || 'N/A'
            }
        };

        // Save feature report
        fs.writeFileSync(featureReportFile, JSON.stringify(featureReport, null, 2));
        
        // Track in memory
        this.featureReports.set(featureName, featureReport);
        
        console.log(`   ✅ Feature report saved: ${featureReportFile}`);
        console.log(`   📊 Summary: ${result.status} | ${result.duration}ms | ${result.scenarioCount || 0} scenarios | ${result.stepCount || 0} steps`);
        
        return featureReport;
    }

    // Update git with feature report with detailed output
    async updateGitWithFeatureReport(featureName) {
        const featureReportFile = path.join(this.reportsDir, `${featureName}-report.json`);
        
        if (fs.existsSync(featureReportFile)) {
            try {
                console.log(`   📝 Updating git with ${featureName} report...`);
                
                // Add to git
                await this.gitCommand(`add "${featureReportFile}"`);
                await this.gitCommand(`commit -m "Update test report: ${featureName} - ${new Date().toISOString()}"`);
                
                console.log(`   ✅ Git updated with ${featureName} report`);
            } catch (error) {
                console.log(`   ⚠️ Git update failed for ${featureName}: ${error.message}`);
            }
        } else {
            console.log(`   ⚠️ Report file not found: ${featureReportFile}`);
        }
    }

    // Git command helper
    async gitCommand(command) {
        return new Promise((resolve, reject) => {
            exec(`git ${command}`, {
                cwd: path.join(__dirname, '../../../')
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    // Generate current report with detailed output
    generateReport() {
        console.log('\n📊 Generating comprehensive test report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            startTime: this.startTime.toISOString(),
            endTime: new Date().toISOString(),
            totalScenarios: this.scenarioResults.length,
            passedScenarios: this.scenarioResults.filter(r => r.status === 'PASS').length,
            failedScenarios: this.scenarioResults.filter(r => r.status === 'FAIL').length,
            successRate: this.calculateSuccessRate(),
            scenarios: this.scenarioResults,
            featureReports: Array.from(this.featureReports.values()),
            summary: this.generateSummary()
        };

        console.log(`   📋 Total scenarios: ${report.totalScenarios}`);
        console.log(`   ✅ Passed: ${report.passedScenarios}`);
        console.log(`   ❌ Failed: ${report.failedScenarios}`);
        console.log(`   📊 Success rate: ${report.successRate}%`);

        return report;
    }

    // Calculate success rate
    calculateSuccessRate() {
        if (this.scenarioResults.length === 0) return 0;
        const passed = this.scenarioResults.filter(r => r.status === 'PASS').length;
        return ((passed / this.scenarioResults.length) * 100).toFixed(2);
    }

    // Generate summary with detailed output
    generateSummary() {
        const passed = this.scenarioResults.filter(r => r.status === 'PASS').length;
        const failed = this.scenarioResults.filter(r => r.status === 'FAIL').length;
        const total = this.scenarioResults.length;
        const successRate = this.calculateSuccessRate();

        const summary = {
            total: total,
            passed: passed,
            failed: failed,
            successRate: `${successRate}%`,
            status: failed === 0 ? 'ALL_PASSED' : failed > 0 && passed > 0 ? 'PARTIAL_SUCCESS' : 'ALL_FAILED'
        };

        console.log(`   🎯 Overall status: ${summary.status}`);
        console.log(`   📈 Success rate: ${summary.successRate}`);

        return summary;
    }

    // Save current report with detailed output
    saveCurrentReport() {
        console.log('\n💾 Saving current test report...');
        
        const report = this.generateReport();
        fs.writeFileSync(this.currentReportFile, JSON.stringify(report, null, 2));
        
        console.log(`   📄 Current test report saved: ${this.currentReportFile}`);
        console.log(`   📊 Report size: ${(JSON.stringify(report).length / 1024).toFixed(2)} KB`);
        
        return report;
    }

    // Load previous report
    loadPreviousReport() {
        if (fs.existsSync(this.previousReportFile)) {
            const data = fs.readFileSync(this.previousReportFile, 'utf8');
            console.log(`   📖 Loaded previous report: ${this.previousReportFile}`);
            return JSON.parse(data);
        }
        console.log(`   ⚠️ No previous report found: ${this.previousReportFile}`);
        return null;
    }

    // Archive current report as previous
    archiveCurrentAsPrevious() {
        if (fs.existsSync(this.currentReportFile)) {
            fs.copyFileSync(this.currentReportFile, this.previousReportFile);
            console.log(`   📋 Current report archived as previous: ${this.previousReportFile}`);
        } else {
            console.log(`   ⚠️ No current report to archive`);
        }
    }

    // Compare current with previous report
    compareWithPrevious() {
        console.log('\n🔍 Comparing with previous test run...');
        
        const current = this.loadCurrentReport();
        const previous = this.loadPreviousReport();

        if (!previous) {
            console.log('   📊 No previous report found for comparison');
            return null;
        }

        const comparison = {
            current: current,
            previous: previous,
            changes: this.calculateChanges(current, previous),
            improvements: this.identifyImprovements(current, previous),
            regressions: this.identifyRegressions(current, previous)
        };

        console.log(`   📊 Comparison completed`);
        console.log(`   🆕 New scenarios: ${comparison.changes.newScenarios.length}`);
        console.log(`   🗑️ Removed scenarios: ${comparison.changes.removedScenarios.length}`);
        console.log(`   🔄 Status changes: ${comparison.changes.statusChanges.length}`);
        console.log(`   🎉 Improvements: ${comparison.improvements.length}`);
        console.log(`   ⚠️ Regressions: ${comparison.regressions.length}`);

        return comparison;
    }

    // Load current report
    loadCurrentReport() {
        if (fs.existsSync(this.currentReportFile)) {
            const data = fs.readFileSync(this.currentReportFile, 'utf8');
            return JSON.parse(data);
        }
        return null;
    }

    // Calculate changes between reports
    calculateChanges(current, previous) {
        const currentScenarios = new Map(current.scenarios.map(s => [s.name, s]));
        const previousScenarios = new Map(previous.scenarios.map(s => [s.name, s]));

        const changes = {
            newScenarios: [],
            removedScenarios: [],
            statusChanges: [],
            unchanged: []
        };

        // Find new scenarios
        for (const [name, scenario] of currentScenarios) {
            if (!previousScenarios.has(name)) {
                changes.newScenarios.push(scenario);
            }
        }

        // Find removed scenarios
        for (const [name, scenario] of previousScenarios) {
            if (!currentScenarios.has(name)) {
                changes.removedScenarios.push(scenario);
            }
        }

        // Find status changes
        for (const [name, currentScenario] of currentScenarios) {
            const previousScenario = previousScenarios.get(name);
            if (previousScenario && currentScenario.status !== previousScenario.status) {
                changes.statusChanges.push({
                    name: name,
                    from: previousScenario.status,
                    to: currentScenario.status,
                    current: currentScenario,
                    previous: previousScenario
                });
            } else if (previousScenario) {
                changes.unchanged.push({
                    name: name,
                    status: currentScenario.status
                });
            }
        }

        return changes;
    }

    // Identify improvements
    identifyImprovements(current, previous) {
        const changes = this.calculateChanges(current, previous);
        return changes.statusChanges.filter(change => 
            change.from === 'FAIL' && change.to === 'PASS'
        );
    }

    // Identify regressions
    identifyRegressions(current, previous) {
        const changes = this.calculateChanges(current, previous);
        return changes.statusChanges.filter(change => 
            change.from === 'PASS' && change.to === 'FAIL'
        );
    }

    // Print comparison report with detailed output
    printComparison(comparison) {
        if (!comparison) {
            console.log('📊 No comparison data available');
            return;
        }

        console.log('\n📊 TEST REPORT COMPARISON');
        console.log('='.repeat(50));

        const current = comparison.current;
        const previous = comparison.previous;
        const changes = comparison.changes;

        console.log(`Current Run: ${current.timestamp}`);
        console.log(`Previous Run: ${previous.timestamp}`);
        console.log('');

        // Summary comparison
        console.log('📈 SUMMARY COMPARISON:');
        console.log(`Success Rate: ${previous.summary.successRate} → ${current.summary.successRate}`);
        console.log(`Total Scenarios: ${previous.summary.total} → ${current.summary.total}`);
        console.log(`Passed: ${previous.summary.passed} → ${current.summary.passed}`);
        console.log(`Failed: ${previous.summary.failed} → ${current.summary.failed}`);
        console.log('');

        // New scenarios
        if (changes.newScenarios.length > 0) {
            console.log('🆕 NEW SCENARIOS:');
            changes.newScenarios.forEach(scenario => {
                console.log(`  ${scenario.status === 'PASS' ? '✅' : '❌'} ${scenario.name}`);
            });
            console.log('');
        }

        // Removed scenarios
        if (changes.removedScenarios.length > 0) {
            console.log('🗑️ REMOVED SCENARIOS:');
            changes.removedScenarios.forEach(scenario => {
                console.log(`  ${scenario.name}`);
            });
            console.log('');
        }

        // Status changes
        if (changes.statusChanges.length > 0) {
            console.log('🔄 STATUS CHANGES:');
            changes.statusChanges.forEach(change => {
                const icon = change.to === 'PASS' ? '✅' : '❌';
                console.log(`  ${icon} ${change.name}: ${change.from} → ${change.to}`);
            });
            console.log('');
        }

        // Improvements
        if (comparison.improvements.length > 0) {
            console.log('🎉 IMPROVEMENTS:');
            comparison.improvements.forEach(improvement => {
                console.log(`  ✅ ${improvement.name}: FAIL → PASS`);
            });
            console.log('');
        }

        // Regressions
        if (comparison.regressions.length > 0) {
            console.log('⚠️ REGRESSIONS:');
            comparison.regressions.forEach(regression => {
                console.log(`  ❌ ${regression.name}: PASS → FAIL`);
            });
            console.log('');
        }

        // Overall assessment
        const improvementCount = comparison.improvements.length;
        const regressionCount = comparison.regressions.length;
        
        if (improvementCount > 0 || regressionCount > 0) {
            console.log('📋 OVERALL ASSESSMENT:');
            if (improvementCount > 0) {
                console.log(`  🎉 ${improvementCount} scenario(s) improved`);
            }
            if (regressionCount > 0) {
                console.log(`  ⚠️ ${regressionCount} scenario(s) regressed`);
            }
        }

        console.log('='.repeat(50));
    }

    // Wait for user input with detailed prompt
    async waitForUserInput() {
        console.log('\n⏳ Waiting for your opinion and next step...');
        console.log('📝 You can:');
        console.log('  - Press Enter to continue');
        console.log('  - Type "retry" to run tests again');
        console.log('  - Type "details" to see detailed reports');
        console.log('  - Type "compare" to see comparison details');
        console.log('  - Type your custom response:');
        
        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                const input = data.toString().trim();
                console.log(`📝 User input: "${input}"`);
                resolve(input);
            });
        });
    }

    // Complete test run with detailed output
    async completeTestRun() {
        console.log('\n📊 COMPLETING TEST RUN');
        console.log('='.repeat(50));

        // Save current report
        const currentReport = this.saveCurrentReport();

        // Archive current as previous
        this.archiveCurrentAsPrevious();

        // Update git with all feature reports
        console.log('\n📝 Updating git with feature reports...');
        for (const [featureName, report] of this.featureReports) {
            await this.updateGitWithFeatureReport(featureName);
        }

        // Compare with previous
        const comparison = this.compareWithPrevious();
        this.printComparison(comparison);

        // Wait for user input
        const userInput = await this.waitForUserInput();
        
        return {
            currentReport,
            comparison,
            userInput
        };
    }

    // Record feature result and create individual report with detailed output
    async recordFeatureResult(featureName, result) {
        console.log(`\n📊 Recording feature result: ${featureName}`);
        
        // Record in main results
        this.recordScenario(featureName, result.status, result.duration, result.error);
        
        // Create individual feature report
        const featureReport = this.createFeatureReport(featureName, result);
        
        // Update git with this feature report
        await this.updateGitWithFeatureReport(featureName);
        
        return featureReport;
    }
}

module.exports = TestReporter; 