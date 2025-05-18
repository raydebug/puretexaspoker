// Custom commands for the Texas Hold'em Poker game E2E tests

// User Registration and Setup
Cypress.Commands.add('enterNickname', (nickname) => {
  cy.get('input[placeholder="Enter your nickname"]').type(nickname);
  cy.get('button').contains('Enter Lobby').click();
});

// Table Selection and Joining
Cypress.Commands.add('joinTable', (tableId, buyIn) => {
  cy.get(`[data-table-id="${tableId}"]`).click();
  cy.get('input[type="number"]').clear().type(buyIn);
  cy.get('button').contains('Join Table').click();
  cy.get('.game-board', { timeout: 10000 }).should('be.visible');
});

// Pick a seat at the table
Cypress.Commands.add('takeSeat', (seatNumber) => {
  cy.get(`[data-seat="${seatNumber}"]`).click();
  cy.get('button').contains('Take Seat').click();
  cy.get(`[data-player-seat="${seatNumber}"]`, { timeout: 5000 }).should('be.visible');
});

// Game Actions
Cypress.Commands.add('check', () => {
  cy.get('button').contains('Check').click();
});

Cypress.Commands.add('fold', () => {
  cy.get('button').contains('Fold').click();
});

Cypress.Commands.add('call', () => {
  cy.get('button').contains('Call').click();
});

Cypress.Commands.add('bet', (amount) => {
  cy.get('input[type="range"]').invoke('val', amount).trigger('change');
  cy.get('button').contains('Bet').click();
});

Cypress.Commands.add('raise', (amount) => {
  cy.get('input[type="range"]').invoke('val', amount).trigger('change');
  cy.get('button').contains('Raise').click();
});

// Chat Actions
Cypress.Commands.add('sendChatMessage', (message) => {
  cy.get('.chat-input').type(message);
  cy.get('button').contains('Send').click();
});

// Wait for player turn
Cypress.Commands.add('waitForTurn', () => {
  cy.get('.player-actions', { timeout: 15000 }).should('be.visible');
});

// Wait for game phase
Cypress.Commands.add('waitForPhase', (phase) => {
  cy.get(`[data-game-phase="${phase}"]`, { timeout: 20000 }).should('be.visible');
});

// Leave table
Cypress.Commands.add('leaveTable', () => {
  cy.get('[data-player-menu]').click();
  cy.get('button').contains('Leave Table').click();
  cy.get('.lobby', { timeout: 10000 }).should('be.visible');
});

// Helper function to wait for appropriate amount of time
Cypress.Commands.add('waitForGameAction', () => {
  cy.wait(2000); // Wait for animations and state updates
});

// Open a new browser session for multi-player testing
Cypress.Commands.add('openNewSession', () => {
  cy.task('openNewSession');
});

// Wait for a specific number of players to be seated
Cypress.Commands.add('waitForPlayers', (count) => {
  cy.get('[data-player-seated="true"]', { timeout: 20000 }).should('have.length', count);
});

// Wait for a hand to complete
Cypress.Commands.add('waitForHandCompletion', () => {
  cy.get('[data-hand-complete="true"]', { timeout: 30000 }).should('be.visible');
});

// Verify player chips
Cypress.Commands.add('verifyChips', (playerName, expectedChipsMin, expectedChipsMax) => {
  cy.get(`[data-player-name="${playerName}"]`)
    .find('[data-player-chips]')
    .invoke('text')
    .then(parseInt)
    .should('be.gte', expectedChipsMin)
    .and('be.lte', expectedChipsMax);
}); 