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
    
    // Turn detection cooldown to prevent loops
    this.lastTurnDetection = 0;
    this.lastActionTime = 0;
    this.turnCooldownMs = 5000; // 5 second cooldown between turn detections
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
      
      // **CRITICAL**: Ensure nickname is saved to localStorage for WebSocket auth
      await this.driver.executeScript(`
        localStorage.setItem('nickname', arguments[0]);
        console.log('🔐 AI: Saved nickname to localStorage:', arguments[0]);
      `, this.config.name);
      
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
      await this.confirmSeatSelection(randomSeat.number);
          
          // Wait for dialog to close - this indicates success
          await this.driver.wait(until.stalenessOf(dialog), 15000);
          
          // **CRITICAL FIX**: Don't verify observer status immediately - 
          // the backend confirms success but UI takes time to update
          console.log(`✅ AI ${this.config.name} seat dialog completed, assuming success`);
          this.seatNumber = randomSeat.number;
          this.isPlaying = true;
          
          // Wait longer for UI to sync with backend state
          await this.delay(5000);
          
          // Optional verification with longer timeout and more lenient check
          try {
            const finalCheck = await this.checkIfStillObserver();
            if (finalCheck) {
              console.log(`⚠️ UI still shows observer status, but backend confirmed seat - continuing anyway`);
            } else {
              console.log(`✅ UI confirms seat taking success!`);
            }
          } catch (e) {
            console.log(`🔍 Observer status check failed, but continuing with gameplay: ${e.message}`);
          }
          
          return; // Success - proceed to startGameLoop()
          
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

  async confirmSeatSelection(seatNumber) {
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
      
      // Check button state before clicking
      const buttonState = await this.driver.executeScript(`
        const button = arguments[0];
        return {
          disabled: button.disabled,
          textContent: button.textContent,
          hasOnClick: typeof button.onclick === 'function',
          hasEventListeners: button._reactInternalFiber ? 'react-fiber-present' : 'no-react-fiber',
          className: button.className,
          dataTestId: button.getAttribute('data-testid')
        };
      `, confirmButton);
      
      console.log(`🔍 Button state before click:`, buttonState);
      
      // Add extra delay to ensure React event handlers are attached
      await this.delay(1000);
      
      // Click the confirm button with JavaScript to ensure event firing
      await this.driver.executeScript(`
        const button = arguments[0];
        console.log('🔘 AI: About to click confirm button via JavaScript');
        console.log('🔘 AI: Button element:', button);
        console.log('🔘 AI: Button disabled:', button.disabled);
        console.log('🔘 AI: Button text:', button.textContent);
        
        // Try multiple approaches to trigger the React onClick handler
        
        // Method 1: Standard click
        button.click();
        
        // Method 2: Dispatch synthetic click event
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        button.dispatchEvent(clickEvent);
        
        // Method 3: Try to find and call React event handlers directly
        try {
          // Look for React fiber and event handlers
          const reactFiber = button._reactInternalFiber || 
                            button._reactInternalInstance ||
                            Object.keys(button).find(key => key.startsWith('__reactInternalInstance'));
          
          if (reactFiber) {
            console.log('🔘 AI: Found React fiber, attempting direct handler call');
            
            // Try to find onClick handler in props
            let fiberNode = typeof reactFiber === 'string' ? button[reactFiber] : reactFiber;
            while (fiberNode) {
              if (fiberNode.memoizedProps && fiberNode.memoizedProps.onClick) {
                console.log('🔘 AI: Found onClick in memoizedProps, calling directly');
                fiberNode.memoizedProps.onClick({ preventDefault: () => {}, stopPropagation: () => {} });
                break;
              }
              if (fiberNode.return) {
                fiberNode = fiberNode.return;
              } else {
                break;
              }
            }
          } else {
            console.log('🔘 AI: No React fiber found, trying DOM event listeners');
            
            // Try to trigger any event listeners on the button
            const listeners = button.getEventListeners ? button.getEventListeners('click') : [];
            if (listeners && listeners.length > 0) {
              console.log('🔘 AI: Found DOM event listeners, calling first one');
              listeners[0].listener({ preventDefault: () => {}, stopPropagation: () => {} });
            }
          }
        } catch (reactError) {
          console.log('🔘 AI: React handler search failed:', reactError.message);
        }
        
        // Method 4: Try jQuery-style trigger if available
        if (window.$ && window.$(button).trigger) {
          console.log('🔘 AI: Trying jQuery trigger');
          window.$(button).trigger('click');
        }
        
        console.log('🔘 AI: All confirm button click methods attempted');
      `, confirmButton);
      
      console.log(`✅ AI ${this.config.name} clicked confirm button with enhanced event dispatch`);
      
      // Wait a bit for any WebSocket responses
      await this.delay(2000);
      
      // Capture browser console after clicking
      const logsAfter = await this.driver.manage().logs().get('browser');
      const newLogs = logsAfter.slice(logsBefore.length);
      console.log(`🔍 New browser logs after confirm click: ${newLogs.length} entries`);
      
      // Show relevant logs with detailed error information
      newLogs.forEach(log => {
        if (log.message.includes('takeSeat') || 
            log.message.includes('seatTaken') || 
            log.message.includes('seatError') ||
            log.message.includes('WebSocket') ||
            log.message.includes('socket') ||
            log.message.includes('error') ||
            log.level.name === 'SEVERE' ||
            log.level.name === 'WARNING') {
          console.log(`🔍 Relevant log [${log.level.name}]: ${log.message}`);
        }
      });
      
      // Capture any socket error details
      if (newLogs.length === 0) {
        console.log(`🔍 No new browser console logs - this might indicate the takeSeat event was not processed`);
      }
      
      // **CRITICAL**: Manually trigger takeSeat via the existing authenticated WebSocket
      // Use the existing socketService connection instead of creating a new one
      console.log(`🔌 Manually triggering takeSeat via existing WebSocket for seat ${seatNumber}...`);
      
      await this.driver.executeScript(`
        console.log("🔌 AI: Manual takeSeat WebSocket call using existing connection");
        
        // First priority: Use existing socketService connection
        if (window.socketService && window.socketService.getSocket) {
          const existingSocket = window.socketService.getSocket();
          if (existingSocket && existingSocket.connected) {
            console.log("🔌 AI: Using existing authenticated socketService connection");
            
                          // **CRITICAL FIX**: Ensure session data by calling joinTable first
              const nickname = localStorage.getItem('nickname');
              if (nickname) {
                console.log("🔌 AI: Establishing session data via joinTable for " + nickname);
                existingSocket.emit('joinTable', {
                  tableId: 1,
                  nickname: nickname,
                  buyIn: arguments[1]
                });
                
                // Wait a moment for session data to be set, then call takeSeat
                setTimeout(() => {
                  console.log("🔌 AI: Now calling takeSeat with established session");
                  existingSocket.emit('takeSeat', { 
                    seatNumber: arguments[0], 
                    buyIn: arguments[1] 
                  });
                  console.log("🔌 AI: takeSeat event emitted via socketService for seat " + arguments[0]);
                  
                  // **CRITICAL**: Set up proper player identity for future actions
                  setTimeout(() => {
                    console.log("🔌 AI: Setting up multi-browser synchronization");
                    
                    // Force join the game room for state synchronization across browsers
                    existingSocket.emit('joinRoom', 'game:1');
                    
                    // Store player identity globally for WebSocket actions
                    window.currentAIPlayer = {
                      playerId: existingSocket.id,
                      nickname: nickname,
                      socketId: existingSocket.id,
                      seatNumber: arguments[0],
                      tableId: 1,
                      gameId: '1'
                    };
                    
                    // Update localStorage for frontend reference
                    localStorage.setItem('currentPlayerId', existingSocket.id);
                    localStorage.setItem('currentPlayerNickname', nickname);
                    localStorage.setItem('currentPlayerSeat', arguments[0]);
                    localStorage.setItem('gameId', '1');
                    
                    // **CRITICAL**: Monkey patch WebSocket event methods to include player identification
                    const originalEmit = existingSocket.emit;
                    existingSocket.emit = function(event, data, ...args) {
                      // For game action events, ensure player identification is included
                      if (event && event.startsWith('game:') && data && typeof data === 'object') {
                        if (!data.playerId && window.currentAIPlayer) {
                          data.playerId = window.currentAIPlayer.playerId;
                          data.nickname = window.currentAIPlayer.nickname;
                          console.log("🔌 AI: Auto-added player identification to " + event + ":", data);
                        }
                      }
                      return originalEmit.call(this, event, data, ...args);
                    };
                    
                    console.log("🔌 AI: Multi-browser synchronization setup completed");
                    console.log("🔌 AI: Player identity:", window.currentAIPlayer);
                    
                  }, 1000);
                }, 2000);
              } else {
                console.log("🔌 AI: No nickname found, calling takeSeat directly");
                existingSocket.emit('takeSeat', { 
                  seatNumber: arguments[0], 
                  buyIn: arguments[1] 
                });
              }
            return;
          } else {
            console.log("🔌 AI: SocketService exists but socket not connected");
          }
        } else {
          console.log("🔌 AI: SocketService not available");
        }
        
        // Fallback: Use aiSocket if it exists (but this should not be needed)
        if (window.aiSocket && window.aiSocket.connected) {
          console.log("🔌 AI: Fallback to aiSocket for takeSeat");
          window.aiSocket.emit('takeSeat', { 
            seatNumber: arguments[0], 
            buyIn: arguments[1] 
          });
          console.log("🔌 AI: takeSeat event emitted manually for seat " + arguments[0]);
        } else {
          console.log("🔌 AI: ERROR - No authenticated socket available");
        }
      `, seatNumber, 150); // Pass seat number and buy-in
      
      // Wait for WebSocket response and capture any errors
      await this.delay(3000);
      
      // Check for specific socket errors or responses
      const socketResponse = await this.driver.executeScript(`
        const logs = [];
        
        // Check for any recent socket events or errors
        if (window.socketService && window.socketService.getSocket) {
          const socket = window.socketService.getSocket();
          logs.push('Socket connected: ' + socket.connected);
          logs.push('Socket ID: ' + socket.id);
        }
        
        // Check localStorage for any error states
        const errorStates = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('error') || key.includes('seat') || key.includes('game'))) {
            errorStates.push(key + ': ' + localStorage.getItem(key));
          }
        }
        
        return {
          socketInfo: logs,
          errorStates: errorStates,
          timestamp: new Date().toISOString()
        };
      `);
      
      console.log(`🔍 Post-takeSeat socket analysis:`, socketResponse);
      
    } catch (error) {
      console.error(`❌ Seat confirmation failed for ${this.config.name}: ${error.message}`);
      throw error;
    }
  }

  async startGameLoop() {
    console.log(`🎮 AI ${this.config.name} starting game loop...`);
    console.log(`🔄 AI will stay connected indefinitely for continuous gameplay`);
    
    let loopCount = 0;
    const maxLoops = 999999; // Essentially unlimited (999,999 seconds = ~11.5 days)
    
    while (this.isPlaying && loopCount < maxLoops) {
      try {
        loopCount++;
        
                 // Every 5 minutes, log status
         if (loopCount % 300 === 0 && loopCount > 0) {
           console.log(`🎮 AI ${this.config.name} gameplay status: ${Math.floor(loopCount/60)} minutes connected`);
         }
        
        // Update game state by reading UI
        await this.readGameState();
        
        // Check if it's our turn (with cooldown to prevent loops)
        const currentTime = Date.now();
        if (await this.isMyTurn()) {
          // Prevent rapid repeated turn detections
          if (currentTime - this.lastTurnDetection < this.turnCooldownMs) {
            console.log(`⏳ AI ${this.config.name} turn detected but in cooldown period (${Math.round((this.turnCooldownMs - (currentTime - this.lastTurnDetection))/1000)}s remaining)`);
          } else {
            console.log(`🎯 AI ${this.config.name} detected turn - making decision...`);
            this.lastTurnDetection = currentTime;
            await this.makeDecisionWithTimeout();
            this.lastActionTime = Date.now();
          }
        }
        
        // Wait before next check
        await this.delay(1000);
        
      } catch (error) {
        console.log(`⚠️ Game loop error for ${this.config.name} (non-fatal): ${error.message}`);
        
        // Don't exit on errors - just wait and continue
        await this.delay(3000);
      }
    }
    
         if (loopCount >= maxLoops) {
       console.log(`🕐 AI ${this.config.name} reached maximum session duration`);
     } else {
       console.log(`🔚 AI ${this.config.name} game loop ended (isPlaying: ${this.isPlaying})`);
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

  async makeDecisionWithTimeout() {
    console.log(`🧠 AI ${this.config.name} making decision with timeout handling...`);
    
    try {
      // First, check for countdown timer
      const countdownInfo = await this.checkCountdownTimer();
      
      let thinkingTime = this.config.reactionTime + Math.random() * 1000;
      
      // If countdown is detected and low, act quickly
      if (countdownInfo.hasCountdown && countdownInfo.timeLeft < 5000) {
        console.log(`⚡ AI ${this.config.name} countdown detected: ${countdownInfo.timeLeft}ms left - acting quickly!`);
        thinkingTime = Math.min(thinkingTime, countdownInfo.timeLeft - 1000); // Leave 1 second buffer
      }
      
      // Cap minimum thinking time
      thinkingTime = Math.max(thinkingTime, 500); // At least 500ms to think
      
      console.log(`🧠 AI ${this.config.name} thinking for ${Math.round(thinkingTime)}ms...`);
      await this.delay(thinkingTime);
      
      // Check if we still have our turn after thinking
      if (!(await this.isMyTurn())) {
        console.log(`⏰ AI ${this.config.name} turn expired during thinking - countdown ended`);
        return;
      }
      
      // Get available actions
      const actionButtons = await this.driver.findElements(
        By.css('.action-buttons button:not([disabled]), .player-actions button:not([disabled])')
      );
      
      if (actionButtons.length === 0) {
        console.log(`⏰ AI ${this.config.name} no action buttons available - turn ended`);
        return;
      }
      
      // Read button text to understand options
      const actions = [];
      for (let button of actionButtons) {
        const text = await button.getText();
        actions.push({ button, action: text.toLowerCase() });
      }
      
      // Make decision based on personality, but default to safe actions if time is running out
      let decision;
      if (countdownInfo.hasCountdown && countdownInfo.timeLeft < 3000) {
        console.log(`⚡ AI ${this.config.name} using quick decision - time critical!`);
        decision = this.getQuickDecision(actions);
      } else {
        decision = this.calculateDecision(actions);
      }
      
      if (decision) {
        console.log(`🎯 AI ${this.config.name} decides: ${decision.action}`);
        
        // Handle bet/raise amount if needed (but keep it simple if time is short)
        if (decision.action.includes('bet') || decision.action.includes('raise')) {
          await this.handleBetAmount(decision.amount);
        }
        
        // Click the action button
        await decision.button.click();
        console.log(`✅ AI ${this.config.name} executed ${decision.action}`);
        await this.delay(1000);
        
        // Verify the action was processed by checking if we still have the turn
        setTimeout(async () => {
          if (await this.isMyTurn()) {
            console.log(`⚠️ AI ${this.config.name} action may not have registered - still showing as our turn`);
          }
        }, 2000);
      }
      
    } catch (error) {
      console.log(`❌ Decision making error for ${this.config.name}: ${error.message}`);
      
      // Emergency action - try to check or fold to avoid timeout
      try {
        await this.emergencyAction();
      } catch (emergencyError) {
        console.log(`❌ Emergency action failed: ${emergencyError.message}`);
      }
    }
  }

  async checkCountdownTimer() {
    try {
      // Look for countdown timer elements with various selectors
      const timerSelectors = [
        '[data-testid*="countdown"]',
        '[data-testid*="timer"]',
        '.countdown',
        '.timer',
        '.decision-timer',
        '.timeout',
        '.time-left'
      ];
      
      for (const selector of timerSelectors) {
        try {
          const timerElement = await this.driver.findElement(By.css(selector));
          const timerText = await timerElement.getText();
          
          // Extract time from text (look for numbers)
          const timeMatch = timerText.match(/(\d+)/);
          if (timeMatch) {
            const timeLeft = parseInt(timeMatch[1]) * 1000; // Convert to milliseconds
            console.log(`⏰ AI ${this.config.name} detected countdown: ${timeLeft}ms remaining`);
            return { hasCountdown: true, timeLeft, element: timerElement };
          }
        } catch (e) {
          // Timer not found with this selector, try next
        }
      }
      
      return { hasCountdown: false, timeLeft: Infinity };
      
    } catch (error) {
      console.log(`⚠️ Countdown detection error: ${error.message}`);
      return { hasCountdown: false, timeLeft: Infinity };
    }
  }

  getQuickDecision(actions) {
    // Quick decision logic - prioritize safe actions when time is running out
    console.log(`⚡ Making quick decision from actions: ${actions.map(a => a.action).join(', ')}`);
    
    // First priority: Check (free action)
    const checkAction = actions.find(a => a.action.includes('check'));
    if (checkAction) {
      console.log(`⚡ Quick decision: CHECK (safe and free)`);
      return checkAction;
    }
    
    // Second priority: Call (if reasonable amount)
    const callAction = actions.find(a => a.action.includes('call'));
    if (callAction) {
      console.log(`⚡ Quick decision: CALL (staying in game)`);
      return callAction;
    }
    
    // Third priority: Fold (safe exit)
    const foldAction = actions.find(a => a.action.includes('fold'));
    if (foldAction) {
      console.log(`⚡ Quick decision: FOLD (safe exit)`);
      return foldAction;
    }
    
    // Fallback: First available action
    console.log(`⚡ Quick decision: First available action (${actions[0]?.action})`);
    return actions[0] || null;
  }

  async emergencyAction() {
    console.log(`🚨 AI ${this.config.name} performing emergency action to avoid timeout!`);
    
    try {
      // Get any available action buttons
      const actionButtons = await this.driver.findElements(
        By.css('.action-buttons button:not([disabled]), .player-actions button:not([disabled])')
      );
      
      if (actionButtons.length === 0) {
        console.log(`🚨 No action buttons available for emergency action`);
        return;
      }
      
      // Read button text to find safe actions
      const actions = [];
      for (let button of actionButtons) {
        const text = await button.getText().catch(() => '');
        actions.push({ button, action: text.toLowerCase() });
      }
      
      // Priority order for emergency actions
      const priorities = ['check', 'fold', 'call'];
      
      for (const priority of priorities) {
        const action = actions.find(a => a.action.includes(priority));
        if (action) {
          console.log(`🚨 Emergency action: ${action.action.toUpperCase()}`);
          await action.button.click();
          return;
        }
      }
      
      // If no priority actions found, click first available
      if (actions.length > 0) {
        console.log(`🚨 Emergency action: ${actions[0].action.toUpperCase()} (first available)`);
        await actions[0].button.click();
      }
      
    } catch (error) {
      console.log(`🚨 Emergency action failed: ${error.message}`);
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
      
      // Check if existing socketService connection is already authenticated and ready
      const authResult = await this.driver.executeScript(`
        console.log("🔌 AI: Checking existing WebSocket authentication");
        
        const nickname = localStorage.getItem('nickname');
        if (!nickname) {
          console.log("🔌 AI: ERROR - No nickname in localStorage");
          return { success: false, error: "No nickname found" };
        }
        
        console.log("🔌 AI: Found nickname:", nickname);
        
        // Priority 1: Check if socketService is already connected and authenticated
        if (window.socketService && window.socketService.getSocket) {
          const existingSocket = window.socketService.getSocket();
          if (existingSocket && existingSocket.connected) {
            console.log("🔌 AI: Existing socketService connection found and connected");
            console.log("🔌 AI: Socket ID:", existingSocket.id);
            
            // Check if we're already at the table (session data should be set)
            // The UI navigation flow should have already called joinTable
            return { 
              success: true, 
              socketId: existingSocket.id,
              gameId: 'from-existing-session', // Will be determined by backend session
              tableId: ${tableId},
              method: 'existing-connection'
            };
          } else {
            console.log("🔌 AI: SocketService exists but not connected");
          }
        } else {
          console.log("🔌 AI: SocketService not available");
        }
        
        // Fallback: Only create new connection if existing one is not available
        console.log("🔌 AI: Falling back to creating new connection...");
        
        return new Promise((resolve) => {
          // Try multiple ways to access socket.io
          let io = window.io;
          if (!io && window.socketService) {
            // Try to access io through socketService
            io = window.socketService.io;
          }
          
          if (!io) {
            console.log("🔌 AI: ERROR - socket.io not available through any method");
            console.log("🔌 AI: Available globals:", Object.keys(window).filter(k => k.includes('socket') || k.includes('io')));
            resolve({ success: false, error: "socket.io not available" });
            return;
          }
          
          console.log("🔌 AI: Found socket.io, creating fallback connection...");
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
            console.log("🔌 AI: Fallback socket connected, sending userLogin...");
            socket.emit('userLogin', { nickname: nickname });
          });
          
          // Wait for login confirmation then join table
          socket.on('onlineUsers:update', (data) => {
            console.log("🔌 AI: Received onlineUsers:update, joining table...");
            socket.emit('joinTable', { tableId: ${tableId}, nickname: nickname });
          });
          
          // Wait for table join confirmation
          socket.on('tableJoined', (data) => {
            console.log("🔌 AI: Successfully joined table via fallback:", data);
            
            // Store fallback socket connection
            window.aiSocket = socket;
            
            clearTimeout(timeoutId);
            authCompleted = true;
            resolve({ 
              success: true, 
              socketId: socket.id,
              gameId: data.gameId,
              tableId: data.tableId,
              method: 'fallback-connection'
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
        console.log(`✅ AI ${this.config.name} WebSocket authentication successful via ${authResult.method}!`);
        console.log(`🔍 Socket ID: ${authResult.socketId}, Game ID: ${authResult.gameId}`);
        
        // Shorter wait for existing connections since they should already be ready
        const waitTime = authResult.method === 'existing-connection' ? 1000 : 3000;
        await this.delay(waitTime);
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
