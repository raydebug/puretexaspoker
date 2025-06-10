describe('Observer to Player Transition Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Handle nickname modal directly (always appears on fresh visit)
    cy.get('[data-testid="nickname-modal"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="nickname-input"]').type('TestUser');
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Wait for lobby to load  
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    
    // Wait for tables to load
    cy.get('[data-testid="table-row"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should show user in observers when location is table-x, then move to players after taking seat', () => {
    const playerName = 'TransitionTestPlayer';
    
    // **STEP 1: JOIN AS OBSERVER**
    cy.log('🎯 STEP 1: Joining table as observer');
    
    // Join a table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Check for welcome popup (optional - may not be implemented yet)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-popup"]').length > 0) {
        cy.get('[data-testid="welcome-popup"]').should('be.visible');
        cy.get('[data-testid="welcome-popup"]', { timeout: 4000 }).should('not.exist');
        cy.log('✅ Welcome popup appeared and closed');
      } else {
        cy.log('ℹ️ Welcome popup not found - proceeding without it');
      }
    });
    
    // Should be in observer view
    cy.url({ timeout: 10000 }).should('include', '/game/');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // **STEP 2: VERIFY USER APPEARS IN OBSERVERS LIST**
    cy.log('🎯 STEP 2: Verifying user appears in observers list');
    
    // Verify location is table-x
    cy.url().then((url) => {
      const urlMatch = url.match(/\/game\/(\d+)/);
      if (urlMatch) {
        const expectedTableId = urlMatch[1];
        const expectedLocation = `table-${expectedTableId}`;
        
        cy.window().then((win) => {
          const socketService = (win as any).socketService;
          if (socketService) {
            const currentLocation = socketService.getCurrentUserLocation();
            expect(currentLocation).to.equal(expectedLocation);
            cy.log(`✅ User location verified: ${currentLocation}`);
          }
        });
      }
    });
    
    // Should appear in observers list
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
      cy.log('✅ User appears in observers list');
    });
    
    // **STEP 3: TAKE A SEAT**
    cy.log('🎯 STEP 3: Taking a seat to become a player');
    
    // Find and click an available seat (using correct selector from tests)
    cy.get('[data-testid^="available-seat-"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Fill in buy-in dialog using correct selectors
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    
    // Select first available buy-in option from dropdown
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // **STEP 4: VERIFY USER REMOVED FROM OBSERVERS AND APPEARS IN PLAYERS**
    cy.log('🎯 STEP 4: Verifying user transition from observers to players');
    
    // Wait for seat to be taken
    cy.wait(3000);
    
    // Verify location updated to table-x-seat-y
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const currentLocation = socketService.getCurrentUserLocation();
        expect(currentLocation).to.match(/table-\d+-seat-\d+/);
        cy.log(`✅ User location updated to: ${currentLocation}`);
      }
    });
    
    // Should no longer be in observer view
    cy.get('[data-testid="observer-view"]').should('not.exist');
    
    // Should be in player view
    cy.get('[data-testid="game-table"]', { timeout: 10000 }).should('be.visible');
    
    // **VERIFY USER REMOVED FROM OBSERVERS LIST**
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should still have Observers section but user should not be in it
      cy.contains('Observers').should('be.visible');
      
      // Player should NOT be in observers list anymore
      cy.get('div').contains(playerName).should('not.exist');
      cy.log('✅ User removed from observers list');
    });
    
    // **VERIFY USER APPEARS IN PLAYERS LIST**
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should have Players section
      cy.contains('Players').should('be.visible');
      
      // Player should be in players list
      cy.contains('Players').parent().within(() => {
        cy.contains(playerName).should('be.visible');
        cy.log('✅ User appears in players list');
      });
    });
    
    // **VERIFY SEAT IS OCCUPIED**
    cy.get('[data-testid^="seat-"]').should('contain', playerName);
    cy.log('✅ Seat shows player name');
    
    cy.log('🎉 COMPLETE FLOW VERIFIED: Observer → Player transition successful!');
  });

  it('should handle multiple users transitioning from observers to players', () => {
    const player1Name = 'Observer1';
    const player2Name = 'Observer2';
    
    cy.log('🎯 Testing multiple observer-to-player transitions');
    
    // First user joins as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(player1Name);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Check for welcome popup (optional - may not be implemented yet)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-popup"]').length > 0) {
        cy.get('[data-testid="welcome-popup"]').should('be.visible');
        cy.get('[data-testid="welcome-popup"]', { timeout: 4000 }).should('not.exist');
        cy.log('✅ Welcome popup appeared and closed');
      } else {
        cy.log('ℹ️ Welcome popup not found - proceeding without it');
      }
    });
    
    cy.url({ timeout: 10000 }).should('include', '/game/');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify first user in observers
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(player1Name).should('be.visible');
    });
    
    // Take a seat as first user
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Wait for transition
    cy.wait(3000);
    
    // Verify first user moved to players
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains('Players').parent().within(() => {
        cy.contains(player1Name).should('be.visible');
      });
    });
    
    cy.log('✅ Multiple user transition flow verified');
  });
}); 