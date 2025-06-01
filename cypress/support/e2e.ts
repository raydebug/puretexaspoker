/// <reference types="cypress" />
/// <reference types="@types/chai" />

import './commands';
import 'cypress-file-upload';

declare global {
  namespace Cypress {
    interface Chainable {
      // Game-related commands
      joinGame(nickname?: string): Chainable<void>;
      joinTable(tableId: string | number, buyIn?: number): Chainable<void>;
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
  const playerName = nickname || 'TestPlayer';
  
  // Visit the lobby page
  cy.visit('/');
  
  // Handle the nickname modal if it appears
  cy.get('body').then(($body: JQuery<HTMLElement>) => {
    if ($body.find('[data-testid="nickname-modal"]').length > 0) {
      cy.get('[data-testid="nickname-input"]').type(playerName);
      cy.get('[data-testid="join-button"]').click();
      // Wait for modal to disappear
      cy.get('[data-testid="nickname-modal"]').should('not.exist');
    }
  });
  
  // Wait for lobby container to be visible
  cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('joinTable', (tableId: string | number, buyIn?: number) => {
  // Start from the lobby page to ensure we're in the right place
  cy.visit('/');
  
  // First, handle the nickname modal if it appears
  cy.get('body').then(($body: JQuery<HTMLElement>) => {
    if ($body.find('[data-testid="nickname-modal"]').length > 0) {
      cy.get('[data-testid="nickname-input"]').type('TestPlayer');
      cy.get('[data-testid="join-button"]').click();
      // Wait for modal to disappear
      cy.get('[data-testid="nickname-modal"]').should('not.exist');
    }
  });
  
  // Wait for lobby to load and show tables
  cy.get('[data-testid^="table-"]', { timeout: 10000 }).should('exist');
  
  // Find any available table and click it
  cy.get('[data-testid^="table-"]').first().click();
  
  // Wait for join dialog to appear (this is different from the nickname modal)
  cy.get('[data-testid="buy-in-input"]').should('be.visible');
  
  // The nickname should already be filled from the modal, but let's make sure
  cy.get('[data-testid="nickname-input"]').should('be.visible').then(($input: JQuery<HTMLElement>) => {
    const inputValue = ($input[0] as HTMLInputElement).value;
    if (!inputValue) {
      cy.wrap($input).type('TestPlayer');
    }
  });
  
  // Set buy-in if provided
  if (buyIn) {
    cy.get('[data-testid="buy-in-input"]').clear().type(buyIn.toString());
  }
  
  // Click the confirm button
  cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });
  
  // Wait for navigation to game page (the flow is: lobby -> join dialog -> auto-join -> game)
  cy.url({ timeout: 15000 }).should('include', '/game/');
  
  // Wait for the game container to load properly
  cy.get('[data-testid="game-container"]', { timeout: 15000 }).should('be.visible');
  
  // Wait for either game content to load or error/loading message
  cy.get('[data-testid="game-status"], [data-testid="loading-message"], [data-testid="error-message"]', { timeout: 10000 }).should('be.visible');
  
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

Cypress.Commands.add('foldHand', () => {
  cy.get('[data-testid="fold-button"]').should('be.enabled').click();
});

export {}; 