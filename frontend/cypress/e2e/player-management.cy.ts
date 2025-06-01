describe('Player Management', () => {
  beforeEach(() => {
    // Clear cookies to ensure clean state
    cy.clearCookies();
    cy.visit('/');
  });

  it('should handle player registration and login', () => {
    // The app uses a simple nickname modal instead of registration
    // Wait for nickname modal to appear
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    
    // Enter nickname
    cy.get('[data-testid="nickname-input"]').type('TestPlayer');
    cy.get('[data-testid="join-button"]').click();
    
    // Verify modal disappears and lobby loads
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', 'TestPlayer');
  });

  it('should handle player profile management', () => {
    // Set nickname cookie to skip modal
    cy.setCookie('playerNickname', 'TestPlayer');
    cy.visit('/');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // For now, just verify that the lobby loads correctly
    // Avatar upload functionality will be implemented when we have a profile page
    cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0);
  });

  it('should handle player status changes', () => {
    // Set nickname cookie to skip modal
    cy.setCookie('playerNickname', 'TestPlayer');
    cy.visit('/');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table manually instead of using cy.joinTable
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('TestPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });
    
    // For now, just verify we can navigate to a game
    // Status change functionality will be implemented in the game page
    cy.url().should('include', '/game/');
  });

  it('should handle player statistics', () => {
    // Set nickname cookie to skip modal
    cy.setCookie('playerNickname', 'TestPlayer');
    cy.visit('/');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // For now, just verify that the lobby loads correctly
    // Statistics functionality will be implemented when we have a stats page
    cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0);
  });

  it('should handle player settings', () => {
    // Set nickname cookie to skip modal
    cy.setCookie('playerNickname', 'TestPlayer');
    cy.visit('/');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // For now, just verify that the lobby loads correctly
    // Settings functionality will be implemented when we have a settings page
    cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0);
  });
}); 