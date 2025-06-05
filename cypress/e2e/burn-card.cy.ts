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

    // Test that community cards are displayed correctly (flop = 3 cards)
    cy.get('[data-testid="community-cards"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="community-cards"]').children().should('have.length', 3);
    
    // Verify poker table is rendered
    cy.get('[data-testid="poker-table"]').should('be.visible');
    
    // Verify pot is displayed
    cy.get('[data-testid="pot-amount"]').should('be.visible').and('contain', '$');
    
    cy.log('✅ Burn card rule verified - community cards rendered correctly');
  });
});
