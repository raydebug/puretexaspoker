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
    }

    // Initialize reporter
    init() {
        console.log('📊 Test Reporter initialized');
        this.ensureReportsDirectory();
    }

    // Ensure reports directory exists
    ensureReportsDirectory() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    // Record scenario result
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
        console.log(`${statusIcon} ${scenarioName} - ${status} (${duration}ms)`);
        
        return result;
    }

    // Create individual feature report
    createFeatureReport(featureName, result) {
        const featureReportFile = path.join(this.reportsDir, `${featureName}-report.json`);
        
        const featureReport = {
            featureName: featureName,
            timestamp: new Date().toISOString(),
            status: result.status,
            duration: result.duration,
            error: result.error,
            summary: {
                status: result.status,
                duration: result.duration,
                success: result.status === 'PASS'
            },
            details: {
                output: result.output,
                error: result.error,
                code: result.code
            }
        };

        // Save feature report
        fs.writeFileSync(featureReportFile, JSON.stringify(featureReport, null, 2));
        
        // Track in memory
        this.featureReports.set(featureName, featureReport);
        
        console.log(`📄 Feature report saved: ${featureReportFile}`);
        
        return featureReport;
    }

    // Update git with feature report
    async updateGitWithFeatureReport(featureName) {
        const featureReportFile = path.join(this.reportsDir, `${featureName}-report.json`);
        
        if (fs.existsSync(featureReportFile)) {
            try {
                // Add to git
                await this.gitCommand(`add "${featureReportFile}"`);
                await this.gitCommand(`commit -m "Update test report: ${featureName} - ${new Date().toISOString()}"`);
                console.log(`📝 Git updated with ${featureName} report`);
            } catch (error) {
                console.log(`⚠️ Git update failed for ${featureName}: ${error.message}`);
            }
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

    // Generate current report
    generateReport() {
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

        return report;
    }

    // Calculate success rate
    calculateSuccessRate() {
        if (this.scenarioResults.length === 0) return 0;
        const passed = this.scenarioResults.filter(r => r.status === 'PASS').length;
        return ((passed / this.scenarioResults.length) * 100).toFixed(2);
    }

    // Generate summary
    generateSummary() {
        const passed = this.scenarioResults.filter(r => r.status === 'PASS').length;
        const failed = this.scenarioResults.filter(r => r.status === 'FAIL').length;
        const total = this.scenarioResults.length;
        const successRate = this.calculateSuccessRate();

        return {
            total: total,
            passed: passed,
            failed: failed,
            successRate: `${successRate}%`,
            status: failed === 0 ? 'ALL_PASSED' : failed > 0 && passed > 0 ? 'PARTIAL_SUCCESS' : 'ALL_FAILED'
        };
    }

    // Save current report
    saveCurrentReport() {
        const report = this.generateReport();
        fs.writeFileSync(this.currentReportFile, JSON.stringify(report, null, 2));
        console.log('📄 Current test report saved');
        return report;
    }

    // Load previous report
    loadPreviousReport() {
        if (fs.existsSync(this.previousReportFile)) {
            const data = fs.readFileSync(this.previousReportFile, 'utf8');
            return JSON.parse(data);
        }
        return null;
    }

    // Archive current report as previous
    archiveCurrentAsPrevious() {
        if (fs.existsSync(this.currentReportFile)) {
            fs.copyFileSync(this.currentReportFile, this.previousReportFile);
            console.log('📋 Current report archived as previous');
        }
    }

    // Compare current with previous report
    compareWithPrevious() {
        const current = this.loadCurrentReport();
        const previous = this.loadPreviousReport();

        if (!previous) {
            console.log('📊 No previous report found for comparison');
            return null;
        }

        const comparison = {
            current: current,
            previous: previous,
            changes: this.calculateChanges(current, previous),
            improvements: this.identifyImprovements(current, previous),
            regressions: this.identifyRegressions(current, previous)
        };

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

    // Print comparison report
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

    // Wait for user input
    async waitForUserInput() {
        console.log('\n⏳ Waiting for your opinion and next step...');
        console.log('Press Enter to continue or type your response:');
        
        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                const input = data.toString().trim();
                resolve(input);
            });
        });
    }

    // Complete test run
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

    // Record feature result and create individual report
    async recordFeatureResult(featureName, result) {
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