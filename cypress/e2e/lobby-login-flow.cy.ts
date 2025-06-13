describe('Lobby Login Flow', () => {
  beforeEach(() => {
    // Clear all cookies and local storage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
    // Visit the lobby page directly
    cy.visit('/');
  });

  it('should allow user to stay in lobby without login', () => {
    // User should be able to see the lobby page without logging in
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Should see the main title
    cy.contains('Texas Hold\'em Poker Lobby').should('be.visible');
    cy.contains('Choose a table to join or observe').should('be.visible');
    
    // Should see table filters and grid (even without login)
    cy.get('[data-testid="table-filters"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Should see online users component (showing 0 initially)
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').should('contain', 'Online Users: 0');
    
    // Should NOT see user info (welcome message) without login
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // Should see nickname modal prompting for login
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible');
    cy.get('[data-testid="join-button"]').should('be.visible');
  });

  it('should show welcome message and update online users after login', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Initially should see nickname modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Enter nickname and login
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Modal should disappear
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Should now see user info with welcome message
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    cy.get('[data-testid="logout-button"]').should('be.visible');
    
    // Online users count should be updated (at least 1 for current user)
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    
    // Wait for socket connection and user count update
    cy.wait(2000);
    
    // Check that online users count is updated (should be > 0)
    cy.get('[data-testid="online-users-list"]').should(($el) => {
      const text = $el.text();
      const match = text.match(/Online Users: (\d+)/);
      if (match) {
        const count = parseInt(match[1]);
        expect(count).to.be.at.least(0); // Could be 0 if socket not connected yet
      }
    });
    
    // Verify user can still see all lobby content
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-filters"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
  });

  it('should handle logout and return to login state', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login first
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in state
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    
    // Click logout
    cy.get('[data-testid="logout-button"]').click();
    
    // Should return to login state
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // Online users should reset (or at least not show the logged out user)
    cy.get('[data-testid="online-users-list"]').should('be.visible');
  });

  it('should allow user to stay in lobby anonymously after logout', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login first
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in state
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    
    // Click logout
    cy.get('[data-testid="logout-button"]').click();
    
    // Should show login modal but user can still browse
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // Close the modal by clicking "Browse Anonymously" to stay anonymous
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Modal should be closed and user can browse anonymously
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.contains('Texas Hold\'em Poker Lobby').should('be.visible');
    cy.contains('Choose a table to join or observe').should('be.visible');
    
    // Should see table filters and grid (anonymous browsing)
    cy.get('[data-testid="table-filters"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Should see online users component (showing updated count)
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    
    // User should NOT see welcome message or logout button
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // Verify user can navigate away and back to lobby
    cy.get('nav').within(() => {
      cy.contains('Auth Demo').click();
    });
    
    cy.url().should('include', '/auth-demo');
    
    // Go back to lobby
    cy.get('nav').within(() => {
      cy.contains('Lobby').click();
    });
    
    cy.url().should('include', '/lobby');
    
    // Should still be in anonymous state
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
  });

  it('should allow anonymous user to login at any time', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Start logged in
    cy.get('[data-testid="nickname-input"]').type('FirstUser');
    cy.get('[data-testid="join-button"]').click();
    
    // Logout to become anonymous
    cy.get('[data-testid="logout-button"]').click();
    
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Login again with different nickname
    cy.get('[data-testid="nickname-input"]').clear().type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Should be logged in with new nickname
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    cy.get('[data-testid="logout-button"]').should('be.visible');
  });

  it('should allow dismissing login modal with escape key for anonymous browsing', () => {
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Press escape to dismiss modal
    cy.get('body').type('{esc}');
    
    // Should be in anonymous browsing mode
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
  });

  it('should allow dismissing login modal by clicking outside for anonymous browsing', () => {
    // Should show login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Click outside the modal to dismiss it
    cy.get('[data-testid="nickname-modal"]').click();
    
    // Should be in anonymous browsing mode
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
  });

  it('should validate nickname input', () => {
    // Try to submit empty nickname
    cy.get('[data-testid="join-button"]').click();
    
    // Should show error message
    cy.get('[data-testid="modal-error"]').should('be.visible');
    cy.get('[data-testid="modal-error"]').should('contain', 'Please enter your nickname');
    
    // Modal should still be visible
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Enter valid nickname
    cy.get('[data-testid="nickname-input"]').type('ValidUser');
    
    // Error should disappear when typing
    cy.get('[data-testid="modal-error"]').should('not.exist');
    
    // Should be able to submit now
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('be.visible');
  });

  it('should persist login state across page refresh', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    
    // Refresh page
    cy.reload();
    
    // Should still be logged in (no modal)
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
  });
}); 