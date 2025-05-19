/// <reference types="cypress" />

interface Player {
  name: string;
  buyIn: number;
  seatNumber: number;
}

describe('Multi-User Poker Game - Three Complete Games', () => {
  // Define our test players
  const players: Player[] = [
    { name: 'Player1', buyIn: 500, seatNumber: 0 },
    { name: 'Player2', buyIn: 500, seatNumber: 2 },
    { name: 'Player3', buyIn: 500, seatNumber: 4 }
  ];
  
  // Target table for testing
  const tableId = 1;
  
  // Track game progress
  let gamesPlayed = 0;
  
  beforeEach(() => {
    // Create a session for cookie persistence inside the test
    cy.session('poker_game_session', () => {
      // Visit the homepage to establish a proper session
      cy.visit('/');
    });
  });
  
  /**
   * Phase 1: All players join the table
   */
  it('All players should be able to join the table', () => {
    const [player1] = players;
    
    // First player joins through the UI
    cy.visit('/');
    cy.enterNickname(player1.name);
    cy.joinTable(tableId, player1.buyIn);
    cy.takeSeat(player1.seatNumber);
    
    // First player invites other players via automation
    players.slice(1).forEach((player) => {
      cy.task('openNewSession');
      cy.wait(3000); // Wait for session to open
    });
    
    // Wait for all players to be seated before proceeding
    cy.waitForPlayers(players.length);
    
    // Verify each player's initial chip count
    players.forEach(player => {
      cy.verifyChips(player.name, player.buyIn * 0.9, player.buyIn * 1.1);
    });
  });

  /**
   * Phase 2: Play three complete games
   */
  it('Should successfully play three complete poker games', () => {
    // Play three games in sequence
    playCompleteGame(1);
    playCompleteGame(2);
    playCompleteGame(3);
    
    // Verify games played counter
    cy.wrap(gamesPlayed).should('eq', 3);
  });
  
  /**
   * Phase 3: All players leave the table
   */
  it('All players should be able to leave the table', () => {
    // Verify each player's final chip count (should be different from initial)
    players.forEach(player => {
      cy.verifyChips(player.name, 1, player.buyIn * 2);
    });
    
    // Each player leaves the table
    cy.leaveTable();
    
    // Close all sessions
    cy.task('closeSessions');
  });
  
  /**
   * Helper function to play one complete poker game
   */
  function playCompleteGame(gameNumber: number): void {
    cy.log(`--- Starting Poker Game #${gameNumber} ---`);
    
    // Wait for game to be ready
    cy.waitForPhase('betting');
    
    // Simulate each betting round with player actions
    cy.log('Pre-flop betting round');
    simulateBettingRound();
    
    cy.log('Flop betting round');
    simulateBettingRound();
    
    cy.log('Turn betting round');
    simulateBettingRound();
    
    cy.log('River betting round');
    simulateBettingRound();
    
    // Wait for hand completion
    cy.waitForHandCompletion();
    
    // Increment games played counter
    gamesPlayed += 1;
    
    cy.log(`--- Completed Poker Game #${gameNumber} ---`);
  }

  /**
   * Helper function to simulate a betting round
   */
  function simulateBettingRound(): void {
    // Wait for betting controls to be visible
    cy.get('.betting-controls').should('be.visible');

    // Each player takes their turn
    players.forEach((player, index) => {
      // Wait for player's turn
      cy.contains(`${player.name}'s Turn`).should('be.visible');

      // Randomly choose an action
      const action = Math.random();
      if (action < 0.3) {
        // Check/Call
        cy.contains('button', 'Check').click();
      } else if (action < 0.6) {
        // Bet/Raise
        const betAmount = Math.floor(Math.random() * 100) + 10;
        cy.placeBet(betAmount);
      } else {
        // Fold
        cy.contains('button', 'Fold').click();
      }

      // Wait for action to be processed
      cy.waitForGameAction();
    });
  }
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