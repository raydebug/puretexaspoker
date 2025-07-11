const { exec } = require('child_process');
const path = require('path');
const TestReporter = require('./testReporter');

class TestRunner {
    constructor() {
        this.reporter = new TestReporter();
        this.featuresDir = path.join(__dirname, '../features');
        this.stepDefinitionsDir = path.join(__dirname, '../step_definitions');
    }

    // Initialize test runner
    init() {
        this.reporter.init();
        console.log('🚀 Test Runner initialized');
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

    // Run single feature file
    async runFeature(featurePath) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const featureName = path.basename(featurePath, '.feature');
            
            console.log(`\n🧪 Running feature: ${featureName}`);
            
            const command = `MULTI_BROWSER_TEST=true npx cucumber-js --require ${this.stepDefinitionsDir}/**/*.js ${featurePath}`;
            
            const child = exec(command, {
                cwd: path.join(__dirname, '../../'),
                env: { ...process.env, MULTI_BROWSER_TEST: 'true' }
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data;
                process.stdout.write(data);
            });

            child.stderr.on('data', (data) => {
                errorOutput += data;
                process.stderr.write(data);
            });

            child.on('close', async (code) => {
                const duration = Date.now() - startTime;
                const status = code === 0 ? 'PASS' : 'FAIL';
                const error = code !== 0 ? errorOutput || 'Unknown error' : null;
                
                const result = { featureName, status, duration, code, output, error };
                
                // Record feature result with individual report
                await this.reporter.recordFeatureResult(featureName, result);
                
                resolve(result);
            });

            child.on('error', async (error) => {
                const duration = Date.now() - startTime;
                const result = { featureName, status: 'FAIL', duration, error: error.message };
                
                // Record feature result with individual report
                await this.reporter.recordFeatureResult(featureName, result);
                
                reject(result);
            });
        });
    }

    // Run all features
    async runAllFeatures() {
        const features = this.getFeatureFiles();
        console.log(`\n📋 Found ${features.length} feature files to test`);
        
        const results = [];
        
        for (const feature of features) {
            try {
                const result = await this.runFeature(feature);
                results.push(result);
            } catch (error) {
                console.error(`❌ Error running feature: ${error}`);
                results.push(error);
            }
        }
        
        return results;
    }

    // Run specific features by pattern
    async runFeaturesByPattern(pattern) {
        const features = this.getFeatureFiles();
        const matchingFeatures = features.filter(feature => 
            path.basename(feature).includes(pattern)
        );
        
        console.log(`\n📋 Found ${matchingFeatures.length} features matching pattern: ${pattern}`);
        
        const results = [];
        
        for (const feature of matchingFeatures) {
            try {
                const result = await this.runFeature(feature);
                results.push(result);
            } catch (error) {
                console.error(`❌ Error running feature: ${error}`);
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
        
        this.init();
        
        const results = [];
        
        for (const featureName of quickFeatures) {
            const featurePath = path.join(this.featuresDir, featureName);
            if (require('fs').existsSync(featurePath)) {
                try {
                    const result = await this.runFeature(featurePath);
                    results.push(result);
                } catch (error) {
                    console.error(`❌ Error running feature: ${error}`);
                    results.push(error);
                }
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
        
        return await this.runTests({ pattern });
    }
}

module.exports = TestRunner; 