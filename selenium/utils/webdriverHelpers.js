const { By, until } = require('selenium-webdriver');
const axios = require('axios');

class WebDriverHelpers {
  constructor(driver) {
    this.driver = driver;
  }

  // API call method
  async makeApiCall(baseUrl, endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method: method,
        url: `${baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.log(`API call failed: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Element finding methods
  async findElement(locator) {
    const by = typeof locator === 'string' ? By.css(locator) : locator;
    return await this.driver.findElement(by);
  }

  async findElements(locator) {
    const by = typeof locator === 'string' ? By.css(locator) : locator;
    return await this.driver.findElements(by);
  }

  async findByTestId(testId) {
    return await this.findElement(By.css(`[data-testid="${testId}"]`));
  }

  // Wait methods
  async waitForElement(locator, timeout = 10000) {
    const by = typeof locator === 'string' ? By.css(locator) : locator;
    return await this.driver.wait(until.elementLocated(by), timeout);
  }

  async waitForElementVisible(locator, timeout = 10000) {
    const element = await this.waitForElement(locator, timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async waitForElementClickable(locator, timeout = 10000) {
    const element = await this.waitForElement(locator, timeout);
    await this.driver.wait(until.elementIsEnabled(element), timeout);
    return element;
  }

  // Action methods
  async click(locator) {
    const element = await this.waitForElementClickable(locator);
    await element.click();
  }

  async type(locator, text, clear = true) {
    const element = await this.waitForElementVisible(locator);
    if (clear) {
      await element.clear();
    }
    await element.sendKeys(text);
  }

  async clearAndType(locator, text) {
    await this.type(locator, text, true);
  }

  async getText(locator) {
    const element = await this.waitForElementVisible(locator);
    return await element.getText();
  }

  async getAttribute(locator, attribute) {
    const element = await this.waitForElementVisible(locator);
    return await element.getAttribute(attribute);
  }

  async isDisplayed(locator) {
    try {
      const element = await this.findElement(locator);
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  async isEnabled(locator) {
    try {
      const element = await this.findElement(locator);
      return await element.isEnabled();
    } catch {
      return false;
    }
  }

  async elementExists(locator) {
    try {
      await this.findElement(locator);
      return true;
    } catch {
      return false;
    }
  }

  // Assertion methods
  async shouldBeVisible(locator, message) {
    const isVisible = await this.isDisplayed(locator);
    if (!isVisible) {
      throw new Error(message || `Element should be visible: ${locator}`);
    }
  }

  async shouldNotBeVisible(locator, message) {
    const isVisible = await this.isDisplayed(locator);
    if (isVisible) {
      throw new Error(message || `Element should not be visible: ${locator}`);
    }
  }

  async shouldExist(locator, message) {
    const exists = await this.elementExists(locator);
    if (!exists) {
      throw new Error(message || `Element should exist: ${locator}`);
    }
  }

  async shouldNotExist(locator, message) {
    const exists = await this.elementExists(locator);
    if (exists) {
      throw new Error(message || `Element should not exist: ${locator}`);
    }
  }

  async shouldContainText(locator, text, message) {
    const elementText = await this.getText(locator);
    if (!elementText.includes(text)) {
      throw new Error(message || `Element should contain text "${text}"`);
    }
  }

  async shouldNotContainText(locator, text, message) {
    const elementText = await this.getText(locator);
    if (elementText.includes(text)) {
      throw new Error(message || `Element should not contain text "${text}"`);
    }
  }

  async shouldBeEnabled(locator, message) {
    const isEnabled = await this.isEnabled(locator);
    if (!isEnabled) {
      throw new Error(message || `Element should be enabled: ${locator}`);
    }
  }

  async shouldBeDisabled(locator, message) {
    const isEnabled = await this.isEnabled(locator);
    if (isEnabled) {
      throw new Error(message || `Element should be disabled: ${locator}`);
    }
  }

  // Utility methods
  async sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async navigateTo(path = '') {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}${path}`;
    await this.driver.get(url);
  }

  async takeScreenshot(filename) {
    const screenshot = await this.driver.takeScreenshot();
    const fs = require('fs');
    const path = require('path');
    
    const screenshotDir = 'selenium/screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filepath = path.join(screenshotDir, `${filename}.png`);
    fs.writeFileSync(filepath, screenshot, 'base64');
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async getPageTitle() {
    return await this.driver.getTitle();
  }

  async waitForText(locator, text, timeout = 10000) {
    const by = typeof locator === 'string' ? By.css(locator) : locator;
    await this.driver.wait(async () => {
      try {
        const element = await this.driver.findElement(by);
        const elementText = await element.getText();
        return elementText.includes(text);
      } catch {
        return false;
      }
    }, timeout);
  }
}

// Static helper functions for global use
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeApiCall = async (baseUrl, endpoint, method = 'GET', data = null) => {
  try {
    const config = {
      method: method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.log(`API call failed: ${error.message}`);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

module.exports = { 
  WebDriverHelpers,
  sleep,
  makeApiCall
}; 