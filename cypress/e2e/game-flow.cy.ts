/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    joinGame(nickname: string): void;
    setPlayerStatus(status: 'away' | 'back'): void;
    openSeatMenu(): void;
    placeBet(amount: number): void;
    verifyPlayerState(nickname: string, chips: number): void;
    waitForGameStart(): void;
    verifyGamePhase(phase: string): void;
    loginPlayer(nickname: string, chips: number): void;
    joinTable(tableName: string): void;
    checkHand(): void;
    foldHand(): void;
  }
}

describe('Game Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.fixture('game-data').as('gameData');
  });

  it('should allow two players to join and play a hand', () => {
    // Login first player
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.name, player1.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Login second player in a new window
    cy.window().then((win) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        const newWindow = win.open('/');
        cy.wrap(newWindow).then((win) => {
          cy.stub(win, 'open').as('openWindow');
          cy.loginPlayer(player2.name, player2.chips);
        });
      });
    });

    // Verify both players are seated
    cy.get('[data-testid="player-list"]').should('have.length', 2);

    // Start the game
    cy.get('[data-testid="start-game-button"]').click();

    // Verify blinds are posted
    cy.get('[data-testid="pot-amount"]').should('not.equal', '0');

    // First player acts
    cy.get('[data-testid="current-player"]').should('contain', 'Player 1');
    cy.placeBet(20);

    // Second player acts
    cy.get('[data-testid="current-player"]').should('contain', 'Player 2');
    cy.placeBet(40);

    // First player calls
    cy.get('[data-testid="current-player"]').should('contain', 'Player 1');
    cy.placeBet(20);

    // Verify flop is dealt
    cy.get('[data-testid="community-cards"]').should('have.length', 3);

    // Second player checks
    cy.get('[data-testid="current-player"]').should('contain', 'Player 2');
    cy.checkHand();

    // First player bets
    cy.get('[data-testid="current-player"]').should('contain', 'Player 1');
    cy.placeBet(30);

    // Second player calls
    cy.get('[data-testid="current-player"]').should('contain', 'Player 2');
    cy.placeBet(30);

    // Verify turn is dealt
    cy.get('[data-testid="community-cards"]').should('have.length', 4);

    // Second player checks
    cy.get('[data-testid="current-player"]').should('contain', 'Player 2');
    cy.checkHand();

    // First player checks
    cy.get('[data-testid="current-player"]').should('contain', 'Player 1');
    cy.checkHand();

    // Verify river is dealt
    cy.get('[data-testid="community-cards"]').should('have.length', 5);

    // Second player bets
    cy.get('[data-testid="current-player"]').should('contain', 'Player 2');
    cy.placeBet(50);

    // First player folds
    cy.get('[data-testid="current-player"]').should('contain', 'Player 1');
    cy.foldHand();

    // Verify game results
    cy.get('[data-testid="game-result"]').should('be.visible');
    cy.get('[data-testid="winner-announcement"]').should('contain', 'Player 2');
  });

  it('should handle all-in situations correctly', () => {
    // Login first player with small stack
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.name, 50);
    });

    // Join table
    cy.joinTable('table1');

    // Login second player with large stack
    cy.window().then((win) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        const newWindow = win.open('/');
        cy.wrap(newWindow).then((win) => {
          cy.stub(win, 'open').as('openWindow');
          cy.loginPlayer(player2.name, 1000);
        });
      });
    });

    // Start the game
    cy.get('[data-testid="start-game-button"]').click();

    // First player goes all-in
    cy.get('[data-testid="current-player"]').should('contain', 'Player 1');
    cy.get('[data-testid="all-in-button"]').click();

    // Second player calls
    cy.get('[data-testid="current-player"]').should('contain', 'Player 2');
    cy.get('[data-testid="call-button"]').click();

    // Verify game continues with side pot if needed
    cy.get('[data-testid="side-pot"]').should('exist');
  });

  it('should handle disconnections gracefully', () => {
    // Login first player
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.name, player1.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Login second player
    cy.window().then((win) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        const newWindow = win.open('/');
        cy.wrap(newWindow).then((win) => {
          cy.stub(win, 'open').as('openWindow');
          cy.loginPlayer(player2.name, player2.chips);
        });
      });
    });

    // Start the game
    cy.get('[data-testid="start-game-button"]').click();

    // Simulate disconnection of second player
    cy.window().then((win) => {
      cy.stub(win, 'close').as('closeWindow');
      cy.get('@closeWindow').should('be.called');
    });

    // Verify game handles disconnection
    cy.get('[data-testid="disconnection-message"]').should('be.visible');
    cy.get('[data-testid="game-status"]').should('contain', 'paused');
  });
}); 