const fs = require('fs');
const path = require('path');

class ScreenshotUtils {
  constructor() {
    this.screenshotDir = path.join(__dirname, '../screenshots/2-player-test');
    this.screenshotCounter = 0;
    this.ensureScreenshotDir();
  }

  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async captureStep(stepName, playerDrivers = {}) {
    this.screenshotCounter++;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stepNumber = String(this.screenshotCounter).padStart(2, '0');
    
    console.log(`📸 Capturing screenshots for step ${stepNumber}: ${stepName}`);
    
    const screenshots = [];
    
    for (const [playerName, driver] of Object.entries(playerDrivers)) {
      if (driver && driver.takeScreenshot) {
        try {
          const filename = `${stepNumber}_${stepName.replace(/[^a-zA-Z0-9]/g, '_')}_${playerName}_${timestamp}.png`;
          const filepath = path.join(this.screenshotDir, filename);
          
          const screenshot = await driver.takeScreenshot();
          fs.writeFileSync(filepath, screenshot, 'base64');
          
          screenshots.push({
            player: playerName,
            filename: filename,
            path: filepath
          });
          
          console.log(`📸 Screenshot saved: ${filename}`);
        } catch (error) {
          console.log(`⚠️ Failed to capture screenshot for ${playerName}: ${error.message}`);
        }
      }
    }
    
    return screenshots;
  }

  async captureGameState(stepName, playerDrivers = {}) {
    console.log(`🎮 Capturing game state for: ${stepName}`);
    return await this.captureStep(stepName, playerDrivers);
  }

  getScreenshotSummary() {
    const files = fs.readdirSync(this.screenshotDir)
      .filter(file => file.endsWith('.png'))
      .sort();
    
    console.log(`📊 Total screenshots captured: ${files.length}`);
    console.log(`📁 Screenshots location: ${this.screenshotDir}`);
    
    return {
      count: files.length,
      directory: this.screenshotDir,
      files: files
    };
  }
}

module.exports = new ScreenshotUtils();