// Import testing library
import '@testing-library/cypress/add-commands';

// Define custom commands for poker game testing
Cypress.Commands.add('joinGame', (nickname) => {
  cy.get('input[placeholder="Enter your nickname"]').type(nickname);
  cy.get('button').contains('Join Game').click();
});

Cypress.Commands.add('enterNickname', (nickname) => {
  cy.get('input[placeholder="Enter your nickname"]').type(nickname);
});

Cypress.Commands.add('joinTable', (tableId, buyIn) => {
  cy.get(`[data-table-id="${tableId}"]`).click();
  cy.get('input[type="number"]').clear().type(buyIn);
  cy.contains('Join Table').click();
});

Cypress.Commands.add('takeSeat', (seatNumber) => {
  cy.get(`[data-seat="${seatNumber}"]`).click();
  cy.contains('Take Seat').click();
});

Cypress.Commands.add('waitForPlayers', (count) => {
  cy.get('[data-player-seat]', { timeout: 10000 }).should('have.length', count);
});

Cypress.Commands.add('verifyChips', (playerName, minAmount, maxAmount) => {
  cy.get(`[data-player-name="${playerName}"]`)
    .find('[data-player-chips]')
    .invoke('text')
    .then(text => {
      const chips = parseInt(text.replace(/[^0-9]/g, ''));
      expect(chips).to.be.within(minAmount, maxAmount);
    });
});

Cypress.Commands.add('waitForPhase', (phase) => {
  cy.get('[data-game-phase]', { timeout: 20000 }).should('have.attr', 'data-game-phase', phase);
});

Cypress.Commands.add('waitForTurn', () => {
  cy.get('[data-current-player="true"]', { timeout: 20000 }).should('exist');
});

Cypress.Commands.add('checkAction', () => {
  cy.get('button').contains('Check').click();
});

Cypress.Commands.add('call', () => {
  cy.get('button').contains('Call').click();
});

Cypress.Commands.add('fold', () => {
  cy.get('button').contains('Fold').click();
});

Cypress.Commands.add('bet', (amount) => {
  cy.get('input[type="number"]').clear().type(amount);
  cy.get('button').contains('Bet').click();
});

Cypress.Commands.add('raise', (amount) => {
  cy.get('input[type="number"]').clear().type(amount);
  cy.get('button').contains('Raise').click();
});

Cypress.Commands.add('waitForGameAction', () => {
  cy.wait(1000); // Simple wait for action to complete
});

Cypress.Commands.add('waitForHandCompletion', () => {
  cy.get('[data-hand-complete="true"]', { timeout: 30000 }).should('exist');
});

Cypress.Commands.add('leaveTable', () => {
  cy.get('.player-menu').click();
  cy.contains('Leave Table').click();
  cy.contains('Yes').click();
});

Cypress.Commands.add('openSeatMenu', () => {
  cy.get('.player-seat').click();
});

Cypress.Commands.add('setPlayerStatus', (status) => {
  cy.openSeatMenu();
  if (status === 'away') {
    cy.contains('Leave Midway').click();
  } else {
    cy.contains('I Am Back').click();
  }
});

Cypress.Commands.add('placeBet', (amount) => {
  cy.get('.betting-controls').within(() => {
    cy.get('input[type="number"]').type(amount.toString());
    cy.contains('Bet').click();
  });
}); 