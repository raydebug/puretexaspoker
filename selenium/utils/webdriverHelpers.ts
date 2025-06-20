import { WebDriver, By, until, WebElement } from 'selenium-webdriver'
import { expect } from 'chai'
import { seleniumManager } from '../config/selenium.config'

export class WebDriverHelpers {
  private driver: WebDriver

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  // Element finding methods
  async findElement(locator: By | string): Promise<WebElement> {
    const by = typeof locator === 'string' ? By.css(locator) : locator
    return await this.driver.findElement(by)
  }

  async findElements(locator: By | string): Promise<WebElement[]> {
    const by = typeof locator === 'string' ? By.css(locator) : locator
    return await this.driver.findElements(by)
  }

  async findByTestId(testId: string): Promise<WebElement> {
    return await this.findElement(By.css(`[data-testid="${testId}"]`))
  }

  async findAllByTestId(testId: string): Promise<WebElement[]> {
    return await this.findElements(By.css(`[data-testid="${testId}"]`))
  }

  async findByText(text: string, tagName: string = '*'): Promise<WebElement> {
    return await this.findElement(By.xpath(`//${tagName}[contains(text(), "${text}")]`))
  }

  async findAllByText(text: string, tagName: string = '*'): Promise<WebElement[]> {
    return await this.findElements(By.xpath(`//${tagName}[contains(text(), "${text}")]`))
  }

  // Wait methods
  async waitForElement(locator: By | string, timeout: number = 10000): Promise<WebElement> {
    const by = typeof locator === 'string' ? By.css(locator) : locator
    return await this.driver.wait(until.elementLocated(by), timeout)
  }

  async waitForElementVisible(locator: By | string, timeout: number = 10000): Promise<WebElement> {
    const element = await this.waitForElement(locator, timeout)
    await this.driver.wait(until.elementIsVisible(element), timeout)
    return element
  }

  async waitForElementClickable(locator: By | string, timeout: number = 10000): Promise<WebElement> {
    const element = await this.waitForElement(locator, timeout)
    await this.driver.wait(until.elementIsEnabled(element), timeout)
    return element
  }

  async waitForText(locator: By | string, text: string, timeout: number = 10000): Promise<void> {
    const by = typeof locator === 'string' ? By.css(locator) : locator
    await this.driver.wait(async () => {
      try {
        const element = await this.driver.findElement(by)
        const elementText = await element.getText()
        return elementText.includes(text)
      } catch {
        return false
      }
    }, timeout)
  }

  async waitForElementNotPresent(locator: By | string, timeout: number = 10000): Promise<void> {
    const by = typeof locator === 'string' ? By.css(locator) : locator
    await this.driver.wait(async () => {
      try {
        await this.driver.findElement(by)
        return false // Element still present
      } catch {
        return true // Element not found
      }
    }, timeout)
  }

  // Action methods
  async click(locator: By | string): Promise<void> {
    const element = await this.waitForElementClickable(locator)
    await element.click()
  }

  async type(locator: By | string, text: string, clear: boolean = true): Promise<void> {
    const element = await this.waitForElementVisible(locator)
    if (clear) {
      await element.clear()
    }
    await element.sendKeys(text)
  }

  async clearAndType(locator: By | string, text: string): Promise<void> {
    await this.type(locator, text, true)
  }

  async getText(locator: By | string): Promise<string> {
    const element = await this.waitForElementVisible(locator)
    return await element.getText()
  }

  async getAttribute(locator: By | string, attribute: string): Promise<string> {
    const element = await this.waitForElementVisible(locator)
    return await element.getAttribute(attribute)
  }

  async isDisplayed(locator: By | string): Promise<boolean> {
    try {
      const element = await this.findElement(locator)
      return await element.isDisplayed()
    } catch {
      return false
    }
  }

  async isEnabled(locator: By | string): Promise<boolean> {
    try {
      const element = await this.findElement(locator)
      return await element.isEnabled()
    } catch {
      return false
    }
  }

  async elementExists(locator: By | string): Promise<boolean> {
    try {
      await this.findElement(locator)
      return true
    } catch {
      return false
    }
  }

  // Assertion methods
  async shouldBeVisible(locator: By | string, message?: string): Promise<void> {
    const isVisible = await this.isDisplayed(locator)
    expect(isVisible, message || `Element should be visible: ${locator}`).to.be.true
  }

  async shouldNotBeVisible(locator: By | string, message?: string): Promise<void> {
    const isVisible = await this.isDisplayed(locator)
    expect(isVisible, message || `Element should not be visible: ${locator}`).to.be.false
  }

  async shouldExist(locator: By | string, message?: string): Promise<void> {
    const exists = await this.elementExists(locator)
    expect(exists, message || `Element should exist: ${locator}`).to.be.true
  }

  async shouldNotExist(locator: By | string, message?: string): Promise<void> {
    const exists = await this.elementExists(locator)
    expect(exists, message || `Element should not exist: ${locator}`).to.be.false
  }

  async shouldContainText(locator: By | string, text: string, message?: string): Promise<void> {
    const elementText = await this.getText(locator)
    expect(elementText, message || `Element should contain text "${text}"`).to.include(text)
  }

  async shouldNotContainText(locator: By | string, text: string, message?: string): Promise<void> {
    const elementText = await this.getText(locator)
    expect(elementText, message || `Element should not contain text "${text}"`).to.not.include(text)
  }

  async shouldHaveAttribute(locator: By | string, attribute: string, value: string, message?: string): Promise<void> {
    const attributeValue = await this.getAttribute(locator, attribute)
    expect(attributeValue, message || `Element should have attribute ${attribute}="${value}"`).to.equal(value)
  }

  async shouldBeEnabled(locator: By | string, message?: string): Promise<void> {
    const isEnabled = await this.isEnabled(locator)
    expect(isEnabled, message || `Element should be enabled: ${locator}`).to.be.true
  }

  async shouldBeDisabled(locator: By | string, message?: string): Promise<void> {
    const isEnabled = await this.isEnabled(locator)
    expect(isEnabled, message || `Element should be disabled: ${locator}`).to.be.false
  }

  // Utility methods
  async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  async scrollToElement(locator: By | string): Promise<void> {
    const element = await this.findElement(locator)
    await this.driver.executeScript('arguments[0].scrollIntoView(true);', element)
  }

  async executeScript(script: string, ...args: any[]): Promise<any> {
    return await this.driver.executeScript(script, ...args)
  }

  async takeScreenshot(filename?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const name = filename || `screenshot-${timestamp}`
    await seleniumManager.takeScreenshot(name)
  }

  // Navigation methods
  async navigateTo(path: string = ''): Promise<void> {
    await seleniumManager.navigateTo(path)
  }

  async goBack(): Promise<void> {
    await this.driver.navigate().back()
  }

  async refresh(): Promise<void> {
    await this.driver.navigate().refresh()
  }

  async getCurrentUrl(): Promise<string> {
    return await this.driver.getCurrentUrl()
  }

  async getPageTitle(): Promise<string> {
    return await this.driver.getTitle()
  }
} 