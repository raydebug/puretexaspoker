const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // Add plugins
      require('./cypress/plugins/index.js')(on, config);
      
      // Add retries for stability
      config.retries = {
        runMode: 2,
        openMode: 1
      };
      
      // Track test player sessions
      const players = [];
      
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        getTestData() {
          return {
            players,
            serverUrl: 'http://localhost:3001'
          };
        },
        
        addPlayer(player) {
          players.push(player);
          return players;
        },
        
        resetPlayers() {
          players.length = 0;
          return players;
        }
      });
      
      return config;
    }
  },
  env: {
    apiUrl: 'http://localhost:3001',
    recordFailedTests: true
  }
}); 