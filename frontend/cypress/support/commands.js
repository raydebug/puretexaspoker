// Custom commands for the Texas Hold'em Poker game E2E tests

// User Registration and Setup
Cypress.Commands.add('enterNickname', (nickname) => {
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
Cypress.Commands.add('joinTable', (tableId, buyIn) => {
  // First navigate to the lobby if not already there
  cy.url().then(url => {
    if (!url.includes('lobby')) {
      cy.visit('/lobby');
    }
  });
  
  // Click on a table
  cy.get(`[data-table-id="${tableId}"]`).click();
  // Enter buy-in amount
  cy.get('input[type="number"]').clear().type(buyIn);
  // Click join button
  cy.contains('Join Table').click();
  // Wait for game board to appear
  cy.get('.game-board', { timeout: 10000 }).should('be.visible');
});

// Pick a seat at the table
Cypress.Commands.add('takeSeat', (seatNumber) => {
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

// Player status commands
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

Cypress.Commands.add('joinGame', (nickname) => {
  // Check if we need to login or just join the game
  cy.url().then(url => {
    // If we're not on a login page, get to it
    if (!url.includes('login') && !url.includes('join')) {
      cy.visit('/join');
    }
    
    // Enter nickname if an input is present
    cy.get('input').then($inputs => {
      const nicknameInput = $inputs.filter('[placeholder*="nickname"], [placeholder*="Nickname"], [type="text"]').first();
      if (nicknameInput.length) {
        cy.wrap(nicknameInput).type(nickname);
      }
    });
    
    // Click the appropriate button to join
    cy.contains('button', /join|enter|start/i, { matchCase: false }).click();
  });
});

// Place a bet with a specific amount
Cypress.Commands.add('placeBet', (amount) => {
  cy.get('.betting-controls').within(() => {
    cy.get('input[type="number"]').type(amount.toString());
    cy.contains('Bet').click();
  });
}); 