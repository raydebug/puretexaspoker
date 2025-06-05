describe('Burn Card Rule', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/');
  });

  it('should deal correct number of community cards after each phase', () => {
    cy.get('[data-testid="nickname-input"]').type('BurnTester');
    cy.get('[data-testid="join-button"]').click();

    cy.get('[data-testid="lobby-container"]').should('be.visible');

    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('BurnTester');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    cy.url().should('include', '/game/');

    cy.get('[data-testid="community-cards"]', { timeout: 15000 }).children().should('have.length', 3);
    cy.get('[data-testid="community-cards"]', { timeout: 15000 }).children().should('have.length', 4);
    cy.get('[data-testid="community-cards"]', { timeout: 15000 }).children().should('have.length', 5);
  });
});
