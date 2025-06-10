describe('User Location Transition Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'LocationFlowTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should update user location from lobby to table-x when joining table and appear in observers list', () => {
    const playerName = 'LocationTransitionTest';
    
    // Verify initial state: user is in lobby
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        expect(initialLocation).to.equal('lobby');
        console.log('✅ Initial location verified: lobby');
      }
    });
    
    // Click join button to join the first table (following working pattern)
    cy.get('[data-testid="table-row"]').first().click();
    
    // Use the working test pattern for nickname handling
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Wait for navigation to complete first (this is key!)
    cy.url({ timeout: 10000 }).should('include', '/game/');
    
    // Wait for the actual socket join to complete and location to update
    cy.wait(3000);
    
    // Verify browser navigates to the game page
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // **CRITICAL TEST**: Verify user location is updated from 'lobby' to 'table-x'
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const newLocation = socketService.getCurrentUserLocation();
        expect(newLocation).to.match(/^table-\d+$/);
        console.log('✅ Location updated from lobby to:', newLocation);
      }
    });
    
    // **CRITICAL TEST**: Verify user appears in observers list (using working pattern)
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should have Observers section
      cy.contains('Observers').should('be.visible');
      
      // Player should be in observers list  
      cy.contains(playerName).should('be.visible');
      
      // Should show correct count
      cy.contains('Observers (1)').should('be.visible');
    });
    
    console.log('✅ Complete flow verified: lobby → table join → location update → navigation → observers list');
  });

  it('should verify location tracking during table join process', () => {
    const playerName = 'LocationTrackingTest';
    
    // Start the joining process and track location changes
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Wait for navigation to complete
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify final location is a table location
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const finalLocation = socketService.getCurrentUserLocation();
        expect(finalLocation).to.match(/^table-\d+$/);
        console.log('✅ Location tracking verified, final location:', finalLocation);
      }
    });
    
    // Verify user appears in observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    console.log('✅ Location tracking and observer appearance verified');
  });
}); 