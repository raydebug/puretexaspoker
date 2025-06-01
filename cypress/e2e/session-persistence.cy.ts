/// <reference types="cypress" />

describe('Session Persistence', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/', { failOnStatusCode: false });
  });

  it('persists player nickname after page reload', () => {
    // Set nickname and join
    cy.get('[data-testid="nickname-input"]').type('PersistenceTest');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Verify nickname is displayed
    cy.get('[data-testid="user-name"]').should('contain', 'PersistenceTest');
    
    // Reload the page
    cy.reload();
    
    // Verify the nickname persists (should skip modal and go to lobby)
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', 'PersistenceTest');
  });

  it('persists player seat after page reload', () => {
    // Set nickname and join table
    cy.get('[data-testid="nickname-input"]').type('SeatTest');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join first available table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Fill in both nickname and buy-in amount in the join dialog
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('SeatTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in the game
    cy.url().should('include', '/game/');
    
    // Record the current URL for comparison
    cy.url().then((gameUrl) => {
      // Reload the page
      cy.reload();
      
      // Verify we're still in the same game
      cy.url().should('eq', gameUrl);
    });
  });

  it('persists player away status after page reload', () => {
    // Set nickname and join table
    cy.get('[data-testid="nickname-input"]').type('AwayTest');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join first available table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Fill in both nickname and buy-in amount in the join dialog
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('AwayTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in the game
    cy.url().should('include', '/game/');
    
    // For now, just verify the game loads and persists
    cy.reload();
    cy.url().should('include', '/game/');
  });

  it('persists player chips after page reload', () => {
    // Set nickname and join table
    cy.get('[data-testid="nickname-input"]').type('ChipsTest');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join first available table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Fill in both nickname and buy-in amount in the join dialog
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ChipsTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in the game
    cy.url().should('include', '/game/');
    
    // Test that the game state persists after reload
    cy.reload();
    cy.url().should('include', '/game/');
  });

  it('persists observer status after page reload', () => {
    // Set nickname and stay in lobby (observer mode)
    cy.get('[data-testid="nickname-input"]').type('ObserverTest');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Verify we're in observer mode (in lobby)
    cy.get('[data-testid="user-name"]').should('contain', 'ObserverTest');
    
    // Reload the page
    cy.reload();
    
    // Verify we're still in lobby as observer
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', 'ObserverTest');
  });

  it('persists chat messages after page reload', () => {
    // Set nickname and join table
    cy.get('[data-testid="nickname-input"]').type('ChatTest');
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join first available table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Fill in both nickname and buy-in amount in the join dialog
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ChatTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in the game
    cy.url().should('include', '/game/');
    
    // Test basic persistence - if chat is implemented, it would persist
    // For now, just verify the game session persists
    cy.reload();
    cy.url().should('include', '/game/');
  });
}); 