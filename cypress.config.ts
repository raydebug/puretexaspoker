import { defineConfig } from 'cypress';
import { devServer } from '@cypress/vite-dev-server';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: '**/*.feature',
    async setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
      await addCucumberPreprocessorPlugin(on, config);
      on(
        'file:preprocessor',
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );
      // Existing dev-server setup
      on('dev-server:start', async (options) => {
        return devServer({
          ...options,
          viteConfig: {
            configFile: 'vite.config.ts',
          },
        });
      });
      // Register custom tasks for multi-user tests
      on('task', {
        getSessionId() {
          // Stub: return a static session id for now
          return 'player1';
        },
        openNewSession() {
          // Stub: no-op for now
          return null;
        },
        closeSessions() {
          // Stub: no-op for now
          return null;
        }
      });
      return config;
    },
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
}); 