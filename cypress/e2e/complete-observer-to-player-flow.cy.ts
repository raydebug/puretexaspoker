describe('Complete Observer to Player Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'ObserverToPlayerTest');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should complete full flow: join table → appear in observers → take seat → removed from observers', () => {
    const playerName = 'ObserverToPlayerTest';
    
    // ==================== PHASE 1: LOBBY TO OBSERVER ====================
    
    // Verify initial location: lobby
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        expect(initialLocation).to.equal('lobby');
        cy.log('🎯 PHASE 1: Initial location verified as lobby');
      }
    });
    
    // Click to join table
    cy.get('[data-testid="table-row"]').first().click();
    
    // Handle nickname input and join as observer
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Wait for navigation to game page
    cy.url({ timeout: 10000 }).should('include', '/game/');
    cy.wait(3000); // Allow socket connection to establish
    
    // Verify observer view is visible
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify location updated from 'lobby' to 'table-x'
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const tableLocation = socketService.getCurrentUserLocation();
        expect(tableLocation).to.match(/^table-\d+$/);
        cy.log('🎯 PHASE 1: Location updated to:', tableLocation);
      }
    });
    
    // Verify user appears in observers list
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    cy.log('✅ PHASE 1 COMPLETE: Successfully joined as observer and appears in observers list');
    
    // ==================== PHASE 2: OBSERVER TO PLAYER ====================
    
    // Click on an empty seat to take it
    cy.get('[data-testid="seat-0"]', { timeout: 10000 }).should('be.visible').click();
    
    // Handle buy-in modal
    cy.get('[data-testid="buyin-modal"]', { timeout: 8000 }).should('be.visible');
    cy.get('[data-testid="buyin-input"]').clear().type('100');
    cy.get('[data-testid="buyin-confirm"]').click();
    
    // Wait for seat-taking process to complete
    cy.wait(4000);
    
    // Verify location updated from 'table-x' to 'table-x-seat-y'
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const seatLocation = socketService.getCurrentUserLocation();
        expect(seatLocation).to.match(/^table-\d+-seat-\d+$/);
        cy.log('🎯 PHASE 2: Location updated to:', seatLocation);
      }
    });
    
    // Verify user is removed from observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Observers section should still exist
      cy.contains('Observers').should('be.visible');
      
      // But player should no longer be in observers
      cy.contains(playerName).should('not.exist');
    });
    
    // Verify user appears as a player in the seat
    cy.get('[data-testid="seat-0"]').within(() => {
      cy.contains(playerName).should('be.visible');
      cy.contains('$100').should('be.visible');
    });
    
    cy.log('✅ PHASE 2 COMPLETE: Successfully took seat and removed from observers list');
    
    // ==================== PHASE 3: VALIDATION ====================
    
    // Final validation: verify complete state
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const finalLocation = socketService.getCurrentUserLocation();
        expect(finalLocation).to.match(/^table-\d+-seat-\d+$/);
        
        cy.log('🎯 FINAL VALIDATION:');
        cy.log('  ✅ Location progression: lobby → table-x → table-x-seat-y');
        cy.log('  ✅ UI progression: lobby → observer view → seated player');
        cy.log('  ✅ User list progression: not listed → observers → players');
        cy.log('  ✅ Final location:', finalLocation);
      }
    });
    
    console.log('🎉 COMPLETE FLOW VERIFIED: lobby → join table → observer → take seat → player');
  });

  it('should handle location updates correctly throughout the complete flow', () => {
    const playerName = 'ObserverToPlayerTest';
    let initialLocation: string;
    let tableLocation: string;
    let seatLocation: string;
    
    // Track location changes throughout the flow
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        initialLocation = socketService.getCurrentUserLocation();
        expect(initialLocation).to.equal('lobby');
      }
    });
    
    // Join table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Wait for navigation and check location update
    cy.url({ timeout: 10000 }).should('include', '/game/');
    cy.wait(3000);
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        tableLocation = socketService.getCurrentUserLocation();
        expect(tableLocation).to.match(/^table-\d+$/);
        expect(tableLocation).to.not.equal(initialLocation);
        cy.log('Location Update 1: lobby →', tableLocation);
      }
    });
    
    // Take a seat and check final location update
    cy.get('[data-testid="seat-0"]', { timeout: 10000 }).should('be.visible').click();
    cy.get('[data-testid="buyin-modal"]', { timeout: 8000 }).should('be.visible');
    cy.get('[data-testid="buyin-input"]').clear().type('100');
    cy.get('[data-testid="buyin-confirm"]').click();
    cy.wait(4000);
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        seatLocation = socketService.getCurrentUserLocation();
        expect(seatLocation).to.match(/^table-\d+-seat-\d+$/);
        expect(seatLocation).to.not.equal(tableLocation);
        cy.log('Location Update 2:', tableLocation, '→', seatLocation);
        
        // Verify the progression is correct
        expect(seatLocation).to.contain(tableLocation.replace('table-', ''));
        
        cy.log('✅ Complete location progression verified:');
        cy.log('  1. lobby (initial)');
        cy.log('  2.', tableLocation, '(after joining table)'); 
        cy.log('  3.', seatLocation, '(after taking seat)');
      }
    });
  });
}); 