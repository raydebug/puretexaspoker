import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:3001/api',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      apiBaseUrl: 'http://localhost:3001'
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: false,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
  },
}); 