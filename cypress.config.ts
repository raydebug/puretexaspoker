import { defineConfig } from 'cypress';
import { devServer } from '@cypress/vite-dev-server';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
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
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
}); 