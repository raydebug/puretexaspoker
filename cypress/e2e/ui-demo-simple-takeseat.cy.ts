describe('Simple UI Demo: TakeSeat Flow', () => {
  const testUserId = `UIDemoUser_${Date.now()}`;

  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.wait(3000); // Wait for app to load
  });

  it('should demonstrate the takeSeat flow with detailed logging', () => {
    cy.log('🎬 DEMO: Starting Simple TakeSeat Flow');
    
    // ========== STEP 1: Verify Page Load ==========
    cy.log('📍 STEP 1: Verifying page loads correctly');
    cy.get('body').should('be.visible');
    cy.title().should('not.be.empty');
    
    // Take screenshot of initial state
    cy.screenshot('01-initial-page-load');
    
    // Log what we see on the page
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      cy.log('📄 Page content preview:', bodyText.substring(0, 200) + '...');
      
      if (bodyText.includes('table') || bodyText.includes('Table')) {
        cy.log('✅ Page contains table-related content');
      } else {
        cy.log('⚠️ No table content found in page text');
      }
    });
    
    cy.log('⏸️ PAUSE: Examining initial page state (5 seconds)');
    cy.wait(5000);
    
    // ========== STEP 2: Search for Interactive Elements ==========
    cy.log('📍 STEP 2: Searching for joinable elements');
    
    // Look for buttons or clickable elements
    cy.get('button, a, [role="button"], .clickable, [onclick]').then(($elements) => {
      cy.log(`📊 Found ${$elements.length} potentially clickable elements`);
      
             $elements.each((index: number, element: any) => {
         const text = Cypress.$(element).text().trim();
         const classes = Cypress.$(element).attr('class') || '';
         const id = Cypress.$(element).attr('id') || '';
         
         if (text.length > 0 && text.length < 50) {
           cy.log(`🔘 Button ${index}: "${text}" (class: ${classes}, id: ${id})`);
         }
       });
    });
    
    cy.log('⏸️ PAUSE: Analyzing available buttons (3 seconds)');
    cy.wait(3000);
    
    // ========== STEP 3: Try to Find Join Button ==========
    cy.log('📍 STEP 3: Attempting to find Join functionality');
    
    cy.get('body').then(($body) => {
      // Try multiple strategies to find join functionality
      const strategies = [
        () => $body.find('button:contains("Join")'),
        () => $body.find('[data-testid*="table"]'),
        () => $body.find('.table-card, .poker-table'),
        () => $body.find('*:contains("Table 1"), *:contains("Table1")'),
                 () => $body.find('button, a').filter((i: number, el: any) => {
           const text = Cypress.$(el).text().toLowerCase();
           return text.includes('join') || text.includes('play') || text.includes('enter');
         })
      ];
      
      let foundElement = null;
      let strategyUsed = '';
      
      for (let i = 0; i < strategies.length; i++) {
        const result = strategies[i]();
        if (result.length > 0) {
          foundElement = result.first();
          strategyUsed = `Strategy ${i + 1}`;
          break;
        }
      }
      
      if (foundElement && foundElement.length > 0) {
        cy.log(`✅ Found joinable element using ${strategyUsed}`);
        cy.screenshot('02-found-join-element');
        
        cy.log('⏸️ PAUSE: Highlighting join element (3 seconds)');
        cy.wait(3000);
        
        // Try to click the element
        cy.wrap(foundElement).scrollIntoView();
        cy.wrap(foundElement).click({ force: true });
        
        cy.log('✅ Clicked join element');
        cy.wait(2000);
        
      } else {
        cy.log('❌ No joinable elements found with any strategy');
        cy.screenshot('02-no-join-elements');
        
        // Show what's actually on the page
        cy.get('*').then(($all) => {
          const allText = $all.text();
          cy.log('📄 Full page text for debugging:', allText);
        });
        
        cy.log('⏸️ PAUSE: No join elements found - ending demo (5 seconds)');
        cy.wait(5000);
        return;
      }
    });
    
    // ========== STEP 4: Handle Nickname or Direct Navigation ==========
    cy.log('📍 STEP 4: Handling post-click state');
    
    cy.wait(2000); // Wait for any transitions
    cy.screenshot('03-after-join-click');
    
    // Check if nickname dialog appeared
    cy.get('body').then(($body) => {
             if ($body.find('input[type="text"], input[placeholder*="name"]').length > 0) {
        cy.log('📝 Nickname input found');
        
                 cy.get('input[type="text"], input[placeholder*="name"]').first()
          .clear()
          .type(testUserId, { force: true });
        
        cy.log('⏸️ PAUSE: Nickname entered (2 seconds)');
        cy.wait(2000);
        
        // Look for submit button
        cy.get('button').filter((i, el) => {
          const text = Cypress.$(el).text().toLowerCase();
          return text.includes('join') || text.includes('enter') || text.includes('submit') || text.includes('confirm');
        }).first().click({ force: true });
        
      } else {
        cy.log('ℹ️ No nickname input - checking URL for navigation');
      }
    });
    
    // ========== STEP 5: Verify Navigation ==========
    cy.log('📍 STEP 5: Checking navigation result');
    
    cy.wait(3000);
    cy.url().then((url) => {
      cy.log(`📍 Current URL: ${url}`);
      
      if (url.includes('/game')) {
        cy.log('✅ Successfully navigated to game page');
        cy.screenshot('04-game-page-reached');
        
        cy.log('⏸️ PAUSE: Examining game page (5 seconds)');
        cy.wait(5000);
        
        // Look for game elements
        cy.get('body').then(($body) => {
          const gameElements = [
            'seat', 'chair', 'player', 'observer', 'chip', 'card', 'table', 'poker'
          ];
          
          gameElements.forEach(element => {
            if ($body.text().toLowerCase().includes(element)) {
              cy.log(`🎮 Found game element: ${element}`);
            }
          });
        });
        
        // ========== STEP 6: Look for Seats ==========
        cy.log('📍 STEP 6: Searching for seats to click');
        
        const seatSelectors = [
          '[data-testid*="seat"]',
          '.seat',
          '*[class*="seat"]',
          '.chair',
          '*[class*="chair"]',
          'button:contains("Seat")',
          '*:contains("Empty")',
          'div[onclick], button[onclick]'
        ];
        
        let foundSeat = false;
        seatSelectors.forEach(selector => {
          if (!foundSeat) {
            cy.get('body').then(($body) => {
              const elements = $body.find(selector);
              if (elements.length > 0) {
                cy.log(`🪑 Found ${elements.length} potential seats with: ${selector}`);
                
                // Try to click the first one
                cy.get(selector).first().then(($seat) => {
                  cy.log('⏸️ PAUSE: About to click seat (3 seconds)');
                  cy.wait(3000);
                  
                  cy.wrap($seat).click({ force: true });
                  foundSeat = true;
                  
                  cy.log('🪑 Clicked potential seat');
                  cy.wait(2000);
                  cy.screenshot('05-after-seat-click');
                  
                  // Look for buy-in dialog
                  cy.get('body').then(($bodyAfterSeat) => {
                    if ($bodyAfterSeat.find('input[type="number"], input[placeholder*="buy"]').length > 0) {
                      cy.log('💰 Buy-in dialog found!');
                      
                      cy.get('input[type="number"], input[placeholder*="buy"]').first()
                        .clear()
                        .type('500');
                      
                      cy.log('⏸️ PAUSE: Buy-in entered (2 seconds)');
                      cy.wait(2000);
                      
                      // Look for confirm button
                      cy.get('button').filter((i, el) => {
                        const text = Cypress.$(el).text().toLowerCase();
                        return text.includes('confirm') || text.includes('take') || text.includes('sit');
                      }).first().click({ force: true });
                      
                      cy.log('💰 Attempted to confirm seat purchase');
                      
                      cy.log('⏸️ PAUSE: Waiting for seat taking result (5 seconds)');
                      cy.wait(5000);
                      
                      cy.screenshot('06-final-result');
                      
                      // Check for success or errors
                      cy.get('body').then(($finalBody) => {
                        const finalText = $finalBody.text();
                        
                        if (finalText.includes('Invalid session data')) {
                          cy.log('❌ ERROR: Invalid session data occurred');
                        } else if (finalText.includes(testUserId)) {
                          cy.log('✅ SUCCESS: User appears to be seated');
                        } else {
                          cy.log('❓ UNCLEAR: Taking screenshot for manual analysis');
                        }
                      });
                      
                    } else {
                      cy.log('❌ No buy-in dialog appeared after seat click');
                    }
                  });
                });
              }
            });
          }
        });
        
        if (!foundSeat) {
          cy.log('❌ No seats found to click');
          cy.screenshot('06-no-seats-found');
        }
        
      } else {
        cy.log('❌ Did not navigate to game page');
        cy.screenshot('04-navigation-failed');
      }
    });
    
    cy.log('🎬 DEMO COMPLETE: TakeSeat flow finished');
    cy.log('📸 Check screenshots in cypress/screenshots for visual analysis');
  });
}); 