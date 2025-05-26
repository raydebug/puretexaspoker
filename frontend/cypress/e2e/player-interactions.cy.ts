/// <reference types="cypress" />

describe('Player Interactions', () => {
  beforeEach(() => {
    // Visit the site before each test
    cy.visit('/');
  });

  it('allows player to join and leave table', () => {
    // Join game
    cy.joinGame('TestPlayer');
    
    // Verify player joined successfully
    cy.contains('TestPlayer').should('be.visible');
    
    // Find and take a seat
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Verify player is seated
    cy.get('[data-testid="player-seat"]').should('exist');
    cy.contains('TestPlayer').should('be.visible');
    
    // Leave the table
    cy.get('[data-testid="player-seat"]').first().click();
    cy.get('[data-testid="leave-table-button"]').click();
    
    // Verify player has left and is back in the lobby
    cy.url().should('include', 'lobby');
  });

  it('allows player to stand up and rejoin', () => {
    // Join game
    cy.joinGame('StandupTest');
    
    // Find and take a seat
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Verify player is seated
    cy.get('[data-testid="player-seat"]').should('exist');
    cy.contains('StandupTest').should('be.visible');
    
    // Stand up from seat
    cy.get('[data-testid="player-seat"]').first().click();
    cy.get('[data-testid="stand-up-button"]').click();
    
    // Verify player is in observer list
    cy.get('[data-testid="online-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('StandupTest').should('be.visible');
    });
    
    // Take a seat again
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Verify player is seated again
    cy.get('[data-testid="player-seat"]').should('exist');
    cy.contains('StandupTest').should('be.visible');
  });

  it('allows player to toggle away status', () => {
    // Join game
    cy.joinGame('AwayStatusTest');
    
    // Find and take a seat
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Set status to away
    cy.setPlayerStatus('away');
    
    // Verify away status
    cy.get('[data-testid="status-icon"]').should('be.visible');
    
    // Set status back to present
    cy.setPlayerStatus('back');
    
    // Verify away status is removed
    cy.get('[data-testid="status-icon"]').should('not.exist');
  });

  it('shows correct player count in online users list', () => {
    // Join game
    cy.joinGame('PlayerCountTest');
    
    // Find and take a seat
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Verify player count in online list
    cy.get('[data-testid="online-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.get('[data-testid="player-item"]').should('have.length.at.least', 1);
    });
  });

  it('shows player as highlighted in the online users list', () => {
    // Join game
    cy.joinGame('HighlightTest');
    
    // Find and take a seat
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Verify player is highlighted in online list
    cy.get('[data-testid="online-list"]').within(() => {
      cy.contains('HighlightTest')
        .parent()
        .should('have.class', 'highlighted');
    });
  });

  it('allows player to send and receive chat messages', () => {
    // Join game
    cy.joinGame('ChatTest');
    
    // Send a chat message
    const testMessage = 'Hello from ChatTest!';
    cy.get('[data-testid="chat-input"]').type(testMessage);
    cy.get('[data-testid="send-message-button"]').click();
    
    // Verify message is visible
    cy.contains(testMessage).should('be.visible');
  });

  it('displays when a player makes a game action', () => {
    // Join game
    const playerName = 'ActionTest';
    cy.joinGame(playerName);
    
    // Find and take a seat
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Wait for game to start and player's turn
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    
    // Player performs a check action
    cy.get('[data-testid="check-button"]').click();
    
    // Verify action is displayed in the game log
    cy.get('[data-testid="game-log"]').contains(`${playerName} checks`).should('be.visible');
  });

  it('shows dealer button moving correctly between hands', () => {
    // Join game with multiple players (requires server simulation)
    cy.joinGame('DealerTest');
    
    // Find and take a seat
    cy.get('[data-testid="seat-0"]').click();
    cy.get('[data-testid="take-seat-button"]').click();
    
    // Record dealer button position and verify it changes after a hand
    cy.get('[data-testid="dealer-button"]')
      .invoke('attr', 'data-position')
      .then(initialPosition => {
        // Play through a hand
        cy.get('[data-testid="check-button"]').click();
        
        // Wait for hand to complete
        cy.get('[data-testid="hand-complete"]', { timeout: 30000 }).should('be.visible');
        
        // Verify dealer button has moved
        cy.get('[data-testid="dealer-button"]')
          .invoke('attr', 'data-position')
          .should('not.eq', initialPosition);
      });
  });
}); 