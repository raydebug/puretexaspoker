/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    joinGame(nickname: string): void;
    setPlayerStatus(status: 'away' | 'back'): void;
    openSeatMenu(): void;
    placeBet(amount: number): void;
  }
}

describe('Poker Game Flow', () => {
  beforeEach(() => {
    // Create a session for cookie persistence
    cy.session('poker_flow_session', () => {
      cy.visit('/');
    });
    
    cy.visit('/');
  });

  it('allows a player to join the game and interact with the table', () => {
    // Join game using custom command
    cy.joinGame('TestPlayer');

    // Verify player is in the game
    cy.get('.player-seat').should('exist');
    cy.contains('TestPlayer').should('be.visible');
    cy.contains('Chips: 1000').should('be.visible');

    // Test seat menu interactions using custom commands
    cy.openSeatMenu();
    cy.contains('Leave Midway').should('be.visible');
    cy.contains('Stand Up').should('be.visible');
    cy.contains('Leave Table').should('be.visible');

    // Test going away and coming back using custom command
    cy.setPlayerStatus('away');
    cy.get('.status-icon').should('be.visible');
    cy.setPlayerStatus('back');
    cy.get('.status-icon').should('not.exist');
  });

  it('shows current player in the players list when taking a seat', () => {
    // Join game using custom command
    cy.joinGame('TestPlayer');

    // Verify online users list is not visible before joining
    cy.get('.online-list').should('not.exist');

    // Take a seat
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Verify player appears in observers list first
    cy.get('.online-list').should('be.visible').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.get('.observers-list').should('contain', 'TestPlayer');
    });

    // Verify player appears in the players list after seat is accepted
    cy.get('.online-list').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains('TestPlayer').should('be.visible');
      cy.contains('(You)').should('be.visible');
    });

    // Verify player is highlighted
    cy.contains('TestPlayer')
      .parent()
      .should('have.css', 'background-color', 'rgba(76, 175, 80, 0.2)')
      .and('have.css', 'color', 'rgb(255, 215, 0)');

    // Verify clicking on own seat shows menu
    cy.get('.player-seat').contains('TestPlayer').click();
    cy.contains('Leave Midway').should('be.visible');
    cy.contains('Stand Up').should('be.visible');
    cy.contains('Leave Table').should('be.visible');
  });

  it('shows correct online users list with status changes', () => {
    // Join game using custom command
    cy.joinGame('Player1');

    // Verify online users list is not visible before joining
    cy.get('.online-list').should('not.exist');

    // Take a seat
    cy.get('.seat-button').first().click();
    cy.contains('Yes').click();

    // Verify online users list
    cy.get('.online-list').should('be.visible').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains('Player1').should('be.visible');
      cy.contains('(You)').should('be.visible');
      cy.contains('Observers').should('be.visible');
    });

    // Test away status
    cy.setPlayerStatus('away');
    cy.get('.online-list').within(() => {
      cy.contains('(Away)').should('be.visible');
      cy.contains('Player1')
        .parent()
        .should('have.css', 'opacity', '0.6');
    });

    // Test coming back
    cy.setPlayerStatus('back');
    cy.get('.online-list').within(() => {
      cy.contains('(Away)').should('not.exist');
      cy.contains('Player1')
        .parent()
        .should('have.css', 'opacity', '1');
    });

    // Test observer status
    cy.openSeatMenu();
    cy.contains('Stand Up').click();
    cy.get('.online-list').within(() => {
      cy.contains('Players').should('be.visible');
      cy.get('.observers-list').should('contain', 'Player1');
      cy.contains('(You)').should('not.exist');
    });

    // Test leaving table
    cy.openSeatMenu();
    cy.contains('Leave Table').click();
    cy.get('.online-list').should('not.exist');
  });

  it('handles betting actions correctly', () => {
    cy.joinGame('BettingPlayer');

    // Wait for game to start
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');

    // Test betting actions
    cy.get('.betting-controls').within(() => {
      // Check
      cy.contains('Check').should('be.visible').click();
      
      // Bet using custom command
      cy.placeBet(100);
      cy.contains('Chips: 900').should('be.visible');

      // Fold
      cy.contains('Fold').should('be.visible').click();
    });
  });

  it('persists player session after page reload', () => {
    cy.joinGame('PersistentPlayer');

    // Verify initial state
    cy.contains('PersistentPlayer').should('be.visible');
    cy.contains('Chips: 1000').should('be.visible');

    // Reload page
    cy.reload();

    // Verify state is persisted
    cy.contains('PersistentPlayer').should('be.visible');
    cy.contains('Chips: 1000').should('be.visible');
    cy.get('.player-seat').should('exist');
  });

  it('handles multiple players in the game', () => {
    cy.joinGame('Player1');

    // Verify game state updates with multiple players
    cy.get('.player-seat').should('have.length.at.least', 1);
    cy.get('.dealer-button').should('be.visible');
    cy.get('.pot').should('be.visible');
  });

  it('displays game phases correctly', () => {
    cy.joinGame('PhasePlayer');

    // Verify game phase displays
    cy.get('.game-status').within(() => {
      // Game should start at preflop
      cy.contains('Pre-flop').should('be.visible');
      
      // Note: In real game, these would progress naturally
      // Here we're just verifying the UI can display them
      cy.contains('Pot:').should('be.visible');
      cy.contains('Current Bet:').should('be.visible');
    });
  });
}); 