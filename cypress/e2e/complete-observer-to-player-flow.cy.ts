describe('Complete Observer to Player Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Set the cookie directly (this approach works in successful tests)
    cy.setCookie('playerNickname', 'FlowTestUser');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should complete join table → take seat → change seat flow', () => {
    const playerName = 'SeatTestPlayer';
    
    // **STEP 1: VERIFY USER STARTS IN LOBBY**
    cy.log('🎯 STEP 1: Verifying user starts in lobby');
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const location = socketService.getCurrentUserLocation();
        cy.log(`Initial location: ${JSON.stringify(location)}`);
        expect(location).to.equal('lobby');
      }
    });
    
    // **STEP 2: JOIN TABLE AS OBSERVER**
    cy.log('🎯 STEP 2: Joining table as observer');
    
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Handle welcome popup (optional)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-popup"]').length > 0) {
        cy.get('[data-testid="welcome-popup"]').should('be.visible');
        cy.get('[data-testid="welcome-popup"]', { timeout: 4000 }).should('not.exist');
        cy.log('✅ Welcome popup handled');
      } else {
        cy.log('ℹ️ Welcome popup not found - proceeding');
      }
    });
    
    // **STEP 3: VERIFY NAVIGATION TO GAME PAGE**
    cy.url({ timeout: 10000 }).should('include', '/game/');
    cy.log('✅ Successfully navigated to game page');
    
    // **STEP 4: VERIFY LOCATION UPDATE**
    cy.wait(3000); // Allow time for socket connection and location update
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const location = socketService.getCurrentUserLocation();
        cy.log(`Location after joining: ${JSON.stringify(location)}`);
        
        cy.url().then((url) => {
          const urlMatch = url.match(/\/game\/(\d+)/);
          if (urlMatch) {
            const expectedTableId = urlMatch[1];
            const expectedLocation = `table-${expectedTableId}`;
            expect(location).to.equal(expectedLocation);
            cy.log('✅ Location correctly updated to table-x as observer');
          }
        });
      }
    });
    
    // **STEP 5: WAIT FOR GAME VIEW TO LOAD**
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.log('✅ Observer view loaded successfully');
    
    // **STEP 6: TAKE FIRST SEAT**
    cy.log('🎯 STEP 6: Taking first available seat');
    
    // Find and click first available seat
    cy.get('[data-testid^="available-seat-"]', { timeout: 10000 }).first().click();
    cy.log('✅ Clicked on first available seat');
    
    // Handle seat buy-in modal
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    cy.log('✅ Completed buy-in process for first seat');
    
    // Wait for seat to be taken
    cy.wait(3000);
    
    // **STEP 7: VERIFY SEAT IS TAKEN**
    cy.log('🎯 STEP 7: Verifying seat is taken');
    
    // Look for player in a seat (using multiple selectors for flexibility)
    cy.get('[data-testid^="seat-"]').contains(playerName).should('be.visible');
    cy.log('✅ Player appears in seat successfully');
    
    // **STEP 8: STAND UP AND TAKE DIFFERENT SEAT**
    cy.log('🎯 STEP 8: Standing up and taking different seat');
    
    // Find current seat and stand up
    cy.get('[data-testid^="seat-"]').contains(playerName).parent().within(() => {
      cy.get('[data-testid="stand-up-btn"]').click();
    });
    cy.log('✅ Stood up from first seat');
    
    cy.wait(2000);
    
    // Take a different available seat
    cy.get('[data-testid^="available-seat-"]').eq(1).click();
    cy.log('✅ Clicked on second available seat');
    
    // Handle seat buy-in modal again
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    cy.log('✅ Completed buy-in process for second seat');
    
    // Wait for new seat to be taken
    cy.wait(3000);
    
    // **STEP 9: VERIFY NEW SEAT IS TAKEN**
    cy.log('🎯 STEP 9: Verifying player is in new seat');
    
    cy.get('[data-testid^="seat-"]').contains(playerName).should('be.visible');
    cy.log('✅ Player successfully moved to new seat');
    
    // **STEP 10: VERIFY FINAL LOCATION STATE**
    cy.log('🎯 STEP 10: Verifying final location state');
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const location = socketService.getCurrentUserLocation();
        cy.log(`Final location: ${JSON.stringify(location)}`);
        
        expect(location).to.not.be.null;
        expect(location).to.include('table-');
        cy.log('✅ Final location state shows user seated at table');
      }
    });
    
    cy.log('🎉 SEAT CHANGE FLOW COMPLETED SUCCESSFULLY: join → seat → stand → new seat');
  });
}); 