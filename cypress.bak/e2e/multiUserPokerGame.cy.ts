/// <reference types="cypress" />
/// <reference types="mocha" />

describe('Multi-User Poker Game', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle multiple players in a game', () => {
    const players = [
      {
        nickname: 'Player1',
        chips: 1000,
        buyIn: 1000,
        name: 'Player1'
      },
      {
        nickname: 'Player2',
        chips: 1000,
        buyIn: 1000,
        name: 'Player2'
      }
    ];

    players.forEach(player => {
      cy.joinGame(player.nickname);
      cy.joinTable(1, player.buyIn);
      cy.verifyChips(player.name, player.chips, player.chips * 2);
    });

    cy.waitForGameAction('bet');
  });

  it('should handle betting rounds', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);
    cy.verifyChips(player.name, player.chips, player.chips * 2);

    // Pre-flop
    cy.waitForGameAction('bet');

    // Flop
    cy.waitForGameAction('check');

    // Turn
    cy.waitForGameAction('bet');

    // River
    cy.waitForGameAction('fold');
  });

  it('should handle all-in situations', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);
    cy.verifyChips(player.name, player.chips, player.chips * 2);

    // Play until all-in
    cy.waitForGameAction('bet');
    cy.waitForGameAction('all-in');
  });

  it('should handle player disconnections', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);
    cy.verifyChips(player.name, player.chips, player.chips * 2);

    // Simulate disconnection
    cy.window().then(win => {
      win.close();
    });

    // Reconnect
    cy.visit('/');
    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);
    cy.verifyChips(player.name, player.chips, player.chips * 2);
  });
}); 