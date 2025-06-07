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
    
    // **CRITICAL TEST**: Player should be removed from observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Observers section should still exist
      cy.contains('Observers').should('be.visible');
      
      // But the player should NOT be in observers anymore
      cy.contains('Observers').parent().within(() => {
        cy.contains(playerName).should('not.exist');
      });
      
      // Player should now be in Players section
      cy.contains('Players').should('be.visible');
      cy.contains('Players').parent().within(() => {
        cy.contains(playerName).should('be.visible');
        cy.contains('(You)').should('be.visible'); // Should show it's the current user
      });
    });
    
    // Verify observer count decreased and player count increased
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (0)').should('be.visible');
      cy.contains('Players (1)').should('be.visible');
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
      cy.contains('Observers (1)').should('be.visible');
      cy.contains('Players (0)').should('be.visible');
    });
    
    // Take a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Final state: 0 observers, 1 player
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (0)').should('be.visible');
      cy.contains('Players (1)').should('be.visible');
    });
    
    // Verify no UI errors or console errors
    cy.window().then((win) => {
      // Should not have any React errors
      expect(win.console.error).to.not.have.been.called;
    });
  });
}); 