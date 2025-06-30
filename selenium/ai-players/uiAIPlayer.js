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
      // Look for login elements with more specific selectors
      const nicknameInput = await this.driver.wait(
        until.elementLocated(By.css('input[placeholder*="nickname"], input[name="nickname"], #nickname, input[type="text"]')), 
        15000
      );
      
      await nicknameInput.clear();
      await nicknameInput.sendKeys(this.config.name);
      await this.delay(800);
      
      // Find and click login/join button with multiple selectors
      let loginButton;
      const buttonSelectors = [
        'button[type="submit"]',
        '.join-button',
        '.login-button',
        'button:contains("Join")',
        'button:contains("Login")',
        'button'
      ];
      
      for (const selector of buttonSelectors) {
        try {
          if (selector.includes(':contains')) {
            loginButton = await this.driver.findElement(
              By.xpath(`//button[contains(text(), 'Join') or contains(text(), 'Login') or contains(text(), 'Enter')]`)
            );
          } else {
            loginButton = await this.driver.findElement(By.css(selector));
          }
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (loginButton) {
        await loginButton.click();
        await this.delay(3000);
        console.log(`✅ AI ${this.config.name} logged in successfully`);
      } else {
        throw new Error('No login button found');
      }
      
    } catch (error) {
      console.log(`⚠️ Standard login failed, trying alternative methods...`);
      
      // Alternative login method - direct URL with params
      await this.driver.get(`http://localhost:3000/join?nickname=${encodeURIComponent(this.config.name)}`);
      await this.delay(4000);
      
      // If that fails, try the lobby directly
      try {
        await this.driver.get('http://localhost:3000/lobby');
        await this.delay(2000);
      } catch (e) {
        console.log(`⚠️ Direct lobby access also failed for ${this.config.name}`);
      }
    }
  }

  async navigateToTable(tableId) {
    console.log(`🏃 AI ${this.config.name} navigating to table ${tableId}...`);
    
    try {
      // First, ensure we're on the lobby page to see tables
      try {
        await this.driver.get('http://localhost:3000');
        await this.delay(2000);
      } catch (e) {
        console.log(`⚠️ Failed to load lobby page: ${e.message}`);
      }
      
             // Look for table selection with more specific selectors
       const tableSelectors = [
         `[data-testid="join-table-${tableId}"]`,
         '[data-testid*="join-table"]',
         '[data-testid*="table"]',
         '.table-card',
         '.poker-table-card'
       ];
      
      let foundTable = false;
      for (const selector of tableSelectors) {
        try {
          const tableElements = await this.driver.findElements(By.css(selector));
          if (tableElements.length > 0) {
            // Click first table found
            await tableElements[0].click();
            await this.delay(3000);
            foundTable = true;
            console.log(`✅ AI ${this.config.name} clicked table with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!foundTable) {
        // Direct navigation to game page as fallback
        console.log(`🔄 No table card found, navigating directly to game page...`);
        await this.driver.get(`http://localhost:3000/game/${tableId}`);
        await this.delay(4000);
      } else {
        // Handle the welcome popup and navigation flow
        await this.handleWelcomePopupAndNavigation(tableId);
      }
      
      // Wait for poker table to load - be more patient
      console.log(`⏳ Waiting for poker table to load...`);
      await this.driver.wait(
        until.elementLocated(By.css('[data-testid="poker-table"]')), 
        20000
      );
      
      // Additional wait for WebSocket connection and initial data
      await this.delay(3000);
      
      // **CRITICAL**: Ensure we're properly authenticated and joined via WebSocket
      // This is essential for session data to be set correctly
      await this.ensureProperWebSocketAuth(tableId);
      
      console.log(`✅ AI ${this.config.name} reached poker table and is connected`);
      
    } catch (error) {
      console.error(`❌ Failed to navigate to table:`, error.message);
      throw error;
    }
  }

  async takeSeat() {
    console.log(`💺 AI ${this.config.name} looking for available seat...`);
    
    try {
      // Wait for the poker table to load completely and WebSocket to sync
      await this.delay(5000);
      
      // Try up to 3 times to find and take a seat (in case of race conditions)
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 AI ${this.config.name} seat attempt ${attempts}/${maxAttempts}`);
        
        // Refresh the page to get latest seat availability
        if (attempts > 1) {
          console.log(`🔄 Refreshing page to get latest seat data...`);
          await this.driver.navigate().refresh();
          await this.delay(4000);
        }
        
        // Look for available seats using the correct data-testid pattern
        const availableSeats = [];
        for (let seatNum = 1; seatNum <= 10; seatNum++) {
          try {
            const seatElement = await this.driver.findElement(
              By.css(`[data-testid="available-seat-${seatNum}"]`)
            );
            if (await seatElement.isDisplayed() && await seatElement.isEnabled()) {
              // Double-check the seat is actually clickable
              const isClickable = await this.driver.executeScript(
                'return arguments[0].offsetParent !== null && !arguments[0].disabled;',
                seatElement
              );
              
              if (isClickable) {
                availableSeats.push({ element: seatElement, number: seatNum });
              }
            }
          } catch (e) {
            // Seat not available or doesn't exist
          }
        }
        
        console.log(`🎯 AI ${this.config.name} found ${availableSeats.length} available seats: ${availableSeats.map(s => s.number).join(', ')}`);
        
        if (availableSeats.length === 0) {
          if (attempts < maxAttempts) {
            console.log(`⏳ No seats available, waiting before retry...`);
            await this.delay(3000);
            continue;
          } else {
            throw new Error('No available seats found after multiple attempts');
          }
        }
        
        // Pick a random available seat
        const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
        console.log(`🎯 AI ${this.config.name} selecting seat ${randomSeat.number}`);
        
        try {
          // Scroll seat into view and click
          await this.driver.executeScript(
            'arguments[0].scrollIntoView({behavior: "smooth", block: "center"});',
            randomSeat.element
          );
          await this.delay(500);
          
          // Click the seat to open dialog
          await randomSeat.element.click();
          await this.delay(2000);
          
          // Wait for seat selection dialog to appear
          console.log(`⏳ Waiting for seat selection dialog...`);
          const dialog = await this.driver.wait(
            until.elementLocated(By.css('[data-testid="seat-dialog"]')),
            8000
          );
          
          // Handle buy-in selection
          await this.handleSeatDialog();
          
          // Click confirm button
          await this.confirmSeatSelection();
          
          // Wait for dialog to close - this indicates success
          await this.driver.wait(until.stalenessOf(dialog), 15000);
          
          // Verify we actually got the seat by checking if we're no longer an observer
          await this.delay(2000);
          const isStillObserver = await this.checkIfStillObserver();
          
          if (!isStillObserver) {
            console.log(`✅ AI ${this.config.name} successfully took seat ${randomSeat.number}`);
            this.seatNumber = randomSeat.number;
            this.isPlaying = true;
            return; // Success!
          } else {
            console.log(`⚠️ Still observer after seat attempt, trying again...`);
            throw new Error('Seat taking appeared to succeed but still observer');
          }
          
        } catch (seatError) {
          console.log(`⚠️ Seat ${randomSeat.number} attempt failed: ${seatError.message}`);
          
          // Close any open dialogs
          try {
            const dialogsToClose = await this.driver.findElements(By.css('[data-testid="seat-dialog"]'));
            for (const dialog of dialogsToClose) {
              try {
                const closeButton = await dialog.findElement(By.css('button:contains("×"), .close-button'));
                await closeButton.click();
                await this.delay(500);
              } catch (e) {
                // No close button or dialog already closed
              }
            }
          } catch (e) {
            // No dialogs to close
          }
          
          if (attempts < maxAttempts) {
            console.log(`🔄 Retrying with different seat...`);
            await this.delay(2000);
            continue;
          } else {
            throw seatError;
          }
        }
      }
      
      throw new Error(`Failed to take seat after ${maxAttempts} attempts`);
      
    } catch (error) {
      console.error(`❌ AI ${this.config.name} failed to take seat:`, error.message);
      throw error;
    }
  }

  async handleSeatDialog() {
    try {
      console.log(`💰 AI ${this.config.name} handling seat dialog...`);
      
      // First, try to use the dropdown with a standard buy-in option
      try {
        const buyInDropdown = await this.driver.findElement(
          By.css('[data-testid="buyin-dropdown"]')
        );
        
        // Select a reasonable buy-in option (usually the first or second option)
        const options = await buyInDropdown.findElements(By.css('option'));
        if (options.length > 1) {
          // Skip first option if it's placeholder, use second option
          const optionIndex = Math.min(1, options.length - 2);
          await options[optionIndex].click();
          console.log(`✅ AI ${this.config.name} selected buy-in option ${optionIndex}`);
        }
        
      } catch (dropdownError) {
        console.log(`⚠️ Dropdown selection failed, trying custom input...`);
        
        // If dropdown fails, try custom input approach
        try {
          const buyInDropdown = await this.driver.findElement(
            By.css('[data-testid="buyin-dropdown"]')
          );
          
          // Select custom option (value = -1)
          await this.driver.executeScript(
            "arguments[0].value = '-1'; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", 
            buyInDropdown
          );
          await this.delay(500);
          
          // Fill custom input
          const customInput = await this.driver.wait(
            until.elementLocated(By.css('[data-testid="custom-buyin-input"]')),
            5000
          );
          
          await customInput.clear();
          await customInput.sendKeys('150'); // Standard AI buy-in
          await this.delay(500);
          
          console.log(`✅ AI ${this.config.name} entered custom buy-in: 150`);
          
        } catch (customError) {
          console.log(`⚠️ Custom input also failed, proceeding with defaults...`);
        }
      }
      
    } catch (error) {
      console.log(`💰 Seat dialog handling failed for ${this.config.name}: ${error.message}`);
    }
  }

  async confirmSeatSelection() {
    try {
      console.log(`🔘 AI ${this.config.name} looking for confirm button...`);
      
      // Wait for confirm button to be available and enabled
      const confirmButton = await this.driver.wait(
        until.elementLocated(By.css('[data-testid="confirm-seat-btn"]')),
        10000
      );
      
      // Wait for button to be enabled (buy-in validation to pass)
      await this.driver.wait(
        until.elementIsEnabled(confirmButton),
        5000
      );
      
      // Scroll button into view and click
      await this.driver.executeScript(
        "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", 
        confirmButton
      );
      await this.delay(300);
      
      // Capture browser console before clicking
      const logsBefore = await this.driver.manage().logs().get('browser');
      console.log(`🔍 Browser logs before confirm click: ${logsBefore.length} entries`);
      
      // Click the confirm button
      await confirmButton.click();
      console.log(`✅ AI ${this.config.name} clicked confirm button`);
      
      // Wait a bit for any WebSocket responses
      await this.delay(2000);
      
      // Capture browser console after clicking
      const logsAfter = await this.driver.manage().logs().get('browser');
      const newLogs = logsAfter.slice(logsBefore.length);
      console.log(`🔍 New browser logs after confirm click: ${newLogs.length} entries`);
      
      // Show relevant logs
      newLogs.forEach(log => {
        if (log.message.includes('takeSeat') || 
            log.message.includes('seatTaken') || 
            log.message.includes('seatError') ||
            log.message.includes('WebSocket') ||
            log.message.includes('socket') ||
            log.level.name === 'SEVERE') {
          console.log(`🔍 Relevant log: ${log.level.name}: ${log.message}`);
        }
      });
      
      // **CRITICAL**: Manually trigger takeSeat via the authenticated WebSocket
      // Since the UI button click doesn't seem to be working properly
      console.log(`🔌 Manually triggering takeSeat via WebSocket...`);
      
      await this.driver.executeScript(`
        console.log("🔌 AI: Manual takeSeat WebSocket call");
        
        if (window.aiSocket && window.aiSocket.connected) {
          console.log("🔌 AI: Using authenticated aiSocket for takeSeat");
          window.aiSocket.emit('takeSeat', { 
            seatNumber: arguments[0], 
            buyIn: arguments[1] 
          });
          console.log("🔌 AI: takeSeat event emitted manually");
        } else {
          console.log("🔌 AI: ERROR - No authenticated socket available");
        }
      `, randomSeat.number, 150); // Pass seat number and buy-in
      
      // Wait for WebSocket response
      await this.delay(3000);
      
    } catch (error) {
      console.error(`❌ Seat confirmation failed for ${this.config.name}: ${error.message}`);
      throw error;
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

  async ensureProperWebSocketAuth(tableId) {
    try {
      console.log(`🔌 AI ${this.config.name} ensuring proper WebSocket authentication...`);
      
      // Inject JavaScript to ensure complete WebSocket authentication and session setup
      const authResult = await this.driver.executeScript(`
        console.log("🔌 AI: Setting up complete WebSocket authentication");
        
        const nickname = localStorage.getItem('nickname');
        if (!nickname) {
          console.log("🔌 AI: ERROR - No nickname in localStorage");
          return { success: false, error: "No nickname found" };
        }
        
        console.log("🔌 AI: Found nickname:", nickname);
        
        // Method 1: Try to connect using socket.io directly
        return new Promise((resolve) => {
          const io = window.io;
          if (!io) {
            console.log("🔌 AI: ERROR - socket.io not available");
            resolve({ success: false, error: "socket.io not available" });
            return;
          }
          
          console.log("🔌 AI: Creating new socket connection...");
          const socket = io('http://localhost:3001');
          
          let authCompleted = false;
          const timeoutId = setTimeout(() => {
            if (!authCompleted) {
              console.log("🔌 AI: Authentication timeout");
              socket.disconnect();
              resolve({ success: false, error: "Authentication timeout" });
            }
          }, 10000);
          
          socket.on('connect', () => {
            console.log("🔌 AI: Socket connected, sending userLogin...");
            socket.emit('userLogin', { nickname: nickname });
          });
          
          // Wait for login confirmation then join table
          socket.on('onlineUsers:update', (data) => {
            console.log("🔌 AI: Received onlineUsers:update, joining table...");
            socket.emit('joinTable', { tableId: ${tableId}, nickname: nickname });
          });
          
          // Wait for table join confirmation
          socket.on('tableJoined', (data) => {
            console.log("🔌 AI: Successfully joined table:", data);
            
            // Keep this socket connection alive by storing it globally
            window.aiSocket = socket;
            
            clearTimeout(timeoutId);
            authCompleted = true;
            resolve({ 
              success: true, 
              socketId: socket.id,
              gameId: data.gameId,
              tableId: data.tableId 
            });
          });
          
          socket.on('tableError', (error) => {
            console.log("🔌 AI: Table join error:", error);
            clearTimeout(timeoutId);
            authCompleted = true;
            socket.disconnect();
            resolve({ success: false, error: error });
          });
          
          socket.on('connect_error', (error) => {
            console.log("🔌 AI: Connection error:", error);
            clearTimeout(timeoutId);
            authCompleted = true;
            resolve({ success: false, error: error.message });
          });
        });
      `);
      
      console.log(`🔍 WebSocket auth result:`, authResult);
      
      if (authResult && authResult.success) {
        console.log(`✅ AI ${this.config.name} WebSocket authentication successful!`);
        console.log(`🔍 Socket ID: ${authResult.socketId}, Game ID: ${authResult.gameId}`);
        
        // Additional wait for session data to propagate
        await this.delay(3000);
      } else {
        console.log(`⚠️ AI ${this.config.name} WebSocket authentication failed:`, authResult?.error);
      }
      
    } catch (error) {
      console.log(`⚠️ WebSocket authentication failed for ${this.config.name}: ${error.message}`);
    }
  }

  async checkIfStillObserver() {
    try {
      console.log(`🔍 AI ${this.config.name} checking observer status...`);
      
      // Method 1: Check for explicit observer view elements
      const observerIndicators = await this.driver.findElements(
        By.css('[data-testid="observer-view"], .observer-mode, .observer-status')
      );
      
      console.log(`🔍 Found ${observerIndicators.length} observer indicators`);
      
      if (observerIndicators.length > 0) {
        console.log(`🔍 Still observer (explicit indicators found)`);
        return true; // Still observer
      }
      
      // Method 2: Check if we can see available seat buttons (observers can see these)
      const availableSeats = await this.driver.findElements(
        By.css('[data-testid*="available-seat"]')
      );
      
      console.log(`🔍 Found ${availableSeats.length} available seat buttons`);
      
      // Method 3: Check for player-specific elements that only seated players would see
      const playerIndicators = await this.driver.findElements(
        By.css('.player-actions, [data-testid*="action-button"], .action-buttons button')
      );
      
      console.log(`🔍 Found ${playerIndicators.length} player action indicators`);
      
      // Method 4: Check the page URL for clues
      const currentUrl = await this.driver.getCurrentUrl();
      console.log(`🔍 Current URL: ${currentUrl}`);
      
      // Method 5: Check browser console for any takeSeat responses
      const logs = await this.driver.manage().logs().get('browser');
      const recentLogs = logs.slice(-10).map(log => log.message);
      console.log(`🔍 Recent browser logs:`, recentLogs.slice(0, 3)); // Show first 3 recent logs
      
      // If we have available seat buttons but no player actions, we're likely still observing
      if (availableSeats.length > 0 && playerIndicators.length === 0) {
        console.log(`🔍 Still observer (can see available seats but no player actions)`);
        return true;
      }
      
      // If we have player action buttons, we're likely seated
      if (playerIndicators.length > 0) {
        console.log(`🔍 Appears to be seated (found player action buttons)`);
        return false;
      }
      
      // Default: if we can't determine clearly, assume still observer
      console.log(`🔍 Cannot determine clearly, assuming still observer`);
      return true;
      
    } catch (error) {
      console.log(`⚠️ Could not determine observer status: ${error.message}`);
      return true; // Assume still observer if we can't determine
    }
  }

  async handleWelcomePopupAndNavigation(tableId) {
    try {
      console.log(`🎉 AI ${this.config.name} handling welcome popup...`);
      
      // Wait for welcome popup to appear
      const welcomePopup = await this.driver.wait(
        until.elementLocated(By.css('.welcome-popup, [data-testid="welcome-popup"], .popup-overlay')),
        10000
      );
      
      console.log(`✅ Welcome popup detected`);
      
      // Look for the continue/complete button in the popup
      const continueSelectors = [
        'button[data-testid="continue-btn"]',
        'button[data-testid="welcome-continue"]',
        'button:contains("Continue")',
        'button:contains("Let\'s Go")',
        'button:contains("Join Game")',
        '.popup button',
        '.welcome-popup button'
      ];
      
      let continueButton = null;
      for (const selector of continueSelectors) {
        try {
          if (selector.includes(':contains')) {
            continueButton = await this.driver.findElement(
              By.xpath(`//button[contains(text(), 'Continue') or contains(text(), 'Go') or contains(text(), 'Join')]`)
            );
          } else {
            continueButton = await this.driver.findElement(By.css(selector));
          }
          console.log(`✅ Found continue button with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (continueButton) {
        await continueButton.click();
        console.log(`🔘 Clicked continue button`);
        
        // Wait for navigation to join-table page
        await this.driver.wait(
          until.urlContains('/join-table'),
          10000
        );
        console.log(`✅ Navigated to join-table page`);
        
        // Wait a bit for the page to load
        await this.delay(2000);
        
        // Look for the final join/enter game button on the join-table page
        const joinGameSelectors = [
          'button[data-testid="join-game-btn"]',
          'button:contains("Join Game")',
          'button:contains("Enter Game")',
          'button:contains("Start Playing")',
          '.join-button',
          'button[type="submit"]'
        ];
        
        let joinGameButton = null;
        for (const selector of joinGameSelectors) {
          try {
            if (selector.includes(':contains')) {
              joinGameButton = await this.driver.findElement(
                By.xpath(`//button[contains(text(), 'Join') or contains(text(), 'Enter') or contains(text(), 'Start')]`)
              );
            } else {
              joinGameButton = await this.driver.findElement(By.css(selector));
            }
            console.log(`✅ Found join game button with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
        
        if (joinGameButton) {
          await joinGameButton.click();
          console.log(`🔘 Clicked join game button`);
          await this.delay(3000);
        } else {
          // Fallback: navigate directly to game page
          console.log(`🔄 No join game button found, navigating directly...`);
          await this.driver.get(`http://localhost:3000/game/${tableId}`);
          await this.delay(3000);
        }
      } else {
        console.log(`⚠️ No continue button found in welcome popup`);
      }
      
    } catch (error) {
      console.log(`⚠️ Welcome popup handling failed: ${error.message}`);
      // Fallback: navigate directly to game page
      await this.driver.get(`http://localhost:3000/game/${tableId}`);
      await this.delay(3000);
    }
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
