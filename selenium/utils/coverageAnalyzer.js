const fs = require('fs');
const path = require('path');

class CoverageAnalyzer {
  constructor() {
    this.testCoverage = new Map();
    this.duplicateCoverage = new Map();
    this.backendEndpoints = new Set();
    this.frontendComponents = new Set();
    this.featureAreas = new Set();
    this.socketEvents = new Set();
    this.reportPath = path.join(__dirname, '../reports');
  }

  // Initialize coverage tracking
  initializeTracking() {
    console.log('🔍 Initializing code coverage analysis...');
    this.scanBackendEndpoints();
    this.scanFrontendComponents();
    this.scanSocketEvents();
    this.scanFeatureFiles();
  }

  // Scan backend API endpoints
  scanBackendEndpoints() {
    const routesPath = path.join(__dirname, '../../backend/src/routes');
    if (fs.existsSync(routesPath)) {
      const routeFiles = fs.readdirSync(routesPath).filter(f => f.endsWith('.ts'));
      routeFiles.forEach(file => {
        const content = fs.readFileSync(path.join(routesPath, file), 'utf8');
        const routeMatches = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
        if (routeMatches) {
          routeMatches.forEach(match => {
            const endpoint = match.match(/['"`]([^'"`]+)['"`]/)[1];
            this.backendEndpoints.add(`${file.replace('.ts', '')}:${endpoint}`);
          });
        }
      });
    }
  }

  // Scan frontend components
  scanFrontendComponents() {
    const componentsPath = path.join(__dirname, '../../frontend/src/components');
    if (fs.existsSync(componentsPath)) {
      this.scanComponentsRecursively(componentsPath);
    }
  }

  scanComponentsRecursively(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        this.scanComponentsRecursively(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        const relativePath = path.relative(path.join(__dirname, '../../frontend/src'), fullPath);
        this.frontendComponents.add(relativePath);
      }
    });
  }

  // Scan socket events
  scanSocketEvents() {
    const handlersPath = path.join(__dirname, '../../backend/src/socketHandlers');
    if (fs.existsSync(handlersPath)) {
      const handlerFiles = fs.readdirSync(handlersPath).filter(f => f.endsWith('.ts'));
      handlerFiles.forEach(file => {
        const content = fs.readFileSync(path.join(handlersPath, file), 'utf8');
        const eventMatches = content.match(/socket\.on\s*\(\s*['"`]([^'"`]+)['"`]/g);
        if (eventMatches) {
          eventMatches.forEach(match => {
            const event = match.match(/['"`]([^'"`]+)['"`]/)[1];
            this.socketEvents.add(event);
          });
        }
      });
    }
  }

  // Scan feature files to understand test scope
  scanFeatureFiles() {
    const featuresPath = path.join(__dirname, '../features');
    if (fs.existsSync(featuresPath)) {
      const featureFiles = fs.readdirSync(featuresPath).filter(f => f.endsWith('.feature'));
      featureFiles.forEach(file => {
        const content = fs.readFileSync(path.join(featuresPath, file), 'utf8');
        const featureMatch = content.match(/Feature:\s*(.+)/);
        if (featureMatch) {
          this.featureAreas.add(featureMatch[1].trim());
        }
      });
    }
  }

  // Analyze step definitions to track what code they test
  analyzeStepDefinitions() {
    console.log('📊 Analyzing step definitions for code coverage...');
    const stepsPath = path.join(__dirname, '../step_definitions');
    const stepFiles = fs.readdirSync(stepsPath).filter(f => f.endsWith('.js'));

    stepFiles.forEach(file => {
      const content = fs.readFileSync(path.join(stepsPath, file), 'utf8');
      const coverage = this.extractCoverageFromSteps(content, file);
      this.testCoverage.set(file, coverage);
    });
  }

  // Extract what code areas are covered by step definitions
  extractCoverageFromSteps(content, fileName) {
    const coverage = {
      apiEndpoints: new Set(),
      components: new Set(),
      socketEvents: new Set(),
      features: new Set(),
      stepCount: 0
    };

    // Count step definitions
    const stepMatches = content.match(/(Given|When|Then)\s*\(/g);
    coverage.stepCount = stepMatches ? stepMatches.length : 0;

    // Extract API calls
    const apiMatches = content.match(/makeApiCall\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (apiMatches) {
      apiMatches.forEach(match => {
        const endpoint = match.match(/['"`]([^'"`]+)['"`]/)[1];
        coverage.apiEndpoints.add(endpoint);
      });
    }

    // Extract component selectors
    const selectorMatches = content.match(/\$\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (selectorMatches) {
      selectorMatches.forEach(match => {
        const selector = match.match(/['"`]([^'"`]+)['"`]/)[1];
        if (selector.includes('data-testid') || selector.includes('class') || selector.includes('#')) {
          coverage.components.add(selector);
        }
      });
    }

    // Extract socket events
    const socketMatches = content.match(/emit\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (socketMatches) {
      socketMatches.forEach(match => {
        const event = match.match(/['"`]([^'"`]+)['"`]/)[1];
        coverage.socketEvents.add(event);
      });
    }

    return coverage;
  }

  // Analyze duplicate coverage between tests
  analyzeDuplicateCoverage() {
    console.log('🔄 Analyzing duplicate test coverage...');
    const coverageMap = new Map();

    // Group tests by what they cover
    this.testCoverage.forEach((coverage, testFile) => {
      coverage.apiEndpoints.forEach(endpoint => {
        const key = `api:${endpoint}`;
        if (!coverageMap.has(key)) {
          coverageMap.set(key, new Set());
        }
        coverageMap.get(key).add(testFile);
      });

      coverage.socketEvents.forEach(event => {
        const key = `socket:${event}`;
        if (!coverageMap.has(key)) {
          coverageMap.set(key, new Set());
        }
        coverageMap.get(key).add(testFile);
      });

      coverage.components.forEach(component => {
        const key = `component:${component}`;
        if (!coverageMap.has(key)) {
          coverageMap.set(key, new Set());
        }
        coverageMap.get(key).add(testFile);
      });
    });

    // Identify duplicates
    coverageMap.forEach((testFiles, codeArea) => {
      if (testFiles.size > 1) {
        this.duplicateCoverage.set(codeArea, Array.from(testFiles));
      }
    });
  }

  // Calculate coverage percentages
  calculateCoveragePercentages() {
    const coveredEndpoints = new Set();
    const coveredSocketEvents = new Set();
    const coveredComponents = new Set();

    this.testCoverage.forEach(coverage => {
      coverage.apiEndpoints.forEach(endpoint => coveredEndpoints.add(endpoint));
      coverage.socketEvents.forEach(event => coveredSocketEvents.add(event));
      coverage.components.forEach(component => coveredComponents.add(component));
    });

    return {
      apiEndpoints: {
        total: this.backendEndpoints.size,
        covered: coveredEndpoints.size,
        percentage: this.backendEndpoints.size > 0 ? 
          Math.round((coveredEndpoints.size / this.backendEndpoints.size) * 100) : 0
      },
      socketEvents: {
        total: this.socketEvents.size,
        covered: coveredSocketEvents.size,
        percentage: this.socketEvents.size > 0 ? 
          Math.round((coveredSocketEvents.size / this.socketEvents.size) * 100) : 0
      },
      components: {
        total: this.frontendComponents.size,
        covered: coveredComponents.size,
        percentage: this.frontendComponents.size > 0 ? 
          Math.round((coveredComponents.size / this.frontendComponents.size) * 100) : 0
      }
    };
  }

  // Generate comprehensive coverage report
  generateCoverageReport() {
    console.log('📋 Generating coverage report...');
    
    const coveragePercentages = this.calculateCoveragePercentages();
    const timestamp = new Date().toISOString();
    
    const report = {
      timestamp,
      summary: {
        totalStepFiles: this.testCoverage.size,
        totalSteps: Array.from(this.testCoverage.values())
          .reduce((sum, coverage) => sum + coverage.stepCount, 0),
        coverage: coveragePercentages,
        duplicateAreas: this.duplicateCoverage.size
      },
      detailedCoverage: {},
      duplicateCoverage: {},
      uncoveredAreas: this.findUncoveredAreas(coveragePercentages),
      recommendations: this.generateRecommendations()
    };

    // Add detailed coverage for each test file
    this.testCoverage.forEach((coverage, testFile) => {
      report.detailedCoverage[testFile] = {
        stepCount: coverage.stepCount,
        apiEndpoints: Array.from(coverage.apiEndpoints),
        socketEvents: Array.from(coverage.socketEvents),
        components: Array.from(coverage.components)
      };
    });

    // Add duplicate coverage details
    this.duplicateCoverage.forEach((testFiles, codeArea) => {
      report.duplicateCoverage[codeArea] = testFiles;
    });

    return report;
  }

  // Find uncovered code areas
  findUncoveredAreas(coveragePercentages) {
    const coveredEndpoints = new Set();
    const coveredSocketEvents = new Set();

    this.testCoverage.forEach(coverage => {
      coverage.apiEndpoints.forEach(endpoint => coveredEndpoints.add(endpoint));
      coverage.socketEvents.forEach(event => coveredSocketEvents.add(event));
    });

    return {
      uncoveredEndpoints: Array.from(this.backendEndpoints)
        .filter(endpoint => !Array.from(coveredEndpoints).some(covered => 
          endpoint.includes(covered) || covered.includes(endpoint))),
      uncoveredSocketEvents: Array.from(this.socketEvents)
        .filter(event => !coveredSocketEvents.has(event))
    };
  }

  // Generate recommendations for improving coverage
  generateRecommendations() {
    const recommendations = [];

    if (this.duplicateCoverage.size > 0) {
      recommendations.push({
        type: 'duplicate_reduction',
        message: `Found ${this.duplicateCoverage.size} areas with duplicate test coverage. Consider consolidating tests.`,
        priority: 'medium'
      });
    }

    const coveragePercentages = this.calculateCoveragePercentages();
    
    if (coveragePercentages.apiEndpoints.percentage < 80) {
      recommendations.push({
        type: 'api_coverage',
        message: `API endpoint coverage is ${coveragePercentages.apiEndpoints.percentage}%. Consider adding more endpoint tests.`,
        priority: 'high'
      });
    }

    if (coveragePercentages.socketEvents.percentage < 70) {
      recommendations.push({
        type: 'socket_coverage',
        message: `Socket event coverage is ${coveragePercentages.socketEvents.percentage}%. Consider adding more real-time feature tests.`,
        priority: 'high'
      });
    }

    return recommendations;
  }

  // Save report to file
  saveReport(report) {
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }

    const reportFile = path.join(this.reportPath, `coverage-report-${Date.now()}.json`);
    const summaryFile = path.join(this.reportPath, 'latest-coverage-summary.json');
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    fs.writeFileSync(summaryFile, JSON.stringify(report.summary, null, 2));
    
    console.log(`📊 Coverage report saved to: ${reportFile}`);
    return reportFile;
  }

  // Print summary to console
  printSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 SELENIUM TEST COVERAGE ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`📅 Analysis Time: ${report.timestamp}`);
    console.log(`📁 Total Step Files: ${report.summary.totalStepFiles}`);
    console.log(`🎯 Total Steps: ${report.summary.totalSteps}`);
    
    console.log('\n📊 COVERAGE PERCENTAGES:');
    console.log(`   API Endpoints: ${report.summary.coverage.apiEndpoints.percentage}% (${report.summary.coverage.apiEndpoints.covered}/${report.summary.coverage.apiEndpoints.total})`);
    console.log(`   Socket Events: ${report.summary.coverage.socketEvents.percentage}% (${report.summary.coverage.socketEvents.covered}/${report.summary.coverage.socketEvents.total})`);
    console.log(`   Components: ${report.summary.coverage.components.percentage}% (${report.summary.coverage.components.covered}/${report.summary.coverage.components.total})`);
    
    if (report.summary.duplicateAreas > 0) {
      console.log(`\n🔄 DUPLICATE COVERAGE: ${report.summary.duplicateAreas} areas have overlapping tests`);
      
      Object.entries(report.duplicateCoverage).slice(0, 5).forEach(([area, files]) => {
        console.log(`   ${area}: tested by ${files.length} files (${files.join(', ')})`);
      });
      
      if (Object.keys(report.duplicateCoverage).length > 5) {
        console.log(`   ... and ${Object.keys(report.duplicateCoverage).length - 5} more`);
      }
    }
    
    if (report.uncoveredAreas.uncoveredEndpoints.length > 0) {
      console.log(`\n❌ UNCOVERED ENDPOINTS (${report.uncoveredAreas.uncoveredEndpoints.length}):`);
      report.uncoveredAreas.uncoveredEndpoints.slice(0, 5).forEach(endpoint => {
        console.log(`   ${endpoint}`);
      });
      if (report.uncoveredAreas.uncoveredEndpoints.length > 5) {
        console.log(`   ... and ${report.uncoveredAreas.uncoveredEndpoints.length - 5} more`);
      }
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`   [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }

  // Main analysis method
  async analyze() {
    console.log('🚀 Starting comprehensive code coverage analysis...');
    
    this.initializeTracking();
    this.analyzeStepDefinitions();
    this.analyzeDuplicateCoverage();
    
    const report = this.generateCoverageReport();
    const reportFile = this.saveReport(report);
    this.printSummary(report);
    
    return { report, reportFile };
  }
}

module.exports = CoverageAnalyzer; 