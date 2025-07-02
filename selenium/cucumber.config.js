module.exports = {
  default: {
    // Timeout for each step (120 seconds to handle browser creation)
    timeout: 120000,
    
    // Feature paths
    paths: ['selenium/features/**/*.feature'],
    
    // Step definition paths
    require: [
      'selenium/step_definitions/**/*.js'
    ],
    
    // Formatters
    format: [
      '@cucumber/pretty-formatter'
    ],
    
    // Retry failed scenarios
    retry: 0,
    
    // Parallel execution (set to 1 for debugging)
    parallel: 1,
    
    // Tag filters
    tags: 'not @skip'
  }
}; 