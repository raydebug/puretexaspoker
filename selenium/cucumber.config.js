module.exports = {
  default: {
    // Timeout for each step (180 seconds to handle browser creation)
    timeout: 180000,
    
    // Feature paths
    paths: ['features/**/*.feature'],
    
    // Step definition paths
    require: [
      'step_definitions/**/*.js'
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