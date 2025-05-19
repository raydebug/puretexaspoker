/**
 * End-to-End Test for Texas Hold'em Poker Game Mechanics
 * 
 * Tests key game mechanics including:
 * - Proper betting rounds
 * - Card dealing
 * - Game phase transitions
 * - Pot calculation
 * - Hand evaluation and winning conditions
 */

describe('Poker Game Mechanics Verification', () => {
  // Test player configurations
  const player1 = { name: 'Tester1', buyIn: 1000, seatNumber: 0 };
  const player2 = { name: 'Tester2', buyIn: 1000, seatNumber: 2 };
  const player3 = { name: 'Tester3', buyIn: 1000, seatNumber: 4 };
  
  // Target table ID
  const tableId = 2;
  
  // Track game stages
  const gameStages = ['pre-flop', 'flop', 'turn', 'river', 'showdown'];
  
  // Card and hand details for verification
  let dealtCards = [];
  let communityCards = [];
  let playerHands = {};
  let currentPot = 0;

  beforeEach(() => {
    // Create a session for cookie persistence within each test
    cy.session('poker_mechanics_session', () => {
      cy.visit('/');
    });
  });

  /**
   * Setup: Join table with all players
   */
  it('Sets up a controlled poker game with test players', () => {
    // Verify servers are running
    cy.request({
      url: 'http://localhost:3001',
      failOnStatusCode: false
    }).then(response => {
      expect(response.status).to.be.oneOf([200, 404]);
    });
      
    cy.request('http://localhost:3000')
      .then(response => {
        expect(response.status).to.eq(200);
      });
      
    // First player joins
    cy.visit('/');
    cy.enterNickname(player1.name);
    cy.joinTable(tableId, player1.buyIn);
    cy.takeSeat(player1.seatNumber);
    
    // Automate adding other players
    cy.task('openNewSession');
    cy.wait(3000);
    
    cy.task('openNewSession');
    cy.wait(3000);
    
    // Wait for all players to be seated
    cy.waitForPlayers(3);
    
    // Verify initial game state
    cy.get('[data-game-phase="waiting"]').should('be.visible');
    cy.get('[data-pot-amount]').should('contain', '0');
    
    // Store initial pot amount
    cy.get('[data-pot-amount]')
      .invoke('text')
      .then(text => {
        currentPot = parseInt(text.replace(/[^0-9]/g, ''));
      });
  });

  /**
   * Test 1: Game Phase Transitions
   */
  it('Should progress through all poker game phases in order', () => {
    // Start tracking phases
    let completedPhases = [];
    
    // Listen for phase changes
    cy.get('[data-game-phase]').as('gamePhase');
    
    // Wait for game to start
    cy.get('@gamePhase', { timeout: 30000 })
      .should('have.attr', 'data-game-phase')
      .and('not.eq', 'waiting');
    
    // Record each phase as it occurs
    gameStages.forEach(stage => {
      cy.get('@gamePhase', { timeout: 60000 })
        .should('have.attr', 'data-game-phase', stage)
        .then(() => {
          completedPhases.push(stage);
          cy.log(`Reached game phase: ${stage}`);
        });
    });
    
    // Verify phases happened in correct order
    cy.wrap(completedPhases).should('deep.equal', gameStages);
  });

  /**
   * Test 2: Card Dealing and Visibility
   */
  it('Should deal correct number of cards to players and community', () => {
    // Wait for hand to start
    cy.waitForPhase('pre-flop');
    
    // Verify each player received exactly 2 hole cards
    cy.get('[data-player-cards]').should('have.length', 3);
    cy.get('[data-player-card]').should('have.length', 6);
    
    // Verify player can only see their own cards
    cy.get('[data-player-name="Tester1"]')
      .find('[data-player-card]')
      .should('have.attr', 'data-card-visible', 'true')
      .and('have.length', 2);
    
    // Other players' cards should be hidden
    cy.get('[data-player-name="Tester2"]')
      .find('[data-player-card]')
      .should('have.attr', 'data-card-visible', 'false');
    
    // Track community cards throughout the game
    cy.waitForPhase('flop');
    cy.get('[data-community-card]').should('have.length', 3);
    
    cy.waitForPhase('turn');
    cy.get('[data-community-card]').should('have.length', 4);
    
    cy.waitForPhase('river');
    cy.get('[data-community-card]').should('have.length', 5);
    
    // Store final community cards for verification
    cy.get('[data-community-card]').each(($card) => {
      const cardValue = $card.attr('data-card-value');
      communityCards.push(cardValue);
    });
  });

  /**
   * Test 3: Betting Rounds and Pot Calculation
   */
  it('Should calculate pot correctly after each betting round', () => {
    // Start new hand
    cy.waitForPhase('pre-flop');
    let startingPot = 0;
    
    // Record pot at the beginning
    cy.get('[data-pot-amount]')
      .invoke('text')
      .then(text => {
        startingPot = parseInt(text.replace(/[^0-9]/g, ''));
        expect(startingPot).to.be.greaterThan(0); // Should include blinds
      });
    
    // Track bets and pot for each round
    let totalBets = 0;
    
    const trackBettingRound = (round) => {
      cy.waitForPhase(round);
      cy.log(`Betting round: ${round}`);
      
      // Each player makes a bet
      let roundBets = 0;
      
      // Verify our turn comes and we can make a bet
      cy.waitForTurn();
      
      // Make a specific bet for tracking
      const betAmount = 25;
      cy.bet(betAmount);
      roundBets += betAmount;
      
      // Record other players' bets by watching the pot
      cy.get('[data-pot-amount]')
        .invoke('text')
        .then(text => {
          const newPot = parseInt(text.replace(/[^0-9]/g, ''));
          const potIncrease = newPot - startingPot - roundBets;
          totalBets += roundBets + potIncrease;
          cy.log(`Round total bets: ${roundBets + potIncrease}`);
        });
    };
    
    // Track betting for each round
    trackBettingRound('flop');
    trackBettingRound('turn');
    trackBettingRound('river');
    
    // Verify final pot matches the total bets
    cy.get('[data-pot-amount]')
      .invoke('text')
      .then(text => {
        const finalPot = parseInt(text.replace(/[^0-9]/g, ''));
        expect(finalPot).to.equal(startingPot + totalBets);
      });
  });

  /**
   * Test 4: Showdown and Winner Determination
   */
  it('Should correctly identify winner and award pot', () => {
    // Wait for showdown
    cy.waitForPhase('showdown');
    
    // Record the pot amount before winner is determined
    let finalPot = 0;
    cy.get('[data-pot-amount]')
      .invoke('text')
      .then(text => {
        finalPot = parseInt(text.replace(/[^0-9]/g, ''));
        expect(finalPot).to.be.greaterThan(0);
      });
    
    // Record each player's chips before pot award
    let chipsBefore = {};
    cy.get('[data-player-name]').each(($player) => {
      const playerName = $player.attr('data-player-name');
      cy.get(`[data-player-name="${playerName}"]`)
        .find('[data-player-chips]')
        .invoke('text')
        .then(text => {
          chipsBefore[playerName] = parseInt(text.replace(/[^0-9]/g, ''));
        });
    });
    
    // Wait for winner to be announced
    cy.get('[data-hand-winner]', { timeout: 10000 }).should('be.visible');
    
    // Get winner name
    let winnerName = '';
    cy.get('[data-hand-winner]')
      .invoke('text')
      .then(text => {
        // Extract winner name from text like "Player1 wins with Two Pair"
        winnerName = text.split(' ')[0];
        cy.log(`Winner is: ${winnerName}`);
      });
    
    // Verify winner received pot
    cy.waitForGameAction();
    cy.get(`[data-player-name="${winnerName}"]`)
      .find('[data-player-chips]')
      .invoke('text')
      .then(text => {
        const chipsAfter = parseInt(text.replace(/[^0-9]/g, ''));
        const expectedChips = chipsBefore[winnerName] + finalPot;
        
        // Allow for pot splitting and small variations
        expect(chipsAfter).to.be.closeTo(expectedChips, finalPot * 0.1);
      });
  });

  /**
   * Cleanup: Leave table and close sessions
   */
  it('Cleans up all test player sessions', () => {
    // Each player leaves
    cy.leaveTable();
    
    // Close all sessions
    cy.task('closeSessions');
  });
}); 