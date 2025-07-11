#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class TestReportInitializer {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.projectRoot = path.join(__dirname, '../../../');
    }

    // Initialize test reports directory and git tracking
    async init() {
        console.log('📊 Initializing Test Reports System');
        console.log('='.repeat(50));

        // Ensure reports directory exists
        this.ensureReportsDirectory();

        // Create .gitkeep to ensure directory is tracked
        await this.createGitKeep();

        // Add reports directory to git
        await this.addReportsToGit();

        // Create initial README for reports
        await this.createReportsReadme();

        console.log('✅ Test reports system initialized successfully');
    }

    // Ensure reports directory exists
    ensureReportsDirectory() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
            console.log('📁 Created reports directory');
        } else {
            console.log('📁 Reports directory already exists');
        }
    }

    // Create .gitkeep file
    async createGitKeep() {
        const gitkeepFile = path.join(this.reportsDir, '.gitkeep');
        if (!fs.existsSync(gitkeepFile)) {
            fs.writeFileSync(gitkeepFile, '# This file ensures the reports directory is tracked by git\n');
            console.log('📄 Created .gitkeep file');
        }
    }

    // Add reports directory to git
    async addReportsToGit() {
        try {
            await this.gitCommand('add selenium/reports/');
            await this.gitCommand('commit -m "Initialize test reports directory"');
            console.log('📝 Added reports directory to git');
        } catch (error) {
            console.log('⚠️ Git operation failed (may already be tracked):', error.message);
        }
    }

    // Create README for reports directory
    async createReportsReadme() {
        const readmeFile = path.join(this.reportsDir, 'README.md');
        const readmeContent = `# Test Reports

This directory contains individual test reports for each cucumber feature file.

## Report Files

Each feature file generates a corresponding report file:
- \`{feature-name}-report.json\` - Individual feature test results
- \`current-test-report.json\` - Current test run summary
- \`previous-test-report.json\` - Previous test run summary

## Report Structure

Each feature report contains:
- Feature name and timestamp
- Test status (PASS/FAIL)
- Duration and error details
- Summary statistics

## Git Integration

All report files are automatically:
1. Generated after each test run
2. Added to git repository
3. Committed with descriptive messages
4. Available for comparison between runs

## Usage

Reports are automatically generated when running tests with:
\`\`\`bash
node selenium/run-tests-with-reporting.js [command]
\`\`\`

The system will:
- Track each scenario's pass/fail status
- Generate detailed reports
- Compare with previous test runs
- Wait for user input after completion
`;

        if (!fs.existsSync(readmeFile)) {
            fs.writeFileSync(readmeFile, readmeContent);
            console.log('📖 Created reports README');
        }
    }

    // Git command helper
    async gitCommand(command) {
        return new Promise((resolve, reject) => {
            exec(`git ${command}`, {
                cwd: this.projectRoot
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    // List existing reports
    listExistingReports() {
        if (!fs.existsSync(this.reportsDir)) {
            console.log('📁 No reports directory found');
            return [];
        }

        const files = fs.readdirSync(this.reportsDir);
        const reports = files.filter(file => file.endsWith('-report.json'));
        
        console.log(`\n📋 Found ${reports.length} existing test reports:`);
        reports.forEach(report => {
            console.log(`  - ${report}`);
        });

        return reports;
    }

    // Clean old reports (optional)
    async cleanOldReports() {
        const files = fs.readdirSync(this.reportsDir);
        const oldReports = files.filter(file => 
            file.endsWith('-report.json') && 
            !file.includes('current') && 
            !file.includes('previous')
        );

        if (oldReports.length > 0) {
            console.log(`\n🗑️ Found ${oldReports.length} old reports to clean`);
            for (const report of oldReports) {
                const reportPath = path.join(this.reportsDir, report);
                fs.unlinkSync(reportPath);
                console.log(`  - Removed ${report}`);
            }
        }
    }
}

// Main execution
async function main() {
    const initializer = new TestReportInitializer();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'init';

    try {
        switch (command) {
            case 'init':
                await initializer.init();
                break;
                
            case 'list':
                initializer.listExistingReports();
                break;
                
            case 'clean':
                await initializer.cleanOldReports();
                break;
                
            case 'help':
            default:
                console.log(`
📊 Test Reports Initializer

Usage: node initTestReports.js [command]

Commands:
  init    Initialize test reports system (default)
  list    List existing test reports
  clean   Clean old test reports
  help    Show this help

Examples:
  node initTestReports.js init
  node initTestReports.js list
  node initTestReports.js clean
                `);
                break;
        }
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}

// Run the main function
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = TestReportInitializer; 