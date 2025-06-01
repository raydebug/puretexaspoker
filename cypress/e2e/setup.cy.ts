describe('Basic Setup', () => {
  beforeEach(() => {
    // Prevent Cypress from failing on uncaught exceptions
    Cypress.on('uncaught:exception', (err, runnable) => {
      return false;
    });

    // Remove webpack dev server overlay before each test
    cy.on('window:before:load', function (win) {
      // Disable console error stubbing for now
      var style = win.document.createElement('style');
      style.innerHTML = '#webpack-dev-server-client-overlay { display: none !important; }';
      win.document.head.appendChild(style);
    });
  });

  beforeEach(() => {
    // Clear cookies before each test
    cy.clearCookies();
  });

  it('should show nickname modal when no nickname is set', () => {
    cy.visit('/', { failOnStatusCode: false });
    cy.get('[data-testid="nickname-modal"]').should('exist');
    cy.get('[data-testid="nickname-input"]').should('exist');
  });

  it('should allow entering nickname in modal and show lobby', () => {
    cy.visit('/', { failOnStatusCode: false });
    cy.get('[data-testid="nickname-input"]').type('TestPlayer');
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="game-container"]').should('exist');
    cy.contains('Welcome, TestPlayer');
  });

  it('should have the main game container if nickname cookie is set', () => {
    cy.setCookie('playerNickname', 'TestPlayer');
    cy.visit('/', { failOnStatusCode: false });
    cy.get('[data-testid="game-container"]').should('exist');
    cy.contains('Welcome, TestPlayer');
  });
}); 