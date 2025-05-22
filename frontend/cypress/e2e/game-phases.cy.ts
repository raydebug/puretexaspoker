/// <reference types="cypress" />

describe('Game Phase Transitions', () => {
  beforeEach(() => {
    // Visit the site before each test
    cy.visit('/');
  });

  it('should correctly transition through all game phases', () => {
    // Join game
    cy.joinGame('PhaseTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Wait for game to start - should begin with pre-flop
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Pre-flop');

    // Check that dealer button and blinds are visible
    cy.get('.dealer-button').should('be.visible');
    cy.contains('Small Blind').should('be.visible');
    cy.contains('Big Blind').should('be.visible');
    
    // Wait for my turn and make an action to move to next phase
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Check').click();
    
    // Verify flop phase
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Flop');
    cy.get('.community-cards .card').should('have.length', 3);
    
    // Wait for my turn and make an action to move to next phase
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Check').click();
    
    // Verify turn phase
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Turn');
    cy.get('.community-cards .card').should('have.length', 4);
    
    // Wait for my turn and make an action to move to next phase
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Check').click();
    
    // Verify river phase
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'River');
    cy.get('.community-cards .card').should('have.length', 5);
    
    // Wait for my turn and make an action to move to showdown
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Check').click();
    
    // Verify showdown phase
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Showdown');
    
    // Wait for next hand to start
    cy.get('.game-status', { timeout: 15000 }).should('contain', 'Pre-flop');
  });

  it('should display pot correctly during each phase', () => {
    // Join game
    cy.joinGame('PotTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Wait for game to start
    cy.get('.game-status', { timeout: 10000 }).should('be.visible');
    
    // Track pot amounts through phases
    cy.get('.pot').invoke('text').then(text => {
      const preflopPot = parseInt(text.replace(/[^0-9]/g, ''));
      expect(preflopPot).to.be.greaterThan(0); // Should include blinds
      
      // Make a bet to increase pot
      cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
      cy.placeBet(50);
      
      // Check pot increased in flop phase
      cy.get('.game-status', { timeout: 10000 }).should('contain', 'Flop');
      cy.get('.pot').invoke('text').then(text => {
        const flopPot = parseInt(text.replace(/[^0-9]/g, ''));
        expect(flopPot).to.be.greaterThan(preflopPot);
      });
    });
  });

  it('should highlight current player during their turn', () => {
    // Join game
    cy.joinGame('TurnTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Wait for game to start
    cy.get('.game-status', { timeout: 10000 }).should('be.visible');
    
    // Verify player is highlighted during their turn
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.get('.player-seat.active').should('exist');
    
    // Make an action
    cy.contains('button', 'Check').click();
    
    // Verify player is no longer highlighted
    cy.get('.player-seat.active').should('not.exist');
  });

  it('should handle betting rounds correctly', () => {
    // Join game
    cy.joinGame('BettingTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Wait for game to start
    cy.get('.game-status', { timeout: 10000 }).should('be.visible');
    
    // Place a bet during pre-flop
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.placeBet(50);
    
    // Verify bet amount is shown
    cy.get('.player-bet').should('contain', '50');
    
    // Wait for flop phase
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Flop');
    
    // Verify bet amounts are cleared for new betting round
    cy.get('.player-bet').should('not.exist');
  });
  
  it('should display correct community cards in each phase', () => {
    // Join game
    cy.joinGame('CardsTest');
    
    // Find and take a seat
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Wait for game to start - pre-flop should have no community cards
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Pre-flop');
    cy.get('.community-cards .card').should('have.length', 0);
    
    // Make an action to move to flop
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Check').click();
    
    // Verify flop has 3 community cards
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Flop');
    cy.get('.community-cards .card').should('have.length', 3);
    
    // Make an action to move to turn
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Check').click();
    
    // Verify turn has 4 community cards
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'Turn');
    cy.get('.community-cards .card').should('have.length', 4);
    
    // Make an action to move to river
    cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Check').click();
    
    // Verify river has 5 community cards
    cy.get('.game-status', { timeout: 10000 }).should('contain', 'River');
    cy.get('.community-cards .card').should('have.length', 5);
  });
}); 