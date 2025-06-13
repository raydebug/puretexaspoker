describe('Logout to Anonymous Browsing', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should allow user to stay in lobby in anonymous state after logout', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Step 1: Login first (start from anonymous state)
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in state
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    cy.get('[data-testid="logout-button"]').should('be.visible');
    
    // Step 2: Logout
    cy.get('[data-testid="logout-button"]').click();
    
    // Should show login modal after logout
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // Step 3: Continue browsing anonymously by clicking "Browse Anonymously"
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Step 4: Verify anonymous browsing state
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // User should still be able to see all lobby content
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.contains('Texas Hold\'em Poker Lobby').should('be.visible');
    cy.contains('Choose a table to join or observe').should('be.visible');
    
    // Should see table filters and grid for browsing
    cy.get('[data-testid="table-filters"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Should see online users count (possibly updated)
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    
    // Step 5: Verify navigation still works in anonymous state
    cy.get('nav').within(() => {
      cy.contains('Auth Demo').click();
    });
    cy.url().should('include', '/auth-demo');
    
    // Navigate back to lobby
    cy.get('nav').within(() => {
      cy.contains('Lobby').click();
    });
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Since user has no cookie, should be back to anonymous state automatically (no modal)
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Should be in anonymous browsing state
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
  });

  it('should allow user to dismiss login modal with escape key after logout', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login and logout (start from anonymous state)
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Press escape to dismiss modal for anonymous browsing
    cy.get('body').type('{esc}');
    
    // Should be in anonymous browsing mode
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
  });

  it('should allow user to dismiss login modal by clicking outside after logout', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login and logout (start from anonymous state)
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Click outside the modal (on the overlay) to dismiss it
    cy.get('[data-testid="nickname-modal"]').click('topLeft');
    
    // Should be in anonymous browsing mode
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
  });

  it('should allow re-login from anonymous state', () => {
    const firstNickname = 'FirstUser';
    const secondNickname = `SecondUser${Date.now()}`;
    
    // Login, logout, and go anonymous (start from anonymous state)
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(firstNickname);
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="logout-button"]').click();
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Verify anonymous state
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('not.exist');
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    
    // Trigger login by clicking login button
    cy.get('[data-testid="login-button"]').click();
    
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Login with new nickname
    cy.get('[data-testid="nickname-input"]').clear().type(secondNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Should be logged in with new nickname
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${secondNickname}`);
  });
}); 