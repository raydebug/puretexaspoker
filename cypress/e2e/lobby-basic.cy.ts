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
    
    // Should NOT show modal automatically (anonymous-first behavior)
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Should show anonymous browsing info
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
  });

  it('should allow anonymous browsing by default and login via button', () => {
    // Should start in anonymous browsing mode (no modal shown)
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    
    // Should be able to see lobby content immediately
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.contains('Texas Hold\'em Poker Lobby').should('be.visible');
    
    // Should NOT show user info since not logged in
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // Can trigger login modal with login button
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
  });
}); 