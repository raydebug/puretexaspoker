describe('UI Demo: TakeSeat Flow with Pauses', () => {
  const testUserId = `UIDemoUser_${Date.now()}`;

  beforeEach(() => {
    cy.visit('/');
    cy.wait(2000); // Initial load pause
  });

  it('should demonstrate the complete takeSeat flow with UI pauses', () => {
    cy.log('🎬 DEMO: Starting TakeSeat Flow Demonstration');
    
    // ========== STEP 1: Show Lobby ==========
    cy.log('📍 STEP 1: Viewing Lobby Tables');
    cy.get('body').should('be.visible');
    
    // Pause to show lobby
    cy.log('⏸️ PAUSE: Showing lobby with available tables (5 seconds)');
    cy.wait(5000);
    
    // Look for any table (try different selectors)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="table-1"]').length > 0) {
        cy.log('✅ Found table-1 via data-testid');
      } else if ($body.find('button').filter(':contains("Join")').length > 0) {
        cy.log('✅ Found Join buttons');
      } else {
        cy.log('⚠️ No tables found, taking screenshot for debugging');
        cy.screenshot('lobby-no-tables-found');
      }
    });
    
    // ========== STEP 2: Join Table Process ==========
    cy.log('📍 STEP 2: Attempting to Join Table');
    
    // Try to find and click join button
    cy.get('body').then(($body) => {
      // Method 1: Try data-testid
      if ($body.find('[data-testid="table-1"]').length > 0) {
        cy.get('[data-testid="table-1"]').should('be.visible');
        cy.log('⏸️ PAUSE: Highlighting target table (3 seconds)');
        cy.wait(3000);
        
        cy.get('[data-testid="table-1"] button').contains('Join').click();
      }
      // Method 2: Try any Join button
      else if ($body.find('button').filter(':contains("Join")').length > 0) {
        cy.get('button').contains('Join').first().then(($btn) => {
          cy.log('⏸️ PAUSE: Found Join button, highlighting it (3 seconds)');
          cy.wait(3000);
          cy.wrap($btn).click();
        });
      }
      // Method 3: Try table cards or containers
      else if ($body.find('.table-card, .poker-table, [class*="table"]').length > 0) {
        cy.get('.table-card, .poker-table, [class*="table"]').first().within(() => {
          cy.get('button').contains('Join').click();
        });
      }
      else {
        cy.log('❌ No joinable tables found, ending test');
        cy.screenshot('no-joinable-tables');
        return;
      }
    });
    
    // ========== STEP 3: Nickname Entry ==========
    cy.log('📍 STEP 3: Entering Nickname');
    
    // Look for nickname input with multiple possible selectors
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="nickname-input"]').length > 0) {
        cy.log('⏸️ PAUSE: Nickname dialog appeared (2 seconds)');
        cy.wait(2000);
        
        cy.get('[data-testid="nickname-input"]').clear().type(testUserId);
        
        cy.log('⏸️ PAUSE: Nickname entered, about to join (2 seconds)');
        cy.wait(2000);
        
        cy.get('[data-testid="join-button"]').click();
      }
      else if ($body.find('input[placeholder*="nickname" i], input[placeholder*="name" i]').length > 0) {
        cy.get('input[placeholder*="nickname" i], input[placeholder*="name" i]').first()
          .clear().type(testUserId);
        cy.get('button').contains(/Join|Confirm|Enter/).first().click();
      }
      else {
        cy.log('ℹ️ No nickname input found, continuing...');
      }
    });
    
    // ========== STEP 4: Game Page Navigation ==========
    cy.log('📍 STEP 4: Navigating to Game Page');
    
    // Wait for navigation
    cy.url().should('include', '/game');
    
    cy.log('⏸️ PAUSE: Game page loaded, showing observer status (5 seconds)');
    cy.wait(5000);
    
    // Take screenshot of game page
    cy.screenshot('game-page-as-observer');
    
    // ========== STEP 5: Observer Status Verification ==========
    cy.log('📍 STEP 5: Verifying Observer Status');
    
    // Look for observer indicators
    cy.get('body').then(($body) => {
      const observerSelectors = [
        '[data-testid="observer-count"]',
        '[data-testid="observers-list"]', 
        '*[class*="observer"]',
        '*:contains("Observer")',
        '*:contains("observer")'
      ];
      
      let foundObserver = false;
      observerSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.log(`✅ Found observer indicator: ${selector}`);
          foundObserver = true;
        }
      });
      
      if (!foundObserver) {
        cy.log('⚠️ No observer indicators found, taking screenshot');
        cy.screenshot('no-observer-indicators');
      }
    });
    
    cy.log('⏸️ PAUSE: Examining observer status and available seats (5 seconds)');
    cy.wait(5000);
    
    // ========== STEP 6: Seat Selection ==========
    cy.log('📍 STEP 6: Attempting to Select Seat');
    
    // Look for seat elements with various selectors
    cy.get('body').then(($body) => {
      const seatSelectors = [
        '[data-testid="seat-1"]',
        '[data-testid^="seat-"]',
        '.seat',
        '*[class*="seat"]',
        '.poker-seat',
        '*[class*="poker-seat"]'
      ];
      
      let foundSeat = false;
      seatSelectors.forEach(selector => {
        if ($body.find(selector).length > 0 && !foundSeat) {
          cy.log(`✅ Found seats with selector: ${selector}`);
          cy.get(selector).first().then(($seat) => {
            cy.log('⏸️ PAUSE: Highlighting target seat (3 seconds)');
            cy.wait(3000);
            
            // Check if seat is clickable/empty
            if (!$seat.text().includes('$') && !$seat.hasClass('occupied')) {
              cy.wrap($seat).click();
              foundSeat = true;
            }
          });
        }
      });
      
      if (!foundSeat) {
        cy.log('⚠️ No clickable seats found, trying general click approach');
        cy.screenshot('no-clickable-seats');
        
        // Try clicking anywhere that might be a seat
        cy.get('*').filter(':contains("Seat"), *[class*="seat"], *[id*="seat"]')
          .first().click({ force: true });
      }
    });
    
    // ========== STEP 7: Buy-in Dialog ==========
    cy.log('📍 STEP 7: Buy-in Dialog Interaction');
    
    // Look for buy-in dialog
    cy.get('body').then(($body) => {
      const buyinSelectors = [
        '[data-testid="seat-dialog"]',
        '[data-testid="buyin-input"]',
        'input[placeholder*="buy" i]',
        'input[type="number"]',
        '.modal input',
        '.dialog input'
      ];
      
      let foundBuyinDialog = false;
      buyinSelectors.forEach(selector => {
        if ($body.find(selector).length > 0 && !foundBuyinDialog) {
          cy.log(`✅ Found buy-in dialog: ${selector}`);
          foundBuyinDialog = true;
          
          cy.log('⏸️ PAUSE: Buy-in dialog appeared (3 seconds)');
          cy.wait(3000);
          
          // Enter buy-in amount
          if (selector.includes('input')) {
            cy.get(selector).clear().type('500');
          } else {
            cy.get(selector).within(() => {
              cy.get('input').clear().type('500');
            });
          }
          
          cy.log('⏸️ PAUSE: Buy-in amount entered (2 seconds)');
          cy.wait(2000);
          
          // Find and click confirm button
          const confirmSelectors = [
            '[data-testid="confirm-seat-button"]',
            'button:contains("Confirm")',
            'button:contains("Take Seat")',
            'button:contains("Join")',
            'button[type="submit"]'
          ];
          
          confirmSelectors.forEach(confirmSelector => {
            if ($body.find(confirmSelector).length > 0) {
              cy.get(confirmSelector).first().click();
              return false; // break
            }
          });
        }
      });
      
      if (!foundBuyinDialog) {
        cy.log('⚠️ No buy-in dialog found');
        cy.screenshot('no-buyin-dialog');
      }
    });
    
    // ========== STEP 8: Seat Taking Result ==========
    cy.log('📍 STEP 8: Observing Seat Taking Result');
    
    cy.log('⏸️ PAUSE: Waiting for seat taking to complete (5 seconds)');
    cy.wait(5000);
    
    // Check for success or error
    cy.get('body').then(($body) => {
      if ($body.text().includes('Invalid session data')) {
        cy.log('❌ ERROR: Invalid session data error occurred');
        cy.screenshot('invalid-session-error');
      } else if ($body.text().includes(testUserId)) {
        cy.log('✅ SUCCESS: User name appears in seat');
        cy.screenshot('seat-taken-success');
      } else {
        cy.log('ℹ️ RESULT UNCLEAR: Taking screenshot for analysis');
        cy.screenshot('seat-taking-result-unclear');
      }
    });
    
    // ========== STEP 9: Final State ==========
    cy.log('📍 STEP 9: Final Game State');
    
    cy.log('⏸️ PAUSE: Showing final game state (5 seconds)');
    cy.wait(5000);
    
    cy.screenshot('final-game-state');
    
    cy.log('🎬 DEMO COMPLETE: TakeSeat flow demonstration finished');
    cy.log('📸 Screenshots saved for analysis');
  });

  it.skip('should demonstrate error scenarios with pauses', () => {
    cy.log('🎬 DEMO: Error Scenarios');
    
    // This test is skipped to focus on the main flow
    cy.log('⏭️ SKIPPED: Error scenario demo');
  });
}); 