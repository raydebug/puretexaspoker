/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    waitForHandCompletion(): void;
  }
}

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
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Verify player is seated
    cy.get('.player-seat').should('exist');
    cy.contains('TestPlayer').should('be.visible');
    
    // Leave the table
    cy.get('.player-seat').first().click();
    cy.contains('Leave Table').click();
    
    // Verify player has left and is back in the lobby
    cy.url().should('include', 'lobby');
  });

  it('allows player to stand up and rejoin', () => {
    // Join game
    cy.joinGame('StandupTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Verify player is seated
    cy.get('.player-seat').should('exist');
    cy.contains('StandupTest').should('be.visible');
    
    // Stand up from seat
    cy.get('.player-seat').first().click();
    cy.contains('Stand Up').click();
    
    // Verify player is in observer list
    cy.get('.online-list').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('StandupTest').should('be.visible');
    });
    
    // Take a seat again
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Verify player is seated again
    cy.get('.player-seat').should('exist');
    cy.contains('StandupTest').should('be.visible');
  });

  it('allows player to toggle away status', () => {
    // Join game
    cy.joinGame('AwayStatusTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Set status to away
    cy.setPlayerStatus('away');
    
    // Verify away status
    cy.get('.status-icon').should('be.visible');
    
    // Set status back to present
    cy.setPlayerStatus('back');
    
    // Verify away status is removed
    cy.get('.status-icon').should('not.exist');
  });

  it('shows correct player count in online users list', () => {
    // Join game
    cy.joinGame('PlayerCountTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Verify player count in online list
    cy.get('.online-list').within(() => {
      cy.contains('Players').should('be.visible');
      cy.get('.players-list .player-item').should('have.length.at.least', 1);
    });
  });

  it('shows player as highlighted in the online users list', () => {
    // Join game
    cy.joinGame('HighlightTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Verify player is highlighted in online list
    cy.get('.online-list').within(() => {
      cy.contains('HighlightTest')
        .parent()
        .should('have.css', 'background-color', 'rgba(76, 175, 80, 0.2)')
        .and('have.css', 'color', 'rgb(255, 215, 0)');
    });
  });

  it('allows player to send and receive chat messages', () => {
    // Join game
    cy.joinGame('ChatTest');
    
    // Send a chat message
    const testMessage = 'Hello from ChatTest!';
    cy.get('.chat-input').type(testMessage);
    cy.get('button').contains('Send').click();
    
    // Verify message is visible
    cy.contains(testMessage).should('be.visible');
  });

  it('displays when a player makes a game action', () => {
    // Join game
    const playerName = 'ActionTest';
    cy.joinGame(playerName);
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Wait for game to start and player's turn
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    
    // Player performs a check action
    cy.contains('button', 'Check').click();
    
    // Verify action is displayed in the game log
    cy.contains(`${playerName} checks`).should('be.visible');
  });

  it('shows dealer button moving correctly between hands', () => {
    // Join game with multiple players (requires server simulation)
    cy.joinGame('DealerTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Record dealer button position
    let initialDealerPosition;
    cy.get('.dealer-button')
      .invoke('attr', 'data-position')
      .then(position => {
        initialDealerPosition = position;
      });
    
    // Play through a hand
    cy.contains('button', 'Check').click();
    
    // Wait for hand to complete
    cy.get('[data-hand-complete="true"]', { timeout: 30000 }).should('be.visible');
    
    // Verify dealer button has moved
    cy.get('.dealer-button')
      .invoke('attr', 'data-position')
      .then(newPosition => {
        expect(newPosition).not.to.equal(initialDealerPosition);
      });
  });
}); 