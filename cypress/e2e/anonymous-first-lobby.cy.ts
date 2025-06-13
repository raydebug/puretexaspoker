describe('Anonymous First Lobby Access', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should allow direct anonymous access to lobby without forced login', () => {
    // Should NOT show login modal automatically
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Should show lobby content immediately
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.contains('Texas Hold\'em Poker Lobby').should('be.visible');
    cy.contains('Choose a table to join or observe').should('be.visible');
    
    // Should show anonymous browsing status
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="anonymous-status"]').should('contain', 'Browsing Anonymously');
    cy.get('[data-testid="login-button"]').should('be.visible').should('contain', 'Login');
    
    // Should be able to see all lobby components
    cy.get('[data-testid="table-filters"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    
    // Should NOT show user info (since not logged in)
    cy.get('[data-testid="user-info"]').should('not.exist');
  });

  it('should allow anonymous user to login via login button', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Start in anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Click login button
    cy.get('[data-testid="login-button"]').click();
    
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible');
    
    // Login with nickname
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Should be logged in
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    cy.get('[data-testid="logout-button"]').should('be.visible');
    
    // Should NOT show anonymous info anymore
    cy.get('[data-testid="anonymous-info"]').should('not.exist');
  });

  it('should maintain anonymous state across page navigation', () => {
    // Start in anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    
    // Navigate to auth demo
    cy.get('nav').within(() => {
      cy.contains('Auth Demo').click();
    });
    cy.url().should('include', '/auth-demo');
    
    // Navigate back to lobby
    cy.get('nav').within(() => {
      cy.contains('Lobby').click();
    });
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Should still be in anonymous state (no forced login)
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="anonymous-status"]').should('contain', 'Browsing Anonymously');
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
  });

  it('should show login modal when user clicks login button and can dismiss it', () => {
    // Click login button
    cy.get('[data-testid="login-button"]').click();
    
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Dismiss modal with "Browse Anonymously"
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Should return to anonymous state
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
  });

  it('should show login modal when user clicks login button and can dismiss with escape', () => {
    // Click login button
    cy.get('[data-testid="login-button"]').click();
    
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Dismiss modal with escape key
    cy.get('body').type('{esc}');
    
    // Should return to anonymous state
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
  });

  it('should preserve logged in state with cookie and show user info', () => {
    const testNickname = 'PresetUser';
    
    // Set a cookie as if user was previously logged in
    cy.setCookie('playerNickname', testNickname);
    
    // Reload page
    cy.reload();
    
    // Should show user info (not anonymous state)
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    cy.get('[data-testid="logout-button"]').should('be.visible');
    
    // Should NOT show anonymous info
    cy.get('[data-testid="anonymous-info"]').should('not.exist');
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
  });

  it('should return to anonymous state after logout', () => {
    const testNickname = 'LogoutTestUser';
    
    // Login first
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in
    cy.get('[data-testid="user-info"]').should('be.visible');
    
    // Logout
    cy.get('[data-testid="logout-button"]').click();
    
    // Should show login modal after logout
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Dismiss to return to anonymous browsing
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Should be back to anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="anonymous-status"]').should('contain', 'Browsing Anonymously');
    cy.get('[data-testid="user-info"]').should('not.exist');
  });
}); 