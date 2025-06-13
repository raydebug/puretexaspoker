describe('Lobby Basic', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should load lobby page with all basic components', () => {
    // Should show lobby container
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Should show main title
    cy.contains('Texas Hold\'em Poker Lobby').should('be.visible');
    
    // Should show modal for login
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
  });

  it('should allow anonymous browsing via "Browse Anonymously" button', () => {
    // Should show login modal initially
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Click Browse Anonymously button
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Modal should disappear
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Should be able to see lobby content
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.contains('Texas Hold\'em Poker Lobby').should('be.visible');
    
    // Should NOT show user info since not logged in
    cy.get('[data-testid="user-info"]').should('not.exist');
  });
}); 