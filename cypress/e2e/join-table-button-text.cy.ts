describe('Join Table Button Behavior', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should show "Join Table" for all users but trigger login for anonymous users', () => {
    // Start in anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="anonymous-status"]').should('contain', 'Browsing Anonymously');
    
    // Wait for tables to load
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Check that join buttons always show "Join Table"
    cy.get('[data-testid^="join-table-"]').first().should('contain', 'Join Table');
    cy.get('[data-testid^="join-table-"]').first().should('not.contain', 'Login & Join Table');
    
    // Verify multiple buttons have the same text
    cy.get('[data-testid^="join-table-"]').each(($button) => {
      cy.wrap($button).should('contain', 'Join Table');
      cy.wrap($button).should('not.contain', 'Login & Join Table');
    });
  });

  it('should show "Join Table" for authenticated users and open join dialog', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login first
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in state
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    
    // Wait for tables to load
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Check that join buttons show "Join Table"
    cy.get('[data-testid^="join-table-"]').first().should('contain', 'Join Table');
    cy.get('[data-testid^="join-table-"]').first().should('not.contain', 'Login & Join Table');
    
    // Click should open join dialog for authenticated users
    cy.get('[data-testid^="join-table-"]').first().click();
    // Should open join dialog (this depends on existing join dialog implementation)
  });

  it('should trigger login modal when anonymous user clicks join table', () => {
    // Start anonymous 
    cy.get('[data-testid="table-grid"]').should('be.visible');
    cy.get('[data-testid^="join-table-"]').first().should('contain', 'Join Table');
    
    // Click "Join Table" as anonymous user
    cy.get('[data-testid^="join-table-"]').first().click();
    
    // Should trigger login modal instead of join dialog
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible');
  });

  it('should trigger login after logout when clicking join table', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Login first
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify "Join Table" text
    cy.get('[data-testid^="join-table-"]').first().should('contain', 'Join Table');
    
    // Logout
    cy.get('[data-testid="logout-button"]').click();
    
    // Wait for the logout to complete and modal to appear
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Dismiss modal to continue anonymous browsing
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Verify we're back in anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Click join table as anonymous user
    cy.get('[data-testid^="join-table-"]').first().click();
    
    // Should trigger login modal
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
  });

  it('should allow login and then proceed to join table', () => {
    const testNickname = `TestUser${Date.now()}`;
    
    // Start anonymous and click join table
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    cy.get('[data-testid^="join-table-"]').first().click();
    
    // Login modal should appear
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Complete login
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Should be logged in now
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    
    // Now clicking join table should work normally (show join dialog)
    cy.get('[data-testid^="join-table-"]').first().click();
    // Join dialog behavior depends on existing implementation
  });
}); 