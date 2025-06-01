/// <reference types="cypress" />
/// <reference types="mocha" />

describe('Game Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle basic game flow', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);
    cy.verifyChips(player.name, player.chips, player.chips * 2);
    cy.waitForGameAction('bet');
  });

  it('should handle multiple players', () => {
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

  it('should handle game phases', () => {
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

  it('should handle game end', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);
    cy.verifyChips(player.name, player.chips, player.chips * 2);

    // Play until game ends
    cy.waitForGameAction('bet');
    cy.waitForGameAction('fold');
  });
}); 