const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class UIAIPlayer {
  constructor(config) {
    this.config = {
      name: config.name || 'AI_Player',
      personality: config.personality || 'balanced', // aggressive, conservative, balanced, bluffer
      skillLevel: config.skillLevel || 'intermediate',
      reactionTime: config.reactionTime || 2000, // thinking time in ms
      aggressionFactor: config.aggressionFactor || 0.5, // 0-1 scale
      bluffFrequency: config.bluffFrequency || 0.2, // 0-1 scale
      ...config
    };
    
    this.driver = null;
    this.gameState = {
      myCards: [],
      communityCards: [],
      myChips: 0,
      pot: 0,
      currentBet: 0,
      position: null,
      phase: 'waiting'
    };
    
    this.isPlaying = false;
    this.seatNumber = null;
  }

  async initialize() {
    console.log(`🤖 Initializing UI AI Player: ${this.config.name}`);
    
    // Create unique browser instance
    const chromeOptions = new chrome.Options();
    const timestamp = Date.now();
    const userDataDir = `/tmp/ai_player_${this.config.name}_${timestamp}`;
    
    chromeOptions.addArguments(`--user-data-dir=${userDataDir}`);
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--window-size=1280,720');
    chromeOptions.addArguments('--disable-web-security');
    
    // Run in headed mode to see AI playing (can be changed to headless)
    if (process.env.HEADLESS === 'true') {
      chromeOptions.addArguments('--headless=new');
    }
    
    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
      
    console.log(`✅ AI Player ${this.config.name} browser initialized`);
  }

  async joinGame(tableId = 1) {
    console.log(`🎯 AI ${this.config.name} joining game on table ${tableId}`);
    
    try {
      // Step 1: Navigate to poker lobby
      await this.driver.get('http://localhost:3000');
      await this.delay(2000);
      
      // Step 2: Login with AI player name
      await this.login();
      
      // Step 3: Navigate to table
      await this.navigateToTable(tableId);
      
      // Step 4: Take a seat
      await this.takeSeat();
      
      // Step 5: Start playing
      await this.startGameLoop();
      
    } catch (error) {
      console.error(`❌ AI ${this.config.name} failed to join game:`, error.message);
    }
  }

  async login() {
    console.log(`🔐 AI ${this.config.name} logging in...`);
    
    try {
      // Look for login elements
      const nicknameInput = await this.driver.wait(
        until.elementLocated(By.css('input[placeholder*="nickname"], input[name="nickname"], #nickname')), 
        10000
      );
      
      await nicknameInput.clear();
      await nicknameInput.sendKeys(this.config.name);
      await this.delay(500);
      
      // Find and click login/join button
      const loginButton = await this.driver.findElement(
        By.css('button[type="submit"], .join-button, .login-button')
      );
      await loginButton.click();
      
      await this.delay(2000);
      console.log(`✅ AI ${this.config.name} logged in successfully`);
      
    } catch (error) {
      console.log(`⚠️ Login method 1 failed, trying alternative...`);
      
      // Alternative login method - direct URL with params
      await this.driver.get(`http://localhost:3000/join?nickname=${this.config.name}`);
      await this.delay(3000);
    }
  }

  async navigateToTable(tableId) {
    console.log(`🏃 AI ${this.config.name} navigating to table ${tableId}...`);
    
    try {
      // Look for table selection
      const tableElements = await this.driver.findElements(
        By.css('[data-testid*="table"], .table-card, .poker-table-card')
      );
      
      if (tableElements.length > 0) {
        // Click first available table
        await tableElements[0].click();
        await this.delay(2000);
      } else {
        // Direct navigation to game page
        await this.driver.get(`http://localhost:3000/game/${tableId}`);
        await this.delay(3000);
      }
      
      // Wait for poker table to load
      await this.driver.wait(
        until.elementLocated(By.css('[data-testid="poker-table"], .poker-table, .game-board')), 
        15000
      );
      
      console.log(`✅ AI ${this.config.name} reached poker table`);
      
    } catch (error) {
      console.error(`❌ Failed to navigate to table:`, error.message);
    }
  }

  async takeSeat() {
    console.log(`💺 AI ${this.config.name} looking for available seat...`);
    
    try {
      // Look for available seats
      const seatElements = await this.driver.findElements(
        By.css('.seat:not(.occupied), [data-testid*="seat"]:not([data-occupied="true"]), .empty-seat')
      );
      
      if (seatElements.length === 0) {
        // Try clicking any seat button
        const seatButtons = await this.driver.findElements(
          By.css('button[class*="seat"], .seat-button, [data-testid*="seat-button"]')
        );
        
        if (seatButtons.length > 0) {
          await seatButtons[Math.floor(Math.random() * seatButtons.length)].click();
          await this.delay(1000);
        }
      } else {
        // Click random available seat
        const randomSeat = seatElements[Math.floor(Math.random() * seatElements.length)];
        await randomSeat.click();
        await this.delay(1000);
      }
      
      // Handle buy-in dialog if it appears
      await this.handleBuyInDialog();
      
      // Confirm seat selection
      await this.confirmSeatSelection();
      
      console.log(`✅ AI ${this.config.name} took a seat`);
      this.isPlaying = true;
      
    } catch (error) {
      console.error(`❌ Failed to take seat:`, error.message);
    }
  }

  async handleBuyInDialog() {
    try {
      // Look for buy-in input
      const buyInInput = await this.driver.findElement(
        By.css('input[placeholder*="buy"], input[name*="buyin"], input[type="number"]')
      );
      
      await buyInInput.clear();
      await buyInInput.sendKeys('150'); // Standard buy-in
      await this.delay(500);
      
    } catch (error) {
      // Buy-in dialog might not appear
      console.log(`💰 No buy-in dialog found for ${this.config.name}`);
    }
  }

  async confirmSeatSelection() {
    try {
      // Look for confirmation button
      const confirmButtons = await this.driver.findElements(
        By.css('button[class*="confirm"], button[class*="join"], button[class*="sit"], .confirm-button')
      );
      
      if (confirmButtons.length > 0) {
        await confirmButtons[0].click();
        await this.delay(2000);
      }
      
    } catch (error) {
      console.log(`⚠️ No confirmation needed for ${this.config.name}`);
    }
  }

  async startGameLoop() {
    console.log(`🎮 AI ${this.config.name} starting game loop...`);
    
    while (this.isPlaying) {
      try {
        // Update game state by reading UI
        await this.readGameState();
        
        // Check if it's our turn
        if (await this.isMyTurn()) {
          await this.makeDecision();
        }
        
        // Wait before next check
        await this.delay(1000);
        
      } catch (error) {
        console.error(`⚠️ Game loop error for ${this.config.name}:`, error.message);
        await this.delay(2000);
      }
    }
  }

  async readGameState() {
    try {
      // Read my cards (if visible)
      const cardElements = await this.driver.findElements(
        By.css('.my-cards .card, .player-cards .card, [data-testid*="player-card"]')
      );
      
      // Read community cards
      const communityElements = await this.driver.findElements(
        By.css('.community-cards .card, .board-cards .card, [data-testid*="community-card"]')
      );
      
      // Read pot amount
      try {
        const potElement = await this.driver.findElement(
          By.css('.pot-amount, .pot, [data-testid*="pot"]')
        );
        const potText = await potElement.getText();
        this.gameState.pot = this.extractNumber(potText);
      } catch (e) {
        // Pot element not found
      }
      
      // Read my chip count
      try {
        const chipElement = await this.driver.findElement(
          By.css('.my-chips, .player-chips, [data-testid*="chip"]')
        );
        const chipText = await chipElement.getText();
        this.gameState.myChips = this.extractNumber(chipText);
      } catch (e) {
        // Chip element not found
      }
      
    } catch (error) {
      // Game state reading errors are common and non-critical
    }
  }

  async isMyTurn() {
    try {
      // Check for action buttons
      const actionButtons = await this.driver.findElements(
        By.css('.action-buttons button:not([disabled]), .player-actions button:not([disabled])')
      );
      
      return actionButtons.length > 0;
      
    } catch (error) {
      return false;
    }
  }

  async makeDecision() {
    console.log(`🧠 AI ${this.config.name} making decision...`);
    
    // Add realistic thinking time
    await this.delay(this.config.reactionTime + Math.random() * 1000);
    
    try {
      // Get available actions
      const actionButtons = await this.driver.findElements(
        By.css('.action-buttons button:not([disabled]), .player-actions button:not([disabled])')
      );
      
      if (actionButtons.length === 0) return;
      
      // Read button text to understand options
      const actions = [];
      for (let button of actionButtons) {
        const text = await button.getText();
        actions.push({ button, action: text.toLowerCase() });
      }
      
      // Make decision based on personality
      const decision = this.calculateDecision(actions);
      
      if (decision) {
        console.log(`🎯 AI ${this.config.name} decides: ${decision.action}`);
        
        // Handle bet/raise amount if needed
        if (decision.action.includes('bet') || decision.action.includes('raise')) {
          await this.handleBetAmount(decision.amount);
        }
        
        // Click the action button
        await decision.button.click();
        await this.delay(1000);
      }
      
    } catch (error) {
      console.error(`❌ Decision making error:`, error.message);
    }
  }

  calculateDecision(actions) {
    // Simple AI decision logic based on personality
    const availableActions = actions.map(a => a.action);
    
    switch (this.config.personality) {
      case 'aggressive':
        return this.aggressiveStrategy(actions);
      case 'conservative':
        return this.conservativeStrategy(actions);
      case 'bluffer':
        return this.blufferStrategy(actions);
      default:
        return this.balancedStrategy(actions);
    }
  }

  aggressiveStrategy(actions) {
    const raiseAction = actions.find(a => a.action.includes('raise') || a.action.includes('bet'));
    if (raiseAction && Math.random() > 0.3) {
      return { ...raiseAction, amount: this.gameState.myChips * 0.3 };
    }
    
    const callAction = actions.find(a => a.action.includes('call'));
    if (callAction && Math.random() > 0.2) {
      return callAction;
    }
    
    const foldAction = actions.find(a => a.action.includes('fold'));
    return foldAction || actions[0];
  }

  conservativeStrategy(actions) {
    const checkAction = actions.find(a => a.action.includes('check'));
    if (checkAction && Math.random() > 0.3) {
      return checkAction;
    }
    
    const callAction = actions.find(a => a.action.includes('call'));
    if (callAction && Math.random() > 0.6) {
      return callAction;
    }
    
    const foldAction = actions.find(a => a.action.includes('fold'));
    return foldAction || actions[0];
  }

  blufferStrategy(actions) {
    // Occasionally make big bluffs
    const raiseAction = actions.find(a => a.action.includes('raise') || a.action.includes('bet'));
    if (raiseAction && Math.random() > 0.7) {
      return { ...raiseAction, amount: this.gameState.myChips * 0.5 };
    }
    
    return this.balancedStrategy(actions);
  }

  balancedStrategy(actions) {
    const rand = Math.random();
    
    if (rand > 0.6) {
      const callAction = actions.find(a => a.action.includes('call'));
      if (callAction) return callAction;
    }
    
    if (rand > 0.8) {
      const raiseAction = actions.find(a => a.action.includes('raise') || a.action.includes('bet'));
      if (raiseAction) return { ...raiseAction, amount: this.gameState.myChips * 0.2 };
    }
    
    if (rand > 0.4) {
      const checkAction = actions.find(a => a.action.includes('check'));
      if (checkAction) return checkAction;
    }
    
    const foldAction = actions.find(a => a.action.includes('fold'));
    return foldAction || actions[0];
  }

  async handleBetAmount(amount) {
    try {
      // Look for bet amount input
      const betInput = await this.driver.findElement(
        By.css('input[type="number"], input[placeholder*="amount"], .bet-input')
      );
      
      await betInput.clear();
      await betInput.sendKeys(String(Math.floor(amount)));
      await this.delay(500);
      
    } catch (error) {
      // Bet amount input not found or not needed
    }
  }

  extractNumber(text) {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    console.log(`👋 AI ${this.config.name} disconnecting...`);
    this.isPlaying = false;
    
    if (this.driver) {
      await this.driver.quit();
    }
  }
}

module.exports = { UIAIPlayer };
