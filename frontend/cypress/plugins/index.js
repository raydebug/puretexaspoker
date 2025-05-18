const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Cypress plugin for multi-session poker game testing
 * @param {Object} on - Cypress event handler
 * @param {Object} config - Cypress configuration
 */
module.exports = (on, config) => {
  // Track sessions for cleanup
  const sessions = [];
  
  // Create a new browser session
  on('task', {
    openNewSession() {
      const port = 3001 + sessions.length;
      const sessionId = `player${sessions.length + 1}`;
      
      // Run a new Cypress instance with a specific profile
      const command = `npx cypress open --config baseUrl=http://localhost:3000,userAgent="Cypress-${sessionId}" --env sessionId=${sessionId}`;
      
      // Execute in a non-blocking way
      const child = require('child_process').spawn(command, {
        shell: true,
        detached: true,
        stdio: 'ignore'
      });
      
      // Unref to prevent keeping Node process alive
      child.unref();
      
      // Store session for cleanup
      sessions.push({
        id: sessionId,
        process: child
      });
      
      return true;
    },
    
    // Close all sessions
    closeSessions() {
      sessions.forEach(session => {
        try {
          if (os.platform() === 'win32') {
            execSync(`taskkill /PID ${session.process.pid} /T /F`);
          } else {
            process.kill(-session.process.pid);
          }
        } catch (e) {
          console.warn(`Failed to kill session ${session.id}:`, e);
        }
      });
      
      return true;
    },
    
    // Get current session ID
    getSessionId() {
      return config.env.sessionId || 'default';
    }
  });
  
  // Add E2E Testing session middleware
  on('before:browser:launch', (browser, launchOptions) => {
    const sessionId = config.env.sessionId || 'default';
    
    // Configure unique user data directory for different sessions
    const userDataDir = path.join(os.tmpdir(), `cypress-${sessionId}`);
    
    if (browser.name === 'chrome') {
      launchOptions.args.push(`--user-data-dir=${userDataDir}`);
      launchOptions.args.push(`--profile-directory=${sessionId}`);
    } else if (browser.name === 'firefox') {
      launchOptions.preferences['profile'] = userDataDir;
    }
    
    return launchOptions;
  });
  
  // Handle browser close and cleanup
  on('after:run', () => {
    // Clean up any user data directories
    const tempDir = os.tmpdir();
    fs.readdirSync(tempDir).forEach(file => {
      if (file.startsWith('cypress-player')) {
        try {
          fs.rmSync(path.join(tempDir, file), { recursive: true, force: true });
        } catch (e) {
          console.warn(`Could not delete ${file}:`, e);
        }
      }
    });
  });

  return config;
}; 