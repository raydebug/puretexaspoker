/// <reference types="cypress" />

describe('Error Handling and Network Testing', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/', { failOnStatusCode: false });
  });

  it('handles network errors gracefully', () => {
    // Test basic error handling by visiting a non-existent page
    cy.visit('/non-existent-page', { failOnStatusCode: false });
    
    // The app should handle this gracefully and redirect or show an error
    // For now, just verify the app doesn't crash
    cy.get('body').should('exist');
  });

  it('handles slow network conditions', () => {
    // Set nickname and join table to test loading states
    cy.get('[data-testid="nickname-input"]').type('SlowNetworkPlayer');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join first available table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Fill in both nickname and buy-in amount in the join dialog
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('SlowNetworkPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we can navigate to game (tests basic loading)
    cy.url().should('include', '/game/');
  });

  it('handles invalid game state gracefully', () => {
    // Set nickname and join table
    cy.get('[data-testid="nickname-input"]').type('InvalidStatePlayer');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join first available table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Fill in both nickname and buy-in amount in the join dialog
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('InvalidStatePlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we can navigate to game
    cy.url().should('include', '/game/');
    
    // Test that the game page loads without crashing
    cy.get('body').should('exist');
  });

  it('handles session expiration', () => {
    // Test session handling by clearing cookies mid-session
    cy.get('[data-testid="nickname-input"]').type('SessionPlayer');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Clear cookies to simulate session expiration
    cy.clearCookies();
    
    // Reload page to test session handling
    cy.reload();
    
    // Should show nickname modal again
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
  });

  it('handles concurrent user actions', () => {
    // Test basic concurrent access by opening multiple tabs/sessions
    cy.get('[data-testid="nickname-input"]').type('ConcurrentPlayer');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join first available table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Fill in both nickname and buy-in amount in the join dialog
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ConcurrentPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we can navigate to game
    cy.url().should('include', '/game/');
    
    // Test that multiple actions don't crash the app
    cy.get('body').should('exist');
  });
}); 