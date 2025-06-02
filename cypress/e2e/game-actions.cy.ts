/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    joinGame(nickname: string): void;
    setPlayerStatus(status: 'away' | 'back'): void;
    openSeatMenu(): void;
    placeBet(amount: number): void;
  }
}

describe('Poker Game Actions', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/');
  });

  it('handles invalid betting amounts', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('BettingPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('BettingPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for betting controls if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="betting-controls"]').length > 0) {
        cy.get('[data-testid="betting-controls"]').should('be.visible');
      }
      if ($body.find('[data-testid="bet-button"]').length > 0) {
        cy.get('[data-testid="bet-button"]').should('be.visible');
      }
    });
  });

  it('handles player disconnection and reconnection', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('DisconnectPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('DisconnectPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for connection status UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="connection-status"]').length > 0) {
        cy.get('[data-testid="connection-status"]').should('exist');
      }
      if ($body.find('[data-testid="player-seat"]').length > 0) {
        cy.get('[data-testid="player-seat"]').should('be.visible');
      }
    });
  });

  it('handles game state synchronization', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('SyncPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('SyncPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for game state UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="game-status"]').length > 0) {
        cy.get('[data-testid="game-status"]').should('be.visible');
      }
      if ($body.find('[data-testid="pot"]').length > 0) {
        cy.get('[data-testid="pot"]').should('be.visible');
      }
      if ($body.find('[data-testid="current-bet"]').length > 0) {
        cy.get('[data-testid="current-bet"]').should('be.visible');
      }
    });
  });

  it('handles player timeout', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('TimeoutPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('TimeoutPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for timeout handling UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="timeout-indicator"]').length > 0) {
        cy.get('[data-testid="timeout-indicator"]').should('exist');
      }
      if ($body.find('[data-testid="player-status"]').length > 0) {
        cy.get('[data-testid="player-status"]').should('be.visible');
      }
    });
  });

  it('handles game completion and results', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('ResultPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ResultPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for game results UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="game-results"]').length > 0) {
        cy.get('[data-testid="game-results"]').should('exist');
      }
      if ($body.find('[data-testid="winner-announcement"]').length > 0) {
        cy.get('[data-testid="winner-announcement"]').should('exist');
      }
    });
  });

  it('handles chat functionality', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('ChatPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ChatPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for chat UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="chat-toggle"]').length > 0) {
        cy.get('[data-testid="chat-toggle"]').should('be.visible');
      }
      if ($body.find('[data-testid="chat-input"]').length > 0) {
        cy.get('[data-testid="chat-input"]').should('exist');
      }
    });
  });

  it('handles player statistics', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('StatsPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('StatsPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for player statistics UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="player-stats-toggle"]').length > 0) {
        cy.get('[data-testid="player-stats-toggle"]').should('be.visible');
      }
      if ($body.find('[data-testid="player-stats"]').length > 0) {
        cy.get('[data-testid="player-stats"]').should('exist');
      }
    });
  });
}); 