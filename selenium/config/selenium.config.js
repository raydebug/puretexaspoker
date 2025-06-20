const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');

class SeleniumManager {
  constructor() {
    this.driver = null;
    this.config = {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      apiUrl: process.env.API_URL || 'http://localhost:3001',
      browser: process.env.BROWSER || 'chrome',
      headless: process.env.HEADLESS === 'true',
      timeout: parseInt(process.env.TIMEOUT || '10000'),
      windowSize: {
        width: parseInt(process.env.WINDOW_WIDTH || '1280'),
        height: parseInt(process.env.WINDOW_HEIGHT || '720')
      }
    };
  }

  async initializeDriver() {
    if (this.driver) {
      return this.driver;
    }

    const builder = new Builder();

    switch (this.config.browser.toLowerCase()) {
      case 'chrome':
        const chromeOptions = new chrome.Options();
        if (this.config.headless) {
          chromeOptions.addArguments('--headless=new');
        }
        chromeOptions.addArguments('--no-sandbox');
        chromeOptions.addArguments('--disable-dev-shm-usage');
        chromeOptions.addArguments('--disable-web-security');
        chromeOptions.addArguments('--allow-running-insecure-content');
        chromeOptions.addArguments(`--window-size=${this.config.windowSize.width},${this.config.windowSize.height}`);
        builder.forBrowser('chrome').setChromeOptions(chromeOptions);
        break;

      case 'firefox':
        const firefoxOptions = new firefox.Options();
        if (this.config.headless) {
          firefoxOptions.addArguments('--headless');
        }
        builder.forBrowser('firefox').setFirefoxOptions(firefoxOptions);
        break;

      case 'edge':
        const edgeOptions = new edge.Options();
        if (this.config.headless) {
          edgeOptions.addArguments('--headless');
        }
        edgeOptions.addArguments('--no-sandbox');
        edgeOptions.addArguments('--disable-dev-shm-usage');
        edgeOptions.addArguments(`--window-size=${this.config.windowSize.width},${this.config.windowSize.height}`);
        builder.forBrowser('MicrosoftEdge').setEdgeOptions(edgeOptions);
        break;

      default:
        throw new Error(`Unsupported browser: ${this.config.browser}`);
    }

    this.driver = await builder.build();
    
    // Set window size if not headless
    if (!this.config.headless) {
      await this.driver.manage().window().setRect({
        width: this.config.windowSize.width,
        height: this.config.windowSize.height
      });
    }

    // Set timeouts
    await this.driver.manage().setTimeouts({
      implicit: this.config.timeout,
      pageLoad: this.config.timeout * 3,
      script: this.config.timeout * 2
    });

    return this.driver;
  }

  async getDriver() {
    if (!this.driver) {
      return await this.initializeDriver();
    }
    return this.driver;
  }

  async quitDriver() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  getConfig() {
    return this.config;
  }

  async navigateTo(path = '') {
    const driver = await this.getDriver();
    const url = `${this.config.baseUrl}${path}`;
    await driver.get(url);
  }

  async takeScreenshot(filename) {
    const driver = await this.getDriver();
    const screenshot = await driver.takeScreenshot();
    const fs = require('fs');
    const path = require('path');
    
    const screenshotDir = 'selenium/screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filepath = path.join(screenshotDir, `${filename}.png`);
    fs.writeFileSync(filepath, screenshot, 'base64');
  }
}

// Global instance
const seleniumManager = new SeleniumManager();

module.exports = { SeleniumManager, seleniumManager }; 