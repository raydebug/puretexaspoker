const { exec } = require('child_process');
const path = require('path');
const TestReporter = require('./testReporter');

class TestRunner {
    constructor() {
        this.reporter = new TestReporter();
        this.featuresDir = path.join(__dirname, '../features');
        this.stepDefinitionsDir = path.join(__dirname, '../step_definitions');
        this.verbose = true; // Enable detailed output
    }

    // Initialize test runner
    init() {
        this.reporter.init();
        console.log('🚀 Test Runner initialized');
        console.log(`📁 Features directory: ${this.featuresDir}`);
        console.log(`📁 Step definitions: ${this.stepDefinitionsDir}`);
    }

    // Get all feature files
    getFeatureFiles() {
        const fs = require('fs');
        const features = [];
        
        if (fs.existsSync(this.featuresDir)) {
            const files = fs.readdirSync(this.featuresDir);
            files.forEach(file => {
                if (file.endsWith('.feature')) {
                    features.push(path.join(this.featuresDir, file));
                }
            });
        }
        
        return features;
    }

    // Run single feature file with detailed output
    async runFeature(featurePath) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const featureName = path.basename(featurePath, '.feature');
            
            console.log(`\n🧪 Running feature: ${featureName}`);
            console.log(`📄 Feature file: ${featurePath}`);
            console.log(`⏰ Start time: ${new Date().toISOString()}`);
            
            const command = `MULTI_BROWSER_TEST=true npx cucumber-js --require ${this.stepDefinitionsDir}/**/*.js ${featurePath} --format progress --format json:${path.join(__dirname, '../reports', `${featureName}-cucumber-report.json`)}`;
            
            console.log(`🔧 Command: ${command}`);
            
            const child = exec(command, {
                cwd: path.join(__dirname, '../../'),
                env: { ...process.env, MULTI_BROWSER_TEST: 'true' }
            });

            let output = '';
            let errorOutput = '';
            let stepCount = 0;
            let scenarioCount = 0;

            child.stdout.on('data', (data) => {
                output += data;
                
                // Parse and log detailed progress
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        if (line.includes('Scenario:')) {
                            scenarioCount++;
                            console.log(`📋 Scenario ${scenarioCount}: ${line.trim()}`);
                        } else if (line.includes('Given') || line.includes('When') || line.includes('Then') || line.includes('And') || line.includes('But')) {
                            stepCount++;
                            console.log(`  ${stepCount}. ${line.trim()}`);
                        } else if (line.includes('✓') || line.includes('✗')) {
                            console.log(`    ${line.trim()}`);
                        } else if (line.includes('PASS') || line.includes('FAIL')) {
                            console.log(`🎯 ${line.trim()}`);
                        } else if (line.includes('Error:') || line.includes('Exception:')) {
                            console.log(`❌ ${line.trim()}`);
                        } else if (line.includes('Warning:') || line.includes('Deprecation:')) {
                            console.log(`⚠️ ${line.trim()}`);
                        } else if (line.includes('INFO:') || line.includes('DEBUG:')) {
                            console.log(`ℹ️ ${line.trim()}`);
                        } else {
                            // Only show non-empty lines
                            if (line.trim() && !line.includes('node_modules') && !line.includes('npm')) {
                                console.log(`   ${line.trim()}`);
                            }
                        }
                    }
                });
            });

            child.stderr.on('data', (data) => {
                errorOutput += data;
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        console.log(`🚨 ${line.trim()}`);
                    }
                });
            });

            child.on('close', async (code) => {
                const duration = Date.now() - startTime;
                const status = code === 0 ? 'PASS' : 'FAIL';
                const error = code !== 0 ? errorOutput || 'Unknown error' : null;
                
                console.log(`\n📊 Feature Summary: ${featureName}`);
                console.log(`⏱️ Duration: ${duration}ms`);
                console.log(`📋 Scenarios: ${scenarioCount}`);
                console.log(`👣 Steps: ${stepCount}`);
                console.log(`🎯 Status: ${status}`);
                console.log(`🔢 Exit Code: ${code}`);
                
                if (error) {
                    console.log(`❌ Error Details:`);
                    console.log(error);
                }
                
                const result = { featureName, status, duration, code, output, error, stepCount, scenarioCount };
                
                // Record feature result with individual report
                await this.reporter.recordFeatureResult(featureName, result);
                
                resolve(result);
            });

            child.on('error', async (error) => {
                const duration = Date.now() - startTime;
                console.log(`\n💥 Feature failed to start: ${featureName}`);
                console.log(`⏱️ Duration: ${duration}ms`);
                console.log(`❌ Error: ${error.message}`);
                
                const result = { featureName, status: 'FAIL', duration, error: error.message };
                
                // Record feature result with individual report
                await this.reporter.recordFeatureResult(featureName, result);
                
                reject(result);
            });
        });
    }

    // Run all features with detailed summary
    async runAllFeatures() {
        const features = this.getFeatureFiles();
        console.log(`\n📋 Found ${features.length} feature files to test`);
        console.log('📄 Feature files:');
        features.forEach((feature, index) => {
            console.log(`  ${index + 1}. ${path.basename(feature)}`);
        });
        
        const results = [];
        let totalDuration = 0;
        let totalScenarios = 0;
        let totalSteps = 0;
        let passedFeatures = 0;
        let failedFeatures = 0;
        
        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🧪 Feature ${i + 1}/${features.length}: ${path.basename(feature)}`);
            console.log(`${'='.repeat(60)}`);
            
            try {
                const result = await this.runFeature(feature);
                results.push(result);
                
                totalDuration += result.duration;
                totalScenarios += result.scenarioCount || 0;
                totalSteps += result.stepCount || 0;
                
                if (result.status === 'PASS') {
                    passedFeatures++;
                } else {
                    failedFeatures++;
                }
                
                console.log(`✅ Feature ${i + 1} completed: ${result.status}`);
                
            } catch (error) {
                console.error(`❌ Feature ${i + 1} failed: ${error}`);
                results.push(error);
                failedFeatures++;
                totalDuration += error.duration || 0;
            }
        }
        
        // Print comprehensive summary
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 COMPREHENSIVE TEST SUMMARY');
        console.log(`${'='.repeat(60)}`);
        console.log(`📋 Total Features: ${features.length}`);
        console.log(`✅ Passed Features: ${passedFeatures}`);
        console.log(`❌ Failed Features: ${failedFeatures}`);
        console.log(`📊 Success Rate: ${((passedFeatures / features.length) * 100).toFixed(2)}%`);
        console.log(`⏱️ Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
        console.log(`📋 Total Scenarios: ${totalScenarios}`);
        console.log(`👣 Total Steps: ${totalSteps}`);
        
        return results;
    }

    // Run specific features by pattern
    async runFeaturesByPattern(pattern) {
        const features = this.getFeatureFiles();
        const matchingFeatures = features.filter(feature => 
            path.basename(feature).includes(pattern)
        );
        
        console.log(`\n📋 Found ${matchingFeatures.length} features matching pattern: "${pattern}"`);
        console.log('📄 Matching features:');
        matchingFeatures.forEach((feature, index) => {
            console.log(`  ${index + 1}. ${path.basename(feature)}`);
        });
        
        const results = [];
        
        for (let i = 0; i < matchingFeatures.length; i++) {
            const feature = matchingFeatures[i];
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🧪 Matching Feature ${i + 1}/${matchingFeatures.length}: ${path.basename(feature)}`);
            console.log(`${'='.repeat(60)}`);
            
            try {
                const result = await this.runFeature(feature);
                results.push(result);
                console.log(`✅ Matching feature ${i + 1} completed: ${result.status}`);
            } catch (error) {
                console.error(`❌ Matching feature ${i + 1} failed: ${error}`);
                results.push(error);
            }
        }
        
        return results;
    }

    // Run tests with reporting
    async runTests(options = {}) {
        this.init();
        
        console.log('\n🎯 STARTING TEST RUN');
        console.log('='.repeat(50));
        console.log(`📁 Working Directory: ${process.cwd()}`);
        console.log(`🔧 Environment: MULTI_BROWSER_TEST=true`);
        console.log(`📊 Verbose Mode: ${this.verbose ? 'Enabled' : 'Disabled'}`);
        
        let results;
        
        if (options.pattern) {
            results = await this.runFeaturesByPattern(options.pattern);
        } else {
            results = await this.runAllFeatures();
        }
        
        console.log('\n📊 TEST RUN COMPLETED');
        console.log('='.repeat(50));
        
        // Complete test run with reporter
        const reportResult = await this.reporter.completeTestRun();
        
        return {
            results,
            report: reportResult
        };
    }

    // Run quick test (subset of features)
    async runQuickTest() {
        const quickFeatures = [
            'login-join-take-seats.feature',
            'debug-action-buttons.feature'
        ];
        
        console.log('\n⚡ RUNNING QUICK TEST');
        console.log('='.repeat(50));
        console.log('📋 Quick test features:');
        quickFeatures.forEach((feature, index) => {
            console.log(`  ${index + 1}. ${feature}`);
        });
        
        this.init();
        
        const results = [];
        
        for (let i = 0; i < quickFeatures.length; i++) {
            const featureName = quickFeatures[i];
            const featurePath = path.join(this.featuresDir, featureName);
            
            console.log(`\n${'='.repeat(60)}`);
            console.log(`⚡ Quick Test ${i + 1}/${quickFeatures.length}: ${featureName}`);
            console.log(`${'='.repeat(60)}`);
            
            if (require('fs').existsSync(featurePath)) {
                try {
                    const result = await this.runFeature(featurePath);
                    results.push(result);
                    console.log(`✅ Quick test ${i + 1} completed: ${result.status}`);
                } catch (error) {
                    console.error(`❌ Quick test ${i + 1} failed: ${error}`);
                    results.push(error);
                }
            } else {
                console.log(`⚠️ Feature file not found: ${featurePath}`);
            }
        }
        
        console.log('\n📊 QUICK TEST COMPLETED');
        console.log('='.repeat(50));
        
        const reportResult = await this.reporter.completeTestRun();
        
        return {
            results,
            report: reportResult
        };
    }

    // Run comprehensive test (all features)
    async runComprehensiveTest() {
        console.log('\n🔍 RUNNING COMPREHENSIVE TEST');
        console.log('='.repeat(50));
        
        return await this.runTests();
    }

    // Run specific test categories
    async runCategoryTest(category) {
        const categoryPatterns = {
            'game': ['game', 'poker', 'player'],
            'ui': ['debug', 'action', 'button'],
            'auth': ['login', 'join', 'seat'],
            'multiplayer': ['multi', 'player', 'seat'],
            'timeout': ['timeout', 'decision'],
            'action': ['action', 'history', 'betting']
        };
        
        const patterns = categoryPatterns[category] || [category];
        const pattern = patterns.join('|');
        
        console.log(`\n🎯 RUNNING ${category.toUpperCase()} TESTS`);
        console.log('='.repeat(50));
        console.log(`🔍 Category patterns: ${patterns.join(', ')}`);
        console.log(`📋 Combined pattern: ${pattern}`);
        
        return await this.runTests({ pattern });
    }
}

module.exports = TestRunner; 