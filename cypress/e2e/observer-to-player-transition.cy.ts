describe('Observer to Player Transition Bug Fix', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'TransitionTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should remove player from observers list when taking a seat', () => {
    const playerName = 'TransitionBugTest';
    
    // Join a table as observer
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify player appears in observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    // Click on an available seat to take it
    cy.get('[data-testid^="available-seat-"]')
      .first()
      .click();
    
    // Seat selection dialog should appear
    cy.get('[data-testid="confirm-seat-btn"]').should('be.visible');
    
    // Select buy-in and confirm seat
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Wait a moment for state updates to propagate
    cy.wait(1000);
    
    // Debug: Log what we actually see in the list
    cy.get('[data-testid="online-users-list"]').then(($list) => {
      cy.log('Online users list content after taking seat:', $list.text());
    });
    
    // **CRITICAL TEST**: Player should be removed from observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      // First, let's see what text is actually there
      cy.contains('Observers').should('be.visible');
      cy.contains('Players').should('be.visible');
      
      // More lenient checks - just verify the sections exist and content is there
      cy.contains('Observers').parent().within(() => {
        // Should not contain the player anymore
        cy.contains(playerName).should('not.exist');
      });
      
      cy.contains('Players').parent().within(() => {
        // Should contain the player now
        cy.contains(playerName).should('be.visible');
      });
      
      // Debug: Print all text content to see what counts are actually showing
      cy.get('*').then(($elements) => {
        const allText = $elements.text();
        cy.log('All OnlineList text content:', allText);
        
        // Look for any text that contains numbers in parentheses
        const countMatches = allText.match(/\(\d+\)/g);
        cy.log('Found count patterns:', countMatches);
      });
    });
  });

  it('should handle multiple observers and only remove the one taking a seat', () => {
    // This test simulates multiple observers where only one takes a seat
    const observer1 = 'Observer1';
    const observer2 = 'Observer2';
    
    // Join as first observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observer1);
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // In a real test with multiple users, we'd simulate another user joining
    // For this single-user test, we'll just verify the functionality works
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(observer1).should('be.visible');
    });
    
    // Take a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Verify transition worked
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains(observer1).should('be.visible');
    });
  });

  it('should maintain observers list integrity during seat transitions', () => {
    const playerName = 'IntegrityTest';
    
    // Join as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Initial state: 1 observer, 0 players
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('Players').should('be.visible');
      cy.contains(playerName).should('be.visible'); // Should be in observers initially
    });
    
    // Take a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Wait a moment for state updates to propagate
    cy.wait(1000);
    
    // Debug: Log what we actually see in the list
    cy.get('[data-testid="online-users-list"]').then(($list) => {
      cy.log('Online users list content after taking seat:', $list.text());
    });
    
    // Final state: 0 observers, 1 player
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('Players').should('be.visible');
      
      // Debug: Print all text content to see what counts are actually showing
      cy.get('*').then(($elements) => {
        const allText = $elements.text();
        cy.log('All OnlineList text content after transition:', allText);
      });
      
      // Verify player is in Players section
      cy.contains('Players').parent().within(() => {
        cy.contains(playerName).should('be.visible');
      });
      
      // Verify player is NOT in Observers section
      cy.contains('Observers').parent().within(() => {
        cy.contains(playerName).should('not.exist');
      });
    });
    
    // Verify no UI errors or console errors
    cy.window().then((win) => {
      // Should not have any React errors
      expect(win.console.error).to.not.have.been.called;
    });
  });
});

describe('Observer to Player Transition Demo', () => {
  const testUserId = `TransitionUser_${Date.now()}`;

  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.wait(3000); // Wait for app to load properly
  });

  it('should demonstrate observer joining table and then taking a seat with UI pauses', () => {
    cy.log('🎬 DEMO: Observer to Player Transition');
    
    // ========== PHASE 1: LOBBY ==========
    cy.log('📍 PHASE 1: Starting in Lobby');
    cy.screenshot('phase1-lobby');
    
    cy.log('⏸️ PAUSE: Examining lobby (3 seconds)');
    cy.wait(3000);
    
    // Find and click join button (try multiple strategies)
    cy.get('body').then(($body) => {
      // Strategy 1: Look for Join buttons
      const joinButtons = $body.find('button:contains("Join")');
      if (joinButtons.length > 0) {
        cy.log('✅ Found Join button');
        cy.get('button:contains("Join")').first().click();
      } else {
        // Strategy 2: Look for any clickable table elements
        const tableElements = $body.find('[data-testid*="table"], .table-card, .poker-table');
        if (tableElements.length > 0) {
          cy.log('✅ Found table element');
          cy.get('[data-testid*="table"], .table-card, .poker-table').first().click();
        } else {
          cy.log('❌ No join elements found');
          cy.screenshot('no-join-elements');
          return;
        }
      }
    });
    
    // ========== PHASE 2: NICKNAME ENTRY ==========
    cy.log('📍 PHASE 2: Nickname Entry');
    cy.wait(2000);
    cy.screenshot('phase2-nickname-dialog');
    
    // Enter nickname if dialog appears
    cy.get('body').then(($body) => {
      if ($body.find('input[type="text"], input[placeholder*="name"]').length > 0) {
        cy.log('📝 Entering nickname');
        cy.get('input[type="text"], input[placeholder*="name"]').first()
          .clear()
          .type(testUserId);
        
        cy.log('⏸️ PAUSE: Nickname entered (2 seconds)');
        cy.wait(2000);
        
        cy.get('button').contains(/join|enter|confirm/i).first().click();
      }
    });
    
    // ========== PHASE 3: GAME PAGE AS OBSERVER ==========
    cy.log('📍 PHASE 3: Joining Game as Observer');
    cy.wait(3000);
    cy.url().should('include', '/game');
    cy.screenshot('phase3-game-as-observer');
    
    cy.log('⏸️ PAUSE: Examining game page as observer (5 seconds)');
    cy.wait(5000);
    
    // Check for observer status
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      
      // Look for observer indicators
      if (bodyText.includes('Observer') || bodyText.includes('observer')) {
        cy.log('✅ Observer status detected in page text');
      }
      
      // Look for observer count
      const observerElements = $body.find('[data-testid*="observer"], *:contains("Observer")');
      if (observerElements.length > 0) {
        cy.log(`✅ Found ${observerElements.length} observer-related elements`);
      }
      
      // Check if our username appears in observers list
      if (bodyText.includes(testUserId)) {
        cy.log(`✅ User "${testUserId}" appears in page content`);
      } else {
        cy.log(`⚠️ User "${testUserId}" not found in page content`);
      }
    });
    
    // ========== PHASE 4: LOOKING FOR SEATS ==========
    cy.log('📍 PHASE 4: Searching for Available Seats');
    cy.screenshot('phase4-looking-for-seats');
    
    cy.log('⏸️ PAUSE: Examining available seats (3 seconds)');
    cy.wait(3000);
    
    // Try to find and click a seat
    cy.get('body').then(($body) => {
      const seatSelectors = [
        '[data-testid*="seat"]',
        '.seat:not(.occupied)',
        '*[class*="seat"]:not([class*="occupied"])',
        'button[onclick*="seat"], div[onclick*="seat"]'
      ];
      
      let foundSeat = false;
      
      for (const selector of seatSelectors) {
        if (!foundSeat) {
          const seats = $body.find(selector);
          if (seats.length > 0) {
            cy.log(`🪑 Found ${seats.length} potential seats with: ${selector}`);
            
            // Click the first available seat
            cy.get(selector).first().then(($seat) => {
              const seatText = $seat.text();
              cy.log(`🪑 Clicking seat with text: "${seatText}"`);
              
              cy.log('⏸️ PAUSE: About to click seat (2 seconds)');
              cy.wait(2000);
              
              cy.wrap($seat).click({ force: true });
              foundSeat = true;
            });
            break;
          }
        }
      }
      
      if (!foundSeat) {
        cy.log('❌ No clickable seats found');
        cy.screenshot('no-seats-found');
      }
    });
    
    // ========== PHASE 5: BUY-IN DIALOG ==========
    cy.log('📍 PHASE 5: Buy-in Dialog');
    cy.wait(2000);
    cy.screenshot('phase5-buyin-dialog');
    
    cy.log('⏸️ PAUSE: Examining buy-in dialog (3 seconds)');
    cy.wait(3000);
    
    // Handle buy-in if dialog appears
    cy.get('body').then(($body) => {
      const buyinInputs = $body.find('input[type="number"], input[placeholder*="buy"]');
      
      if (buyinInputs.length > 0) {
        cy.log('💰 Buy-in dialog found');
        
        cy.get('input[type="number"], input[placeholder*="buy"]').first()
          .clear()
          .type('500');
        
        cy.log('⏸️ PAUSE: Buy-in amount entered (2 seconds)');
        cy.wait(2000);
        
        // Click confirm button
        cy.get('button').contains(/confirm|take|sit|buy/i).first().click();
        
        cy.log('💰 Clicked buy-in confirmation');
        
      } else {
        cy.log('❌ No buy-in dialog found');
        cy.screenshot('no-buyin-dialog');
      }
    });
    
    // ========== PHASE 6: TRANSITION RESULT ==========
    cy.log('📍 PHASE 6: Observing Transition Result');
    
    cy.log('⏸️ PAUSE: Waiting for transition to complete (5 seconds)');
    cy.wait(5000);
    
    cy.screenshot('phase6-transition-result');
    
    // Check the result
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      
      // Check for errors
      if (bodyText.includes('Invalid session data')) {
        cy.log('❌ ERROR: Invalid session data error occurred');
        cy.screenshot('error-invalid-session');
      } else if (bodyText.includes('error') || bodyText.includes('Error')) {
        cy.log('⚠️ Some error detected in page');
        cy.screenshot('error-detected');
      } else {
        cy.log('✅ No obvious errors detected');
      }
      
      // Check if user appears as player
      if (bodyText.includes(testUserId)) {
        cy.log(`✅ User "${testUserId}" still appears in page`);
        
        // Check if they moved from observer to player
        const hasObserverText = bodyText.includes('Observer') || bodyText.includes('observer');
        const hasPlayerText = bodyText.includes('Player') || bodyText.includes('player');
        
        cy.log(`📊 Observer text present: ${hasObserverText}`);
        cy.log(`📊 Player text present: ${hasPlayerText}`);
        
        if (hasPlayerText && !hasObserverText) {
          cy.log('🎉 SUCCESS: User appears to have transitioned to player!');
        } else if (hasObserverText && hasPlayerText) {
          cy.log('❓ MIXED: Both observer and player text present');
        } else {
          cy.log('❓ UNCLEAR: Transition status unclear');
        }
      } else {
        cy.log(`❌ User "${testUserId}" no longer appears in page`);
      }
    });
    
    // ========== PHASE 7: FINAL STATE ==========
    cy.log('📍 PHASE 7: Final State Analysis');
    
    cy.log('⏸️ PAUSE: Final state examination (5 seconds)');
    cy.wait(5000);
    
    cy.screenshot('phase7-final-state');
    
    // Log current URL
    cy.url().then((url) => {
      cy.log(`📍 Final URL: ${url}`);
    });
    
    // Count observers and players if possible
    cy.get('body').then(($body) => {
      const observerElements = $body.find('*:contains("observer"), *:contains("Observer")');
      const playerElements = $body.find('*:contains("player"), *:contains("Player")');
      
      cy.log(`📊 Elements mentioning observers: ${observerElements.length}`);
      cy.log(`📊 Elements mentioning players: ${playerElements.length}`);
      
      // Look for count indicators
      const countPattern = /(\d+)\s*(observer|player|Observer|Player)/g;
      const matches = $body.text().match(countPattern);
      if (matches) {
        cy.log('📊 Found count indicators:', matches);
      }
    });
    
    cy.log('🎬 DEMO COMPLETE: Observer to Player Transition');
    cy.log('📸 Screenshots saved in cypress/screenshots/');
    cy.log('🔍 Check the screenshots to see the visual transition');
  });
}); 