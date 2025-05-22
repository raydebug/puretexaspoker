describe('Basic Setup', () => {
  it('should load the application', () => {
    cy.visit('/');
    cy.get('body').should('exist');
  });

  it('should have the correct title', () => {
    cy.visit('/');
    cy.title().should('include', 'Texas Hold\'em Poker');
  });

  it('should have the main game container', () => {
    cy.visit('/');
    cy.get('[data-testid="game-container"]').should('exist');
  });
}); 