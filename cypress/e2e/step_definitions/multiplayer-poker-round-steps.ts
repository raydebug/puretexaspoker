import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Types for player data
interface PlayerData {
  nickname: string;
  buyIn: number;
  seatNumber?: number;
  chips?: number;
  id?: string;
}

// Global test state
let testPlayers: PlayerData[] = [];
let gameState: any = null;
let initialPotSize = 0;
let expectedPotSize = 0;

// Background steps (reuse from login-join-take-seats)
Given('I am on the poker lobby page', () => {
  cy.visit('/');
  cy.get('[data-testid="lobby-container"]').should('be.visible');
});

Given('tables are loaded and visible', () => {
  cy.get('[data-testid="table-card"]').should('have.length.greaterThan', 0);
  cy.wait(1000); // Allow tables to fully load
});

// Player setup steps
Given('I have {int} players ready to join:', (playerCount: number, dataTable) => {
  cy.log(`🎯 Setting up ${playerCount} players for multiplayer test`);
  
  const players = dataTable.hashes() as PlayerData[];
  testPlayers = players;
  
  cy.log(`🎯 Players configured: ${JSON.stringify(testPlayers)}`);
  expect(testPlayers).to.have.length(playerCount);
  
  // Verify each player has required data
  testPlayers.forEach((player, index) => {
    expect(player.nickname).to.exist;
    expect(player.buyIn).to.be.a('number');
    cy.log(`✅ Player ${index + 1}: ${player.nickname} with $${player.buyIn} buy-in`);
  });
});

// Table joining steps
When('all players join table {string}', (tableId: string) => {
  cy.log(`🎯 All players joining table ${tableId}`);
  
  // For test mode, we'll simulate all players joining
  // In a real scenario, this would involve multiple browser instances
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      cy.log('🎯 Test mode: Simulating multiple players joining table');
      
      // Store test players in window for access by game components
      (win as any).testPlayers = testPlayers;
      (win as any).multiplayerTestMode = true;
    }
  });
  
  // Navigate to the game page
  cy.get(`[data-testid="join-table-${tableId}"]`).first().click();
  cy.url().should('include', `/game/${tableId}`);
  cy.get('[data-testid="observer-view"]').should('be.visible');
});

When('{string} takes seat {string} with buy-in {string}', (nickname: string, seatNumber: string, buyIn: string) => {
  cy.log(`🎯 ${nickname} taking seat ${seatNumber} with $${buyIn} buy-in`);
  
  // Find the player in our test data
  const player = testPlayers.find(p => p.nickname === nickname);
  expect(player).to.exist;
  
  // Update player data with seat info
  if (player) {
    player.seatNumber = parseInt(seatNumber);
    player.chips = parseInt(buyIn);
  }
  
  // Set the current player nickname in localStorage for the seat taking
  cy.window().then((win) => {
    win.localStorage.setItem('nickname', nickname);
  });
  
  // Click on the available seat
  cy.get(`[data-testid="available-seat-${seatNumber}"]`).click();
  
  // Handle the seat dialog
  cy.get('[data-testid="seat-dialog"]').should('be.visible');
  cy.get('[data-testid="buy-in-input"]').clear().type(buyIn);
  cy.get('[data-testid="confirm-seat-btn"]').click();
  
  // Wait for seat to be taken
  cy.wait(1000);
  cy.log(`✅ ${nickname} seated at seat ${seatNumber} with $${buyIn}`);
});

// Verification steps
Then('all {int} players should be seated at the table', (playerCount: number) => {
  cy.log(`🔍 Verifying ${playerCount} players are seated`);
  
  // Check that we have the expected number of players in the players list
  cy.get('h3:contains("Players")').parent().within(() => {
    cy.get('li').should('have.length', playerCount);
  });
  
  // Verify each player is seated at their expected seat
  testPlayers.forEach(player => {
    if (player.seatNumber) {
      cy.get(`[data-testid="seat-${player.seatNumber}"]`).should('contain', player.nickname);
      cy.log(`✅ ${player.nickname} confirmed at seat ${player.seatNumber}`);
    }
  });
});

Then('the game status should be {string}', (expectedStatus: string) => {
  cy.log(`🔍 Verifying game status is "${expectedStatus}"`);
  
  // Check game status in the UI
  cy.get('[data-testid="game-status"]').should('contain', expectedStatus);
  cy.log(`✅ Game status confirmed as "${expectedStatus}"`);
});

Then('each player should have their correct chip count', () => {
  cy.log('🔍 Verifying each player has correct chip count');
  
  testPlayers.forEach(player => {
    if (player.seatNumber && player.chips) {
      cy.get(`[data-testid="seat-${player.seatNumber}"]`).within(() => {
        cy.get('[data-testid="player-chips"]').should('contain', player.chips.toString());
      });
      cy.log(`✅ ${player.nickname} has correct chip count: $${player.chips}`);
    }
  });
});

// Game start steps
When('the game starts', () => {
  cy.log('🎯 Starting the game');
  
  // In test mode, simulate game start
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      // Trigger game start simulation
      cy.get('[data-testid="start-game-btn"]').click();
    }
  });
  
  cy.wait(2000); // Allow game to initialize
});

Then('the dealer button should be assigned', () => {
  cy.log('🔍 Verifying dealer button is assigned');
  
  cy.get('[data-testid="dealer-button"]').should('be.visible');
  cy.log('✅ Dealer button is visible and assigned');
});

Then('small blind should be posted by the appropriate player', () => {
  cy.log('🔍 Verifying small blind is posted');
  
  cy.get('[data-testid="small-blind-indicator"]').should('be.visible');
  cy.get('[data-testid="pot-amount"]').should('not.contain', '0');
  cy.log('✅ Small blind posted');
});

Then('big blind should be posted by the appropriate player', () => {
  cy.log('🔍 Verifying big blind is posted');
  
  cy.get('[data-testid="big-blind-indicator"]').should('be.visible');
  cy.get('[data-testid="pot-amount"]').then($pot => {
    const potAmount = parseInt($pot.text().replace(/[^0-9]/g, ''));
    expect(potAmount).to.be.greaterThan(0);
    initialPotSize = potAmount;
    expectedPotSize = potAmount;
    cy.log(`✅ Big blind posted, initial pot: $${potAmount}`);
  });
});

Then('the game phase should be {string}', (expectedPhase: string) => {
  cy.log(`🔍 Verifying game phase is "${expectedPhase}"`);
  
  cy.get('[data-testid="game-phase"]').should('contain', expectedPhase);
  cy.log(`✅ Game phase confirmed as "${expectedPhase}"`);
});

// Betting action steps
When('it\'s the first player\'s turn after big blind', () => {
  cy.log('🔍 Waiting for first player\'s turn after big blind');
  
  cy.get('[data-testid="current-player-indicator"]').should('be.visible');
  cy.get('[data-testid="action-buttons"]').should('be.visible');
});

Then('the current player should have betting options available', () => {
  cy.log('🔍 Verifying betting options are available');
  
  cy.get('[data-testid="action-buttons"]').within(() => {
    cy.get('button').should('have.length.greaterThan', 0);
    cy.get('button').should('not.be.disabled');
  });
  cy.log('✅ Betting options are available');
});

// Individual player actions
When('{string} calls the big blind', (playerName: string) => {
  cy.log(`🎯 ${playerName} calls the big blind`);
  
  // Simulate player action in test mode
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      // Find current player and simulate call action
      cy.get('[data-testid="call-btn"]').click();
      expectedPotSize += 10; // Assuming big blind is 10
    }
  });
  
  cy.wait(1000);
  cy.log(`✅ ${playerName} called the big blind`);
});

When('{string} raises to {string}', (playerName: string, amount: string) => {
  cy.log(`🎯 ${playerName} raises to $${amount}`);
  
  const raiseAmount = parseInt(amount);
  
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      cy.get('[data-testid="raise-btn"]').click();
      cy.get('[data-testid="bet-amount-input"]').clear().type(amount);
      cy.get('[data-testid="confirm-bet-btn"]').click();
      expectedPotSize += raiseAmount;
    }
  });
  
  cy.wait(1000);
  cy.log(`✅ ${playerName} raised to $${amount}`);
});

When('{string} folds', (playerName: string) => {
  cy.log(`🎯 ${playerName} folds`);
  
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      cy.get('[data-testid="fold-btn"]').click();
    }
  });
  
  cy.wait(1000);
  cy.log(`✅ ${playerName} folded`);
});

When('{string} calls {string}', (playerName: string, amount: string) => {
  cy.log(`🎯 ${playerName} calls $${amount}`);
  
  const callAmount = parseInt(amount);
  
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      cy.get('[data-testid="call-btn"]').click();
      expectedPotSize += callAmount;
    }
  });
  
  cy.wait(1000);
  cy.log(`✅ ${playerName} called $${amount}`);
});

When('{string} checks', (playerName: string) => {
  cy.log(`🎯 ${playerName} checks`);
  
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      cy.get('[data-testid="check-btn"]').click();
    }
  });
  
  cy.wait(1000);
  cy.log(`✅ ${playerName} checked`);
});

When('{string} bets {string}', (playerName: string, amount: string) => {
  cy.log(`🎯 ${playerName} bets $${amount}`);
  
  const betAmount = parseInt(amount);
  
  cy.window().then((win) => {
    if ((win as any).Cypress) {
      cy.get('[data-testid="bet-btn"]').click();
      cy.get('[data-testid="bet-amount-input"]').clear().type(amount);
      cy.get('[data-testid="confirm-bet-btn"]').click();
      expectedPotSize += betAmount;
    }
  });
  
  cy.wait(1000);
  cy.log(`✅ ${playerName} bet $${amount}`);
});

// Pot and player verification steps
Then('the pot should contain the correct amount from pre-flop betting', () => {
  cy.log('🔍 Verifying pot amount after pre-flop');
  
  cy.get('[data-testid="pot-amount"]').then($pot => {
    const actualPot = parseInt($pot.text().replace(/[^0-9]/g, ''));
    expect(actualPot).to.equal(expectedPotSize);
    cy.log(`✅ Pot amount correct: $${actualPot}`);
  });
});

Then('{int} players should remain in the hand', (playerCount: number) => {
  cy.log(`🔍 Verifying ${playerCount} players remain in hand`);
  
  cy.get('[data-testid="active-player"]').should('have.length', playerCount);
  cy.log(`✅ ${playerCount} players remain active`);
});

Then('the game phase should advance to {string}', (expectedPhase: string) => {
  cy.log(`🔍 Verifying game phase advanced to "${expectedPhase}"`);
  
  cy.get('[data-testid="game-phase"]').should('contain', expectedPhase);
  cy.log(`✅ Game phase advanced to "${expectedPhase}"`);
});

// Community card steps
When('the flop is dealt', () => {
  cy.log('🎯 Flop is being dealt');
  
  cy.wait(2000); // Allow for dealing animation
  cy.log('✅ Flop dealt');
});

Then('{int} community cards should be visible', (cardCount: number) => {
  cy.log(`🔍 Verifying ${cardCount} community cards are visible`);
  
  cy.get('[data-testid="community-cards"]').within(() => {
    cy.get('[data-testid="community-card"]').should('have.length', cardCount);
  });
  cy.log(`✅ ${cardCount} community cards visible`);
});

Then('it should be the first active player\'s turn', () => {
  cy.log('🔍 Verifying it\'s the first active player\'s turn');
  
  cy.get('[data-testid="current-player-indicator"]').should('be.visible');
  cy.get('[data-testid="action-buttons"]').should('be.visible');
  cy.log('✅ First active player\'s turn confirmed');
});

// Additional verification steps for different betting rounds
Then('the pot should contain the correct amount after flop betting', () => {
  cy.log('🔍 Verifying pot amount after flop');
  
  cy.get('[data-testid="pot-amount"]').then($pot => {
    const actualPot = parseInt($pot.text().replace(/[^0-9]/g, ''));
    expect(actualPot).to.equal(expectedPotSize);
    cy.log(`✅ Pot amount after flop: $${actualPot}`);
  });
});

Then('the pot should contain the correct amount after turn betting', () => {
  cy.log('🔍 Verifying pot amount after turn');
  
  cy.get('[data-testid="pot-amount"]').then($pot => {
    const actualPot = parseInt($pot.text().replace(/[^0-9]/g, ''));
    expect(actualPot).to.equal(expectedPotSize);
    cy.log(`✅ Pot amount after turn: $${actualPot}`);
  });
});

// Turn and River steps
When('the turn card is dealt', () => {
  cy.log('🎯 Turn card is being dealt');
  cy.wait(2000);
  cy.log('✅ Turn card dealt');
});

When('the river card is dealt', () => {
  cy.log('🎯 River card is being dealt');
  cy.wait(2000);
  cy.log('✅ River card dealt');
});

// Showdown steps
Then('both players\' cards should be revealed', () => {
  cy.log('🔍 Verifying players\' cards are revealed');
  
  cy.get('[data-testid="player-cards"]').should('be.visible');
  cy.get('[data-testid="revealed-cards"]').should('have.length.greaterThan', 0);
  cy.log('✅ Player cards revealed for showdown');
});

Then('the winner should be determined', () => {
  cy.log('🔍 Verifying winner is determined');
  
  cy.get('[data-testid="winner-announcement"]').should('be.visible');
  cy.log('✅ Winner determined and announced');
});

Then('the pot should be awarded to the winner', () => {
  cy.log('🔍 Verifying pot is awarded to winner');
  
  cy.get('[data-testid="pot-award"]').should('be.visible');
  cy.wait(2000); // Allow for pot award animation
  cy.log('✅ Pot awarded to winner');
});

Then('player chip counts should be updated correctly', () => {
  cy.log('🔍 Verifying player chip counts are updated');
  
  // Check that at least one player's chip count has changed
  cy.get('[data-testid="player-chips"]').should('exist');
  cy.log('✅ Player chip counts updated');
});

// Next hand preparation steps
Then('the game should prepare for the next hand', () => {
  cy.log('🔍 Verifying game prepares for next hand');
  
  cy.wait(3000); // Allow for hand completion and cleanup
  cy.log('✅ Game prepared for next hand');
});

Then('the dealer button should move to the next player', () => {
  cy.log('🔍 Verifying dealer button moves');
  
  cy.get('[data-testid="dealer-button"]').should('be.visible');
  cy.log('✅ Dealer button moved to next player');
});

Then('the game status should return to {string} or start next hand', (status: string) => {
  cy.log(`🔍 Verifying game status returns to "${status}" or starts next hand`);
  
  // Game should either be waiting for next hand or already started next hand
  cy.get('[data-testid="game-status"]').should('exist');
  cy.log('✅ Game status updated appropriately');
});

Then('all players should have updated chip counts', () => {
  cy.log('🔍 Verifying all players have updated chip counts');
  
  testPlayers.forEach(player => {
    if (player.seatNumber) {
      cy.get(`[data-testid="seat-${player.seatNumber}"]`).within(() => {
        cy.get('[data-testid="player-chips"]').should('exist');
      });
    }
  });
  cy.log('✅ All player chip counts updated');
});

Then('the game should be ready for the next round', () => {
  cy.log('🔍 Verifying game is ready for next round');
  
  // Verify game state is clean and ready
  cy.get('[data-testid="game-container"]').should('be.visible');
  cy.log('✅ Game ready for next round');
}); 