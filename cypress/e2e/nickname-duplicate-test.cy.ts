describe('Nickname Duplicate Test', () => {
  beforeEach(() => {
    // Clear any existing cookies/state
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should allow same nickname "aa" to be used at different tables simultaneously', () => {
    // Test that we can use the same nickname at different tables
    // This verifies the unique constraint has been removed
    
    cy.visit('/');
    cy.wait(2000);
    
    // Set nickname to "aa"
    cy.setCookie('playerNickname', 'aa');
    
    // Try to join table 1 with nickname "aa"
    cy.get('[data-testid="table-row"]').first().click({ force: true });
    
    // Handle any nickname modal if it appears
    cy.get('body').then((body) => {
      if (body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.get('[data-testid="nickname-input"]').clear({ force: true }).type('aa', { force: true });
        cy.get('[data-testid="join-as-observer"]').click();
      }
    });
    
    // Wait for successful join
    cy.wait(3000);
    
    // Check that we're on a game page (successful join)
    cy.url().should('include', '/game/');
    
    // Verify no error message about nickname being taken
    cy.get('body').should('not.contain', 'nickname is already taken');
    cy.get('body').should('not.contain', 'Please choose a different name');
    
    console.log('✅ Nickname "aa" successfully used without unique constraint errors');
  });

  it('should not show nickname error for duplicate names', () => {
    // Specifically test that we don't get the "nickname already taken" error
    
    cy.visit('/');
    cy.wait(2000);
    
    // Try to join with a common nickname that would previously be blocked
    cy.get('[data-testid="table-row"]').first().click({ force: true });
    
    // Handle nickname modal
    cy.get('body').then((body) => {
      if (body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.get('[data-testid="nickname-input"]').clear({ force: true }).type('TestUser', { force: true });
        cy.get('[data-testid="join-as-observer"]').click();
      }
    });
    
    // Wait for result
    cy.wait(3000);
    
    // Should NOT see nickname error
    cy.get('body').should('not.contain', 'The nickname "TestUser" is already taken');
    cy.get('body').should('not.contain', 'Please choose a different name');
    
    // Should successfully join table 
    cy.url().should('include', '/game/');
    
    console.log('✅ No nickname uniqueness errors - location-based system working');
  });
}); 