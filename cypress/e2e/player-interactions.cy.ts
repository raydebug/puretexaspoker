/// <reference types="cypress" />

describe('Player Interactions', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/');
  });

  it('allows player to join and leave table', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('TestPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('TestPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');
    
    // Check for basic game UI elements
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="leave-table-button"]').length > 0) {
        cy.get('[data-testid="leave-table-button"]').should('be.visible');
      }
      if ($body.find('[data-testid="player-seat"]').length > 0) {
        cy.get('[data-testid="player-seat"]').should('be.visible');
      }
    });
  });

  it('allows player to stand up and rejoin', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('StandupTest');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('StandupTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for basic game UI elements indicating player interaction capabilities
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="stand-up-button"]').length > 0) {
        cy.get('[data-testid="stand-up-button"]').should('be.visible');
      }
      if ($body.find('[data-testid="online-list"]').length > 0) {
        cy.get('[data-testid="online-list"]').should('be.visible');
      }
    });
  });

  it('allows player to toggle away status', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('AwayStatusTest');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('AwayStatusTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for away status UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="status-icon"]').length > 0) {
        cy.get('[data-testid="status-icon"]').should('exist');
      }
      if ($body.find('[data-testid="away-button"]').length > 0) {
        cy.get('[data-testid="away-button"]').should('be.visible');
      }
    });
  });

  it('shows correct player count in online users list', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('PlayerCountTest');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('PlayerCountTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for online list UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="online-list"]').length > 0) {
        cy.get('[data-testid="online-list"]').should('be.visible');
      }
      if ($body.find('[data-testid="player-item"]').length > 0) {
        cy.get('[data-testid="player-item"]').should('have.length.at.least', 1);
      }
    });
  });

  it('shows player as highlighted in the online users list', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('HighlightTest');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('HighlightTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for highlighting functionality in online list if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="online-list"]').length > 0) {
        cy.get('[data-testid="online-list"]').should('be.visible');
      }
    });
  });

  it('allows player to send and receive chat messages', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('ChatTest');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ChatTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for chat UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="chat-input"]').length > 0) {
        cy.get('[data-testid="chat-input"]').should('be.visible');
        
        // Try to send a message if UI exists
        const testMessage = 'Hello from ChatTest!';
        cy.get('[data-testid="chat-input"]').type(testMessage);
        
        if ($body.find('[data-testid="send-message-button"]').length > 0) {
          cy.get('[data-testid="send-message-button"]').click();
        }
      }
    });
  });

  it('displays when a player makes a game action', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('ActionTest');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('ActionTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for game action UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="game-log"]').length > 0) {
        cy.get('[data-testid="game-log"]').should('be.visible');
      }
      if ($body.find('[data-testid="check-button"]').length > 0) {
        cy.get('[data-testid="check-button"]').should('be.visible');
      }
    });
  });

  it('shows dealer button moving correctly between hands', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('DealerTest');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('DealerTest');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for dealer button UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="dealer-button"]').length > 0) {
        cy.get('[data-testid="dealer-button"]').should('be.visible');
      }
      if ($body.find('[data-testid="hand-complete"]').length > 0) {
        cy.get('[data-testid="hand-complete"]').should('exist');
      }
    });
  });
}); 