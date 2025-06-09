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
    // Wait for the React app to mount by checking for any React rendered content
    cy.get('body').should('not.be.empty');
    cy.get('#root').should('exist');
    // Wait for React app to load components
    cy.get('[data-testid="game-container"]', { timeout: 30000 }).should('exist');
    // Then check for the nickname modal
    cy.get('[data-testid="nickname-modal"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible');
  });

  it('should allow entering nickname in modal and show lobby', () => {
    cy.visit('/', { failOnStatusCode: false });
    // Wait for React app to load
    cy.get('[data-testid="game-container"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="nickname-modal"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').type('TestPlayer');
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Welcome, TestPlayer');
  });

  it('should have the main game container if nickname cookie is set', () => {
    cy.setCookie('playerNickname', 'TestPlayer');
    cy.visit('/', { failOnStatusCode: false });
    // Wait for React app to load
    cy.get('[data-testid="game-container"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Welcome, TestPlayer');
  });
}); 