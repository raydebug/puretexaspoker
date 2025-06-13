describe('Lobby Shows Online Users Count', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
  });

  it('should display online users count in lobby page (not observers list)', () => {
    const testUser = `LobbyUser${Date.now()}`;

    // Step 1: Verify lobby displays online users count initially (should be 0)
    cy.log('🎯 Step 1: Check initial online users count in lobby');
    cy.get('[data-testid="online-users-list"]', { timeout: 10000 }).should('be.visible');
    
    // Should show "Online Users: 0" format in lobby
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Online Users: 0').should('be.visible');
      // Should NOT show observers list format
      cy.contains('Observers').should('not.exist');
      cy.contains('No observers').should('not.exist');
    });

    // Step 2: Login and verify online users count increases
    cy.log('🎯 Step 2: Login and check online users count updates');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="modal-nickname-input"]').clear().type(testUser);
    cy.get('[data-testid="modal-submit-button"]').click();
    
    // Wait for login to complete
    cy.wait(2000);
    
    // Should now show "Online Users: 1" in lobby
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Online Users: 1').should('be.visible');
      // Still should NOT show observers list format
      cy.contains('Observers').should('not.exist');
      cy.contains('No observers').should('not.exist');
    });

    // Step 3: Logout and verify count goes back to 0
    cy.log('🎯 Step 3: Logout and verify count decreases');
    cy.get('[data-testid="logout-button"]').click();
    
    // Wait for logout to complete
    cy.wait(2000);
    
    // Should go back to "Online Users: 0"
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Online Users: 0').should('be.visible');
      // Still should NOT show observers list format
      cy.contains('Observers').should('not.exist');
    });

    cy.log('✅ Success: Lobby correctly displays online users count');
  });

  it('should maintain online users count format across lobby navigation', () => {
    // Navigate around the lobby to ensure format stays consistent
    cy.log('🎯 Test lobby online users format consistency');
    
    // Check initial format
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Online Users:').should('be.visible');
      cy.contains('Observers').should('not.exist');
    });
    
    // Navigate through filters/options (if any)
    cy.get('[data-testid="table-filters"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Format should remain consistent
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Online Users:').should('be.visible');
      cy.contains('Observers').should('not.exist');
    });
  });
}); 