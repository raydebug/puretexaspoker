module.exports = {
  default: {
    timeout: 300000, // 5 minutes total timeout per scenario
    retry: 0,
    parallel: 1,
    format: [
      '@cucumber/pretty-formatter',
      'json:selenium/reports/cucumber-report.json'
    ],
    require: ['selenium/step_definitions/**/*.js']
  }
};