const fs = require('fs');
const path = require('path');

// Screenshot helper for 2-player tests
class ScreenshotHelper {
  constructor() {
    this.screenshotDir = path.join(__dirname, '..', 'screenshots', 'fresh-test');
    this.ensureDirectory();
    this.stepCounter = 0;
  }

  ensureDirectory() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async captureStep(stepName, playerName = 'player1', waitTime = 2000) {
    this.stepCounter++;
    const playerInstance = global.players && global.players[playerName];
    
    if (playerInstance && playerInstance.driver) {
      try {
        // Wait for UI updates before capturing
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        const filename = `${String(this.stepCounter).padStart(2, '0')}_${stepName.toLowerCase().replace(/\s+/g, '_')}_${playerName.toLowerCase()}.png`;
        const filepath = path.join(this.screenshotDir, filename);
        
        await playerInstance.driver.takeScreenshot().then(data => {
          fs.writeFileSync(filepath, data, 'base64');
        });
        
        console.log(`📸 Screenshot captured: ${filename} (waited ${waitTime}ms for UI updates)`);
        return filepath;
      } catch (error) {
        console.log(`⚠️ Screenshot failed for ${playerName}: ${error.message}`);
      }
    } else {
      console.log(`⚠️ No browser instance found for ${playerName}`);
    }
  }

  async captureAllPlayers(stepName, waitTime = 2000) {
    const screenshots = [];
    if (global.players) {
      for (const playerName of Object.keys(global.players)) {
        const filepath = await this.captureStep(stepName, playerName, waitTime);
        if (filepath) screenshots.push(filepath);
      }
    }
    return screenshots;
  }

  async captureGameState() {
    // Capture comprehensive game state for verification
    return await this.captureAllPlayers('game_state_verification', 3000);
  }
}

module.exports = ScreenshotHelper;