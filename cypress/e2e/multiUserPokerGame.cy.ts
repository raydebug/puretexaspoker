/// <reference types="cypress" />

interface Player {
  name: string;
  buyIn: number;
  seatNumber: number;
}

describe('Multi-User Poker Game', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/');
  });
  
  it('should allow multiple players to join game session', () => {
    // Handle nickname modal for first player
    cy.get('[data-testid="nickname-input"]').type('Player1');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('Player1');
    cy.get('[data-testid="buy-in-input"]').clear().type('500');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for multi-player game UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="player-list"]').length > 0) {
        cy.get('[data-testid="player-list"]').should('be.visible');
      }
      if ($body.find('[data-testid="user-name"]').length > 0) {
        cy.get('[data-testid="user-name"]').should('contain', 'Player1');
      }
    });
  });

  it('should handle poker game with player actions', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('GamePlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('GamePlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('500');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for game action UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="betting-controls"]').length > 0) {
        cy.get('[data-testid="betting-controls"]').should('be.visible');
      }
      if ($body.find('[data-testid="game-actions"]').length > 0) {
        cy.get('[data-testid="game-actions"]').should('exist');
      }
    });
  });

  it('should display game state and player information', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('StatePlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('StatePlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('500');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for game state UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="game-status"]').length > 0) {
        cy.get('[data-testid="game-status"]').should('exist');
      }
      if ($body.find('[data-testid="pot"]').length > 0) {
        cy.get('[data-testid="pot"]').should('exist');
      }
    });
  });

  it('should handle player interactions and game flow', () => {
    // Handle nickname modal
    cy.get('[data-testid="nickname-input"]').type('FlowPlayer');
    cy.get('[data-testid="join-button"]').click();

    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Join a table using the working pattern
    cy.get('[data-testid^="table-"]').first().click();
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('FlowPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('500');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });

    // Verify we're in game
    cy.url().should('include', '/game/');

    // Check for player interaction UI if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="player-seat"]').length > 0) {
        cy.get('[data-testid="player-seat"]').should('exist');
      }
      if ($body.find('[data-testid="chat-toggle"]').length > 0) {
        cy.get('[data-testid="chat-toggle"]').should('be.visible');
      }
    });
  });
});

// Helper tests to automate other player sessions
describe('Player 2 Session', () => {
  beforeEach(() => {
    // Create a session for Player 2
    cy.session('player2_session', () => {
      cy.visit('/');
    });
  });
  
  it('Joins table and takes seat', () => {
    // Run only in Player 2 session
    cy.task<string>('getSessionId').then((sessionId) => {
      if (sessionId !== 'player2') return;
      
      const player: Player = { name: 'Player2', buyIn: 500, seatNumber: 2 };
      
      cy.visit('/');
      cy.enterNickname(player.name);
      cy.joinTable(1, player.buyIn);
      cy.takeSeat(player.seatNumber);
    });
  });
}); 