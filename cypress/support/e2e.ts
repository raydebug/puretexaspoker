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
  // Start from the lobby page to ensure we're in the right place
  cy.visit('/');
  
  // Wait for lobby to load and show tables
  cy.get('[data-testid^="table-"]', { timeout: 10000 }).should('exist');
  
  // Find any available table and click it
  cy.get('[data-testid^="table-"]').first().click();
  
  // Wait for join dialog to appear
  cy.get('[data-testid="nickname-input"]').should('be.visible');
  
  // Fill in nickname (required for the button to be enabled)
  cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('TestPlayer');
  
  if (buyIn) {
    // Look for buy-in input in modal or form and fill it
    cy.get('[data-testid="buy-in-input"]').should('be.visible').clear().type(buyIn.toString());
  }
  
  // Wait a moment for the form to update
  cy.wait(500);
  
  // Click the confirm button to join the table
  cy.get('[data-testid="confirm-buy-in"]').should('not.be.disabled').click();
  
  // Wait for navigation through join-table page to game page
  // The flow is: lobby -> join dialog -> join-table page -> game page
  cy.url({ timeout: 15000 }).should('include', '/game/');
  
  // Wait for the game to load properly
  cy.get('[data-testid="game-table"]', { timeout: 15000 }).should('be.visible');
  
  // Also wait for the game status to be visible (indicating the game is loaded)
  cy.get('[data-testid="game-status"]', { timeout: 10000 }).should('be.visible');
  
  // Wait a bit more for the socket connection and game state to stabilize
  cy.wait(2000);
});

Cypress.Commands.add('verifyChips', (playerName: string, minChips: number, maxChips?: number) => {
  // Wait longer and provide better error messages
  cy.get(`[data-testid="player-${playerName}-chips"]`, { timeout: 15000 }).should('be.visible').then(($chips: any) => {
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