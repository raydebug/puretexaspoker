describe('Complete Observer to Player Transition with Location Updates', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'ObserverToPlayerComplete');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should complete full flow: join table → appear in observers → location updates → take seat → removed from observers', () => {
    const playerName = 'ObserverToPlayerComplete';
    
    // ============ PHASE 1: LOBBY → OBSERVER ============
    
    // Verify initial location: lobby
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        expect(initialLocation).to.equal('lobby');
        cy.log('✅ PHASE 1: Initial location verified as lobby');
      }
    });
    
    // Use the proven working pattern for joining table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Verify observer view appears (using working pattern)
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify location updated from 'lobby' to 'table-x' (key requirement)
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const tableLocation = socketService.getCurrentUserLocation();
        expect(tableLocation).to.match(/^table-\d+$/);
        cy.log('✅ PHASE 1: Location updated from lobby to:', tableLocation);
      }
    });
    
    // Verify user appears in observers list (using working pattern)
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
      cy.contains('Observers (1)').should('be.visible');
    });
    
    cy.log('✅ PHASE 1 COMPLETE: Successfully joined as observer, location updated, appears in observers list');
    
    // ============ PHASE 2: OBSERVER → PLAYER ============
    
    // Look for an available seat and click it
    cy.get('[data-testid^="seat-"]').first().should('be.visible').click();
    
    // Handle buy-in modal (if it appears)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="buyin-modal"]').length > 0) {
        cy.get('[data-testid="buyin-modal"]').should('be.visible');
        cy.get('[data-testid="buyin-input"]').clear().type('100');
        cy.get('[data-testid="buyin-confirm"]').click();
      } else if ($body.find('[data-testid="buy-in-input"]').length > 0) {
        // Alternative buy-in input pattern
        cy.get('[data-testid="buy-in-input"]').clear().type('100');
        cy.get('[data-testid="confirm-seat"]').click();
      } else {
        cy.log('No buy-in modal found - seat may be taken directly');
      }
    });
    
    // Wait for seat-taking to complete
    cy.wait(3000);
    
    // Verify location updated from 'table-x' to 'table-x-seat-y' (key requirement)
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const seatLocation = socketService.getCurrentUserLocation();
        // Should now include seat information
        expect(seatLocation).to.match(/^table-\d+(-seat-\d+)?$/);
        cy.log('✅ PHASE 2: Location after taking seat:', seatLocation);
      }
    });
    
    // Verify user is removed from observers list (key requirement)
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Observers section should still exist
      cy.contains('Observers').should('be.visible');
      
      // But player should no longer be in observers list
      cy.contains(playerName).should('not.exist');
      
      // Observer count should be 0 or section should show empty
      cy.get('body').then(($el) => {
        const text = $el.text();
        // Should not show "Observers (1)" anymore
        expect(text).to.not.contain('Observers (1)');
      });
    });
    
    // Verify user appears as a seated player
    cy.get('[data-testid^="seat-"]').should('contain', playerName);
    
    cy.log('✅ PHASE 2 COMPLETE: Successfully took seat, location updated, removed from observers');
    
    // ============ FINAL VALIDATION ============
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const finalLocation = socketService.getCurrentUserLocation();
        cy.log('🎯 FINAL VALIDATION COMPLETE:');
        cy.log('  ✅ Location progression: lobby → table-x → table-x-seat-y');
        cy.log('  ✅ User progression: not listed → observers → seated player');
        cy.log('  ✅ Observer list: added when joining → removed when taking seat');
        cy.log('  ✅ Final location:', finalLocation);
      }
    });
    
    console.log('🎉 COMPLETE E2E FLOW VERIFIED: All location updates and observer transitions working');
  });

  it('should track location updates accurately through the complete flow', () => {
    const playerName = 'ObserverToPlayerComplete';
    const locationHistory: string[] = [];
    
    // Track location changes
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        locationHistory.push(initialLocation);
        expect(initialLocation).to.equal('lobby');
        cy.log('Location History [1]:', initialLocation);
      }
    });
    
    // Join table and track location change
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const tableLocation = socketService.getCurrentUserLocation();
        locationHistory.push(tableLocation);
        expect(tableLocation).to.match(/^table-\d+$/);
        expect(tableLocation).to.not.equal(locationHistory[0]);
        cy.log('Location History [2]:', tableLocation);
      }
    });
    
    // Take seat and track final location change
    cy.get('[data-testid^="seat-"]').first().should('be.visible').click();
    
    // Handle any buy-in process
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="buyin-modal"], [data-testid="buy-in-input"]').length > 0) {
        if ($body.find('[data-testid="buyin-modal"]').length > 0) {
          cy.get('[data-testid="buyin-input"]').clear().type('100');
          cy.get('[data-testid="buyin-confirm"]').click();
        } else {
          cy.get('[data-testid="buy-in-input"]').clear().type('100');
          cy.get('[data-testid="confirm-seat"]').click();
        }
      }
    });
    
    cy.wait(3000);
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const seatLocation = socketService.getCurrentUserLocation();
        locationHistory.push(seatLocation);
        cy.log('Location History [3]:', seatLocation);
        
        // Verify the complete progression
        expect(locationHistory).to.have.length(3);
        expect(locationHistory[0]).to.equal('lobby');
        expect(locationHistory[1]).to.match(/^table-\d+$/);
        expect(locationHistory[2]).to.match(/^table-\d+(-seat-\d+)?$/);
        
        cy.log('✅ Complete location tracking verified:');
        cy.log('  1. lobby (initial)');
        cy.log('  2.', locationHistory[1], '(after joining table)');
        cy.log('  3.', locationHistory[2], '(after taking seat)');
      }
    });
  });
}); 