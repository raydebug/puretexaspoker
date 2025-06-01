describe('Game Rules', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.fixture('game-data').as('gameData');
  });

  it('should evaluate poker hands correctly', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.nickname, player.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Test royal flush
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Royal Flush');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test straight flush
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Straight Flush');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test four of a kind
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Four of a Kind');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test full house
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Full House');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test flush
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Flush');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test straight
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Straight');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test three of a kind
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Three of a Kind');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test two pair
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'Two Pair');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test one pair
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'One Pair');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);

    // Test high card
    cy.get('[data-testid="hand-evaluation"]').should('contain', 'High Card');
    cy.get('[data-testid="community-cards"]').should('have.length', 5);
    cy.get('[data-testid="player-cards"]').should('have.length', 2);
  });

  it('should handle betting rounds correctly', () => {
    // Login first player
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.nickname, player1.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Login second player
    cy.window().then((win: Window) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        const newWindow = win.open('/', '_blank');
        if (newWindow) {
          cy.wrap(newWindow).then((win) => {
            cy.loginPlayer(player2.nickname, player2.chips);
          });
        }
      });
    });

    // Start game
    cy.get('[data-testid="start-game-button"]').click();

    // Pre-flop betting
    cy.get('[data-testid="game-phase"]').should('contain', 'Pre-flop');
    cy.placeBet(20);
    cy.get('[data-testid="current-bet"]').should('contain', '20');

    // Flop betting
    cy.get('[data-testid="game-phase"]').should('contain', 'Flop');
    cy.placeBet(30);
    cy.get('[data-testid="current-bet"]').should('contain', '30');

    // Turn betting
    cy.get('[data-testid="game-phase"]').should('contain', 'Turn');
    cy.placeBet(40);
    cy.get('[data-testid="current-bet"]').should('contain', '40');

    // River betting
    cy.get('[data-testid="game-phase"]').should('contain', 'River');
    cy.placeBet(50);
    cy.get('[data-testid="current-bet"]').should('contain', '50');
  });

  it('should handle side pots correctly', () => {
    // Login first player with small stack
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.nickname, 50);
    });

    // Join table
    cy.joinTable('table1');

    // Login second player with large stack
    cy.window().then((win: Window) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        const newWindow = win.open('/', '_blank');
        if (newWindow) {
          cy.wrap(newWindow).then((win) => {
            cy.loginPlayer(player2.nickname, 1000);
          });
        }
      });
    });

    // Start game
    cy.get('[data-testid="start-game-button"]').click();

    // First player goes all-in
    cy.get('[data-testid="all-in-button"]').click();

    // Second player calls
    cy.get('[data-testid="call-button"]').click();

    // Verify side pot creation
    cy.get('[data-testid="side-pot"]').should('be.visible');
    cy.get('[data-testid="main-pot"]').should('be.visible');
  });

  it('should handle split pots correctly', () => {
    // Login first player
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.nickname, player1.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Login second player
    cy.window().then((win: Window) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        const newWindow = win.open('/', '_blank');
        if (newWindow) {
          cy.wrap(newWindow).then((win) => {
            cy.loginPlayer(player2.nickname, player2.chips);
          });
        }
      });
    });

    // Start game
    cy.get('[data-testid="start-game-button"]').click();

    // Both players check to showdown
    cy.checkHand();
    cy.checkHand();

    // Verify split pot
    cy.get('[data-testid="split-pot"]').should('be.visible');
    cy.get('[data-testid="winner-announcement"]').should('contain', 'Split Pot');
  });
}); 