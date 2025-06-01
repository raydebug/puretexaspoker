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
    cy.visit('/');
  });

  it('handles invalid betting amounts', () => {
    cy.joinGame('BettingPlayer');
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');

    // Test betting more than available chips
    cy.get('.betting-controls').within(() => {
      cy.placeBet(2000); // More than starting chips
      cy.contains('Invalid bet amount').should('be.visible');
      cy.contains('Chips: 1000').should('be.visible'); // Chips should remain unchanged
    });
  });

  it('handles player disconnection and reconnection', () => {
    cy.joinGame('DisconnectPlayer');
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Simulate disconnection
    cy.window().then((win) => {
      win.dispatchEvent(new Event('offline'));
    });

    // Verify disconnection handling
    cy.contains('Connection lost').should('be.visible');
    cy.contains('Attempting to reconnect').should('be.visible');

    // Simulate reconnection
    cy.window().then((win) => {
      win.dispatchEvent(new Event('online'));
    });

    // Verify reconnection
    cy.contains('Connection restored').should('be.visible');
    cy.contains('DisconnectPlayer').should('be.visible');
    cy.get('.player-seat').should('exist');
  });

  it('handles game state synchronization', () => {
    cy.joinGame('SyncPlayer');
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Verify initial game state
    cy.get('.game-status').should('be.visible');
    cy.get('.pot').should('be.visible');
    cy.get('.current-bet').should('be.visible');

    // Simulate state update
    cy.window().then((win) => {
      const event = new CustomEvent('gameStateUpdate', {
        detail: {
          pot: 100,
          currentBet: 50,
          phase: 'flop'
        }
      });
      win.dispatchEvent(event);
    });

    // Verify state update
    cy.get('.pot').should('contain', '100');
    cy.get('.current-bet').should('contain', '50');
    cy.get('.game-status').should('contain', 'Flop');
  });

  it('handles player timeout', () => {
    cy.joinGame('TimeoutPlayer');
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Simulate player timeout
    cy.window().then((win) => {
      const event = new CustomEvent('playerTimeout', {
        detail: { playerId: 'TimeoutPlayer' }
      });
      win.dispatchEvent(event);
    });

    // Verify timeout handling
    cy.contains('TimeoutPlayer').parent().should('have.css', 'opacity', '0.5');
    cy.contains('Auto-folded').should('be.visible');
  });

  it('handles game completion and results', () => {
    cy.joinGame('ResultPlayer');
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Simulate game completion
    cy.window().then((win) => {
      const event = new CustomEvent('gameComplete', {
        detail: {
          winner: 'ResultPlayer',
          pot: 1000,
          hand: 'Royal Flush'
        }
      });
      win.dispatchEvent(event);
    });

    // Verify results display
    cy.contains('Game Over').should('be.visible');
    cy.contains('Winner: ResultPlayer').should('be.visible');
    cy.contains('Hand: Royal Flush').should('be.visible');
    cy.contains('Pot: 1000').should('be.visible');
  });

  it('handles chat functionality', () => {
    cy.joinGame('ChatPlayer');
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Open chat
    cy.get('.chat-toggle').click();
    cy.get('.chat-input').should('be.visible');

    // Send message
    cy.get('.chat-input').type('Hello, poker!{enter}');
    cy.get('.chat-messages').should('contain', 'Hello, poker!');

    // Verify message persistence
    cy.reload();
    cy.get('.chat-toggle').click();
    cy.get('.chat-messages').should('contain', 'Hello, poker!');
  });

  it('handles player statistics', () => {
    cy.joinGame('StatsPlayer');
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Open stats
    cy.get('.player-stats-toggle').click();
    cy.get('.player-stats').should('be.visible');

    // Verify stats display
    cy.get('.player-stats').within(() => {
      cy.contains('Games Played').should('be.visible');
      cy.contains('Win Rate').should('be.visible');
      cy.contains('Total Winnings').should('be.visible');
    });
  });
}); 