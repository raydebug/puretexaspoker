const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');
const fs = require('fs');
const path = require('path');

class SeleniumManager {
  constructor() {
    this.driver = null;
    this.config = {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      apiUrl: process.env.API_URL || 'http://localhost:3001',
      browser: process.env.BROWSER || 'chrome',
      headless: process.env.HEADLESS !== 'false',
      timeout: parseInt(process.env.TIMEOUT || '10000'),
      windowSize: {
        width: parseInt(process.env.WINDOW_WIDTH || '1280'),
        height: parseInt(process.env.WINDOW_HEIGHT || '720')
      },
      screenshotDir: path.join(__dirname, '..', 'screenshots')
    };

    // Ensure screenshots directory exists
    if (!fs.existsSync(this.config.screenshotDir)) {
      fs.mkdirSync(this.config.screenshotDir, { recursive: true });
    }
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
          // Proper screenshot support in headless mode
          chromeOptions.addArguments('--disable-gpu');
          chromeOptions.addArguments('--no-sandbox');
          chromeOptions.addArguments('--disable-dev-shm-usage');
          chromeOptions.addArguments('--force-device-scale-factor=1');
          chromeOptions.addArguments('--disable-web-security');
          chromeOptions.addArguments('--allow-running-insecure-content');
          chromeOptions.addArguments(`--window-size=${this.config.windowSize.width},${this.config.windowSize.height}`);
          // Ensure proper rendering for screenshots
          chromeOptions.addArguments('--disable-background-timer-throttling');
          chromeOptions.addArguments('--disable-backgrounding-occluded-windows');
          chromeOptions.addArguments('--disable-renderer-backgrounding');
          chromeOptions.addArguments('--disable-ipc-flooding-protection');
          chromeOptions.addArguments('--disable-extensions');
          chromeOptions.addArguments('--remote-debugging-port=0');
          chromeOptions.addArguments('--disable-default-apps');
          chromeOptions.addArguments('--disable-background-networking');
          // Enable localStorage for file:// URLs
          chromeOptions.addArguments('--enable-local-file-accesses');
          chromeOptions.addArguments('--allow-file-access');
          // Ensure screenshots work
          chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
          chromeOptions.addArguments('--disable-software-rasterizer');
        } else {
          // Non-headless options
          chromeOptions.addArguments('--no-sandbox');
          chromeOptions.addArguments('--disable-dev-shm-usage');
          chromeOptions.addArguments('--disable-web-security');
          chromeOptions.addArguments('--allow-running-insecure-content');
          chromeOptions.addArguments(`--window-size=${this.config.windowSize.width},${this.config.windowSize.height}`);
          chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
          chromeOptions.addArguments('--disable-background-timer-throttling');
          chromeOptions.addArguments('--disable-backgrounding-occluded-windows');
          chromeOptions.addArguments('--disable-renderer-backgrounding');
          chromeOptions.addArguments('--disable-ipc-flooding-protection');
          chromeOptions.addArguments('--allow-file-access-from-files');
          chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
          chromeOptions.addArguments('--disable-extensions');
          chromeOptions.addArguments('--remote-debugging-port=0');
          chromeOptions.addArguments('--disable-default-apps');
          chromeOptions.addArguments('--disable-background-networking');
          chromeOptions.addArguments('--enable-local-file-accesses');
          chromeOptions.addArguments('--allow-file-access');
        }
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
    if (!process.env.SCREENSHOT_MODE) {
      return;
    }

    try {
      const driver = await this.getDriver();
      if (!driver) {
        console.log(`⚠️ No driver available for screenshot: ${filename}`);
        return;
      }

      // Wait for any animations to complete
      await driver.sleep(1000);

      const screenshot = await driver.takeScreenshot();
      
      // Add timestamp to filename to avoid overwrites
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filepath = path.join(this.config.screenshotDir, `${filename}-${timestamp}.png`);
      
      fs.writeFileSync(filepath, screenshot, 'base64');
      console.log(`📸 Screenshot saved: ${filepath}`);
    } catch (error) {
      console.log(`⚠️ Failed to take screenshot: ${error.message}`);
    }
  }
}

// Global instance
const seleniumManager = new SeleniumManager();

module.exports = { SeleniumManager, seleniumManager }; 