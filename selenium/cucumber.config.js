module.exports = {
  default: {
    require: [
      'selenium/step_definitions/**/*.ts'
    ],
    format: [
      '@cucumber/pretty-formatter',
      'json:selenium/reports/cucumber-report.json'
    ],
    requireModule: [
      'ts-node/register'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true,
    dryRun: false,
    failFast: false,
    strict: true,
    worldParameters: {
      browser: process.env.BROWSER || 'chrome',
      headless: process.env.HEADLESS === 'true',
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      apiUrl: process.env.API_URL || 'http://localhost:3001'
    }
  }
} 