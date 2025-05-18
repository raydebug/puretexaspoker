import '@testing-library/cypress/add-commands';

// Cypress commands for common game actions
Cypress.Commands.add('joinGame', (nickname: string) => {
  cy.get('input[placeholder="Enter your nickname"]').type(nickname);
  cy.get('button').contains('Join Game').click();
});

Cypress.Commands.add('openSeatMenu', () => {
  cy.get('.player-seat').click();
});

Cypress.Commands.add('setPlayerStatus', (status: 'away' | 'back') => {
  cy.openSeatMenu();
  if (status === 'away') {
    cy.contains('Leave Midway').click();
  } else {
    cy.contains('I Am Back').click();
  }
});

Cypress.Commands.add('placeBet', (amount: number) => {
  cy.get('.betting-controls').within(() => {
    cy.get('input[type="number"]').type(amount.toString());
    cy.contains('Bet').click();
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      joinGame(nickname: string): Chainable<void>;
      openSeatMenu(): Chainable<void>;
      setPlayerStatus(status: 'away' | 'back'): Chainable<void>;
      placeBet(amount: number): Chainable<void>;
    }
  }
} 