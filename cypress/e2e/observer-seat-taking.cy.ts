describe('Observer Seat Taking', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should successfully take a seat as observer without redirection', () => {
    const observerName = 'TestObserver';
    
    // Join table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Verify observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Take a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Verify successful seat taking
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains(observerName).should('be.visible');
    });
    
    // Verify no redirection to lobby
    cy.url().should('include', '/game/');
    
    // Verify player state
    cy.get('[data-testid="player-info"]').should('contain', observerName);
  });

  it('should handle socket disconnection during seat taking', () => {
    const observerName = 'DisconnectTest';
    
    // Join table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Verify observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Simulate socket disconnection
    cy.window().then((win) => {
      win.socketService.socket?.disconnect();
    });
    
    // Attempt to take a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Verify reconnection attempt
    cy.get('[data-testid="connection-status"]').should('contain', 'Reconnecting');
    
    // Wait for reconnection
    cy.wait(2000);
    
    // Verify successful seat taking after reconnection
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains(observerName).should('be.visible');
    });
    
    // Verify no redirection to lobby
    cy.url().should('include', '/game/');
  });
}); 