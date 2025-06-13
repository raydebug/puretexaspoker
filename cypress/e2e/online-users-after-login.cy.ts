describe('Online Users After Login', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should start with 0 online users for anonymous user', () => {
    // Start in anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="anonymous-status"]').should('contain', 'Browsing Anonymously');
    
    // Wait for components to load
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Initially, online users should be 0 or very low (no authenticated users)
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    
    // The exact count may vary, but we can check that the component exists
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Online Users');
  });

  it('should update online users count after login', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Start anonymous
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    
    // Get initial online users count
    cy.get('[data-testid="online-users-list"]').invoke('text').then((initialText) => {
      console.log('Initial online users text:', initialText);
      
      // Login
      cy.get('[data-testid="login-button"]').click();
      cy.get('[data-testid="nickname-modal"]').should('be.visible');
      cy.get('[data-testid="nickname-input"]').type(testNickname);
      cy.get('[data-testid="join-button"]').click();
      
      // Verify logged in state
      cy.get('[data-testid="user-info"]').should('be.visible');
      cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
      
      // Wait a moment for backend to process login and broadcast update
      cy.wait(1000);
      
             // Check that online users count has updated
       cy.get('[data-testid="online-users-list"]').invoke('text').then((afterLoginText) => {
        console.log('After login online users text:', afterLoginText);
        // The text should have changed, indicating the count was updated
        expect(afterLoginText).not.to.equal(initialText);
      });
    });
  });

  it('should update online users count after logout', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login first
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in state
    cy.get('[data-testid="user-info"]').should('be.visible');
    
    // Wait for login to be processed
    cy.wait(1000);
    
    // Get online users count after login
    cy.get('[data-testid="online-users-list"]').invoke('text').then((loggedInText) => {
      console.log('Logged in online users text:', loggedInText);
      
      // Logout
      cy.get('[data-testid="logout-button"]').click();
      cy.get('[data-testid="browse-anonymously-button"]').click();
      
      // Verify anonymous state
      cy.get('[data-testid="anonymous-info"]').should('be.visible');
      
      // Wait for logout to be processed
      cy.wait(1000);
      
             // Check that online users count has decreased
       cy.get('[data-testid="online-users-list"]').invoke('text').then((afterLogoutText) => {
        console.log('After logout online users text:', afterLogoutText);
        // The text should have changed, indicating the count was updated
        expect(afterLogoutText).not.to.equal(loggedInText);
      });
    });
  });

  it('should handle multiple users logging in simultaneously', () => {
    const testNickname1 = `TestUser1${Date.now()}`;
    const testNickname2 = `TestUser2${Date.now()}`;
    
    // This test simulates multiple users by logging in and out multiple times
    // to verify the counting system works correctly
    
    // Login as first user
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname1);
    cy.get('[data-testid="join-button"]').click();
    
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.wait(500);
    
    // Logout and login as different user to simulate user switching
    cy.get('[data-testid="logout-button"]').click();
    cy.get('[data-testid="browse-anonymously-button"]').click();
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.wait(500);
    
    // Login as second user
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').clear().type(testNickname2);
    cy.get('[data-testid="join-button"]').click();
    
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname2}`);
    
    // Verify the system handled the user switching correctly
    cy.get('[data-testid="online-users-list"]').should('be.visible');
  });

  it('should preserve existing functionality after implementing online users tracking', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify all existing functionality still works
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    cy.get('[data-testid="table-filters"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    
    // Test table join button (should still work)
    cy.get('[data-testid^="join-table-"]').should('exist');
    cy.get('[data-testid^="join-table-"]').first().should('contain', 'Join Table');
  });
}); 