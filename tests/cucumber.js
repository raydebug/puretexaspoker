module.exports = {
  default: {
    timeout: 600000, // 10 minutes total timeout per scenario
    retry: 0,
    parallel: 1,
    format: [
      '@cucumber/pretty-formatter',
      'json:selenium/reports/cucumber-report.json'
    ],
    require: ['selenium/step_definitions/**/*.js']
  }
};