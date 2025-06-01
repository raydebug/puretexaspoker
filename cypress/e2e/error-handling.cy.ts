/// <reference types="cypress" />

describe('Error Handling and Network Testing', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('handles network errors gracefully', () => {
    cy.simulateNetworkError();
    cy.joinGame('TestPlayer');
    
    // Verify error message is displayed
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Network error');
    
    // Verify retry button is available
    cy.get('[data-testid="retry-button"]')
      .should('be.visible')
      .and('be.enabled');
  });

  it('handles slow network conditions', () => {
    cy.simulateSlowNetwork(2000);
    cy.joinGame('TestPlayer');
    
    // Verify loading state
    cy.get('[data-testid="loading-spinner"]')
      .should('be.visible');
    
    // Verify game loads after delay
    cy.get('[data-testid="game-table"]', { timeout: 5000 })
      .should('be.visible');
  });

  it('handles invalid game state gracefully', () => {
    cy.joinGame('TestPlayer');
    
    // Simulate invalid game state
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('gameStateError', {
        detail: { message: 'Invalid game state' }
      }));
    });
    
    // Verify error handling
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid game state');
    
    // Verify recovery options
    cy.get('[data-testid="recover-button"]')
      .should('be.visible')
      .click();
    
    // Verify game recovers
    cy.get('[data-testid="game-table"]')
      .should('be.visible');
  });

  it('handles session expiration', () => {
    cy.joinGame('TestPlayer');
    
    // Simulate session expiration
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('sessionExpired'));
    });
    
    // Verify session expired message
    cy.get('[data-testid="session-expired-message"]')
      .should('be.visible');
    
    // Verify redirect to login
    cy.url().should('include', '/');
  });

  it('handles concurrent user actions', () => {
    cy.joinGame('TestPlayer1');
    
    // Simulate concurrent user
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('concurrentUser', {
        detail: { action: 'bet', amount: 100 }
      }));
    });
    
    // Verify conflict resolution
    cy.get('[data-testid="conflict-message"]')
      .should('be.visible')
      .and('contain', 'Another player has made a move');
    
    // Verify game state is updated
    cy.verifyGameState('betting');
  });
}); 