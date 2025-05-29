/// <reference types="cypress" />
/// <reference types="mocha" />

export {};

declare global {
  namespace Cypress {
    interface Chainable {
      // Game-related commands
      joinGame(nickname: string): Chainable<void>;
      joinTable(tableId: number, buyIn: number): Chainable<void>;
      verifyChips(playerName: string, minChips: number, maxChips: number): Chainable<void>;
      waitForGameAction(action: string): Chainable<void>;
      openNewWindow(): Chainable<Window>;
      
      // Network simulation commands
      simulateSlowNetwork(delay: number): Chainable<void>;
      
      // File-related commands
      attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>;
    }
  }
}

describe('Game Actions', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should allow players to perform game actions', () => {
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
}); 