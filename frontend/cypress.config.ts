import { defineConfig } from 'cypress'
import createBundler from '@bahmutov/cypress-esbuild-preprocessor'
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor'
import createEsbuildPlugin from '@badeball/cypress-cucumber-preprocessor/esbuild'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720,
    retries: {
      runMode: 2,
      openMode: 0
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        table(message) {
          console.table(message)
          return null
        }
      })

      // Start backend server before running tests
      on('before:browser:launch', async () => {
        const { spawn } = require('child_process')
        const backend = spawn('npm', ['run', 'dev'], {
          cwd: '../backend',
          stdio: 'inherit'
        })

        // Wait for backend to be ready
        await new Promise((resolve) => {
          backend.stdout.on('data', (data) => {
            if (data.toString().includes('Server is running on port 3001')) {
              resolve(true)
            }
          })
        })

        return config
      })

      // Kill backend server after tests
      on('after:run', async () => {
        const { exec } = require('child_process')
        exec('pkill -f "node.*backend"')
      })
    }
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.ts'
  },
  env: {
    apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:3001',
    coverage: false
  },
  // Enable multiple windows support
  experimentalSessionAndOrigin: true,
  // Configure Chrome to allow multiple windows
  chromeWebSecurity: false
}) 