import { defineConfig } from 'cypress'
import setupPlugins from './cypress/plugins'
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor'
import createBundler from '@bahmutov/cypress-esbuild-preprocessor'
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      apiUrl: 'http://localhost:3001'
    },
    supportFile: 'cypress/support/e2e.ts',
    specPattern: [
      'cypress/e2e/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/features/**/*.feature'
    ],
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
    async setupNodeEvents(on, config) {
      // Add cucumber preprocessor plugin
      await addCucumberPreprocessorPlugin(on, config);
      
      // Add esbuild preprocessor with cucumber support
      on(
        'file:preprocessor',
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );
      
      // Return the original plugins
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