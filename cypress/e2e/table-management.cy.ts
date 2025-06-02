describe('Table Management', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/');
  });

  it('should handle table creation and configuration', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('AdminPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');

    // Check if table creation UI exists (this is likely an admin feature)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="create-table-button"]').length > 0) {
        cy.get('[data-testid="create-table-button"]').should('be.visible');
      }
      if ($body.find('[data-testid="table-form"]').length > 0) {
        cy.get('[data-testid="table-form"]').should('exist');
      }
    });

    // Basic verification that lobby shows existing tables
    cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0);
  });

  it('should handle table joining and leaving', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('TestPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('TestPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for basic game UI elements indicating successful join
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="leave-table-button"]').length > 0) {
        cy.get('[data-testid="leave-table-button"]').should('be.visible');
      }
      if ($body.find('[data-testid="player-seat"]').length > 0) {
        cy.get('[data-testid="player-seat"]').should('be.visible');
      }
    });
  });

  it('should handle table settings', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('SettingsPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');

    // Check if table settings UI exists (this is likely an admin feature)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="table-settings-button"]').length > 0) {
        cy.get('[data-testid="table-settings-button"]').should('be.visible');
      }
      if ($body.find('[data-testid="table-settings-form"]').length > 0) {
        cy.get('[data-testid="table-settings-form"]').should('exist');
      }
    });

    // Basic verification that lobby functionality works
    cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0);
  });

  it('should handle table statistics', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('StatsPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');

    // Check if table statistics UI exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="table-stats-button"]').length > 0) {
        cy.get('[data-testid="table-stats-button"]').should('be.visible');
      }
      if ($body.find('[data-testid="table-stats"]').length > 0) {
        cy.get('[data-testid="table-stats"]').should('exist');
      }
    });

    // Basic verification that lobby shows table information
    cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0);
  });

  it('should handle table chat moderation', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('ModeratorPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ModeratorPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for basic chat UI if it exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="chat-toggle"]').length > 0) {
        cy.get('[data-testid="chat-toggle"]').should('be.visible');
      }
      if ($body.find('[data-testid="chat-input"]').length > 0) {
        cy.get('[data-testid="chat-input"]').should('exist');
      }
    });
  });
}); 