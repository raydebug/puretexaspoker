/// <reference types="cypress" />
/// <reference types="@types/chai" />

import './commands';
import 'cypress-file-upload';

declare global {
  namespace Cypress {
    interface Chainable {
      // Game-related commands
      joinGame(nickname?: string): Chainable<void>;
      joinTable(tableId: number, buyIn?: number): Chainable<void>;
      verifyChips(playerName: string, minChips: number, maxChips?: number): Chainable<void>;
      waitForGameAction(action?: string): Chainable<void>;
      openNewWindow(): Chainable<Window>;
      
      // Network simulation commands
      simulateSlowNetwork(delay: number): Chainable<void>;
      
      // File-related commands
      attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>;
    }
  }
}

// Add custom commands
Cypress.Commands.add('joinGame', (nickname?: string) => {
  if (nickname) {
    cy.get('[data-testid="nickname-input"]').type(nickname);
    cy.get('[data-testid="join-button"]').click();
  }
});

Cypress.Commands.add('joinTable', (tableId: number, buyIn?: number) => {
  cy.get(`[data-testid="table-${tableId}"]`).click();
  if (buyIn) {
    cy.get('[data-testid="buy-in-input"]').type(buyIn.toString());
    cy.get('[data-testid="confirm-buy-in"]').click();
  }
});

Cypress.Commands.add('verifyChips', (playerName: string, minChips: number, maxChips?: number) => {
  cy.get(`[data-testid="player-${playerName}-chips"]`).then(($chips: any) => {
    const chips = parseInt($chips.text().replace(/[^0-9]/g, ''));
    expect(chips).to.be.at.least(minChips);
    if (maxChips) {
      expect(chips).to.be.at.most(maxChips);
    }
  });
});

Cypress.Commands.add('waitForGameAction', (action?: string) => {
  if (action) {
    cy.get(`[data-testid="game-action-${action}"]`, { timeout: 10000 }).should('be.visible');
  } else {
    cy.get('[data-testid="game-action"]', { timeout: 10000 }).should('be.visible');
  }
});

Cypress.Commands.add('simulateSlowNetwork', (delay: number) => {
  cy.intercept('**/*', (req) => {
    req.on('response', (res) => {
      res.setDelay(delay);
    });
  });
});

Cypress.Commands.add('openNewWindow', () => {
  return cy.window().then((win: any) => {
    const newWindow = win.open('about:blank');
    return cy.wrap(newWindow);
  });
}); 