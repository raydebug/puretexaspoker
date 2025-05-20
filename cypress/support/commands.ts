// Custom commands for the Texas Hold'em Poker game E2E tests

// Type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      enterNickname(nickname: string): void;
      joinTable(tableId: number, buyIn: number): void;
      takeSeat(seatNumber: number): void;
      checkAction(): void;
      fold(): void;
      call(): void;
      bet(amount: number): void;
      raise(amount: number): void;
      sendChatMessage(message: string): void;
      waitForTurn(): void;
      waitForPhase(phase: string): void;
      leaveTable(): void;
      waitForGameAction(): void;
      openNewSession(): void;
      waitForPlayers(count: number): void;
      waitForHandCompletion(): void;
      verifyChips(playerName: string, expectedChipsMin: number, expectedChipsMax: number): void;
      openSeatMenu(): void;
      setPlayerStatus(status: 'away' | 'back'): void;
      joinGame(nickname: string): void;
      placeBet(amount: number): void;
      waitForGameStart(): void;
      verifyPlayerState(nickname: string, chips: number): void;
      verifyGamePhase(phase: string): void;
    }
  }
}

// User Registration and Setup
Cypress.Commands.add('enterNickname', (nickname: string) => {
  // First check if we're on a page with a login form
  cy.url().then(url => {
    if (url.includes('login') || url.includes('join')) {
      // Look for the nickname input field
      cy.get('input[type="text"]').type(nickname);
    } else {
      // If we're on the lobby page, we might need to navigate to GameLobby
      cy.visit('/join');
      cy.get('input[type="text"]').type(nickname);
    }
  });
});

// Table Selection and Joining
Cypress.Commands.add('joinTable', (tableId: number, buyIn: number) => {
  // First navigate to the lobby if not already there
  cy.url().then(url => {
    if (!url.includes('lobby')) {
      cy.visit('/lobby');
    }
  });
  
  // Click on a table
  cy.get(`[data-table-id="${tableId}"]`).click();
  // Enter buy-in amount
  cy.get('input[type="number"]').clear().type(buyIn.toString());
  // Click join button
  cy.contains('Join Table').click();
  // Wait for game board to appear
  cy.get('.game-board', { timeout: 10000 }).should('be.visible');
});

// Pick a seat at the table
Cypress.Commands.add('takeSeat', (seatNumber: number) => {
  cy.get(`[data-seat="${seatNumber}"]`).click();
  cy.get('button').contains('Take Seat').click();
  cy.get(`[data-player-seat="${seatNumber}"]`, { timeout: 5000 }).should('be.visible');
});

// Game Actions
Cypress.Commands.add('checkAction', () => { // Renamed from 'check' to avoid collision with built-in command
  cy.get('button').contains('Check').click();
});

Cypress.Commands.add('fold', () => {
  cy.get('button').contains('Fold').click();
});

Cypress.Commands.add('call', () => {
  cy.get('button').contains('Call').click();
});

Cypress.Commands.add('bet', (amount: number) => {
  cy.get('input[type="range"]').invoke('val', amount).trigger('change');
  cy.get('button').contains('Bet').click();
});

Cypress.Commands.add('raise', (amount: number) => {
  cy.get('input[type="range"]').invoke('val', amount).trigger('change');
  cy.get('button').contains('Raise').click();
});

// Chat Actions
Cypress.Commands.add('sendChatMessage', (message: string) => {
  cy.get('.chat-input').type(message);
  cy.get('button').contains('Send').click();
});

// Wait for player turn
Cypress.Commands.add('waitForTurn', () => {
  cy.get('.player-actions', { timeout: 15000 }).should('be.visible');
});

// Wait for game phase
Cypress.Commands.add('waitForPhase', (phase: string) => {
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
Cypress.Commands.add('waitForPlayers', (count: number) => {
  cy.get('[data-player-seated="true"]', { timeout: 20000 }).should('have.length', count);
});

// Wait for a hand to complete
Cypress.Commands.add('waitForHandCompletion', () => {
  cy.get('[data-hand-complete="true"]', { timeout: 30000 }).should('be.visible');
});

// Verify player chips
Cypress.Commands.add('verifyChips', (playerName: string, expectedChipsMin: number, expectedChipsMax: number) => {
  cy.get(`[data-player-name="${playerName}"]`)
    .find('[data-player-chips]')
    .invoke('text')
    .then((text: string) => {
      const chips = parseInt(text.replace(/[^0-9]/g, ''));
      expect(chips).to.be.gte(expectedChipsMin);
      expect(chips).to.be.lte(expectedChipsMax);
    });
});

// Player status commands
Cypress.Commands.add('openSeatMenu', () => {
  cy.get('[data-testid="player-seat"]').first().click();
});

Cypress.Commands.add('setPlayerStatus', (status: 'away' | 'back') => {
  cy.get('[data-testid="player-menu"]').click();
  cy.get(`[data-testid="${status}-button"]`).click();
});

Cypress.Commands.add('joinGame', (nickname: string) => {
  cy.visit('/');
  cy.get('[data-testid="nickname-input"]').type(nickname);
  cy.get('[data-testid="join-button"]').click();
  cy.waitForGameStart();
});

// Place a bet with a specific amount
Cypress.Commands.add('placeBet', (amount: number) => {
  cy.get('[data-testid="bet-amount"]').type(amount.toString());
  cy.get('[data-testid="place-bet-button"]').click();
});

Cypress.Commands.add('waitForGameStart', () => {
  cy.get('[data-testid="game-table"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="dealer-button"]').should('exist');
});

Cypress.Commands.add('verifyPlayerState', (nickname: string, chips: number) => {
  cy.contains(nickname).should('be.visible');
  cy.contains(`Chips: ${chips}`).should('be.visible');
});

Cypress.Commands.add('verifyGamePhase', (phase: string) => {
  cy.get('[data-testid="game-phase"]').should('contain', phase);
});

// Error handling
Cypress.on('uncaught:exception', (err) => {
  console.error('Uncaught exception:', err);
  return false;
});

// Logging
Cypress.on('test:after:run', (attributes) => {
  console.log('Test completed:', attributes.title);
  if (attributes.state === 'failed') {
    console.error('Test failed:', attributes.error);
  }
});

// Export an empty object to make TypeScript happy
export {}; 