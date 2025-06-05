import { defineConfig } from 'cypress'
import setupPlugins from './cypress/plugins'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      apiUrl: 'http://localhost:3001'
    },
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720,
    retries: {
      runMode: 2,
      openMode: 1
    },
    experimentalStudio: true,
    setupNodeEvents(on, config) {
      return setupPlugins(on, config)
    },
    chromeWebSecurity: false
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}'
  },
  env: {
    apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:3001',
    coverage: false
  }
}) 