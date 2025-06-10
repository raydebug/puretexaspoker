describe('User Location Transition Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'LocationFlowTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should update user location from lobby to table-x when joining table, appear in observers list, then be removed from observers after taking a seat', () => {
    const playerName = 'LocationFlowTestPlayer';
    
    // Step 1: Verify initial state - user is in lobby
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        expect(initialLocation).to.equal('lobby');
        console.log('✅ Step 1: Initial location verified as lobby');
      }
    });
    
    // Step 2: Click join button to join the first table
    cy.get('[data-testid="table-row"]').first().click();
    
    // Step 3: Handle nickname input and join as observer
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Step 4: Wait for navigation to complete
    cy.url({ timeout: 10000 }).should('include', '/game/');
    
    // Wait for the actual socket join to complete and location to update
    cy.wait(3000);
    
    // Step 5: Verify browser navigates to the game page
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Step 6: Verify user location is updated from 'lobby' to 'table-x'
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const newLocation = socketService.getCurrentUserLocation();
        expect(newLocation).to.match(/^table-\d+$/);
        console.log('✅ Step 6: Location updated from lobby to:', newLocation);
      }
    });
    
    // Step 7: Verify user appears in observers list
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should have Observers section
      cy.contains('Observers').should('be.visible');
      
      // Player should be in observers list  
      cy.contains(playerName).should('be.visible');
      
      // Should show correct count
      cy.contains('Observers (1)').should('be.visible');
    });
    
    console.log('✅ Step 7: User appears in observers list verified');
    
    // Step 8: Take a seat to trigger removal from observers
    cy.get('[data-testid="seat-0"]', { timeout: 10000 }).should('be.visible').click();
    
    // Handle buy-in modal
    cy.get('[data-testid="buyin-modal"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="buyin-input"]').clear().type('100');
    cy.get('[data-testid="buyin-confirm"]').click();
    
    // Wait for seat-taking to complete
    cy.wait(3000);
    
    // Step 9: Verify user location is updated to 'table-x-seat-y'
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const seatLocation = socketService.getCurrentUserLocation();
        expect(seatLocation).to.match(/^table-\d+-seat-\d+$/);
        console.log('✅ Step 9: Location updated to seat:', seatLocation);
      }
    });
    
    // Step 10: Verify user is removed from observers list after taking seat
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should still have Observers section but user should not be there
      cy.contains('Observers').should('be.visible');
      
      // Player should no longer be in observers list
      cy.contains(playerName).should('not.exist');
      
      // Should show empty observers or decreased count
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Either "Observers (0)" or just "Observers" without the name
        expect(text).to.not.contain(`Observers (1)`);
      });
    });
    
    // Step 11: Verify user appears in players list/game state
    cy.get('[data-testid="seat-0"]').within(() => {
      cy.contains(playerName).should('be.visible');
      cy.contains('$100').should('be.visible'); // Buy-in amount
    });
    
    console.log('✅ Complete flow verified: lobby → table join → location update → observers list → take seat → removed from observers → appears as player');
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