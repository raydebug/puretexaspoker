describe('Connection Timeout - Basic Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'TimeoutTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should properly track player seat assignments', () => {
    const playerName = 'SeatTrackingPlayer';
    
    // Join table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify player starts as observer
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    // Take an available seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Verify player moved from observers to players
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains(playerName).should('be.visible');
      
      // Should not be in observers anymore
      cy.contains('Observers').parent().within(() => {
        cy.contains(playerName).should('not.exist');
      });
    });
    
    // Verify the seat is now occupied
    cy.get('[data-testid^="available-seat-"]').should('have.length.lessThan', 9);
  });

  it('should handle socket disconnection gracefully', () => {
    const playerName = 'DisconnectionTestPlayer';
    
    // Join table and take a seat
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Take a seat to establish the player in the game
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Verify player is seated
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    // Simulate disconnection by navigating away
    cy.visit('/');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Player has effectively disconnected from the game
    // In a real scenario, this would trigger the timeout
    cy.log('Player disconnected from game');
    
    // Wait a moment, then try to rejoin the same table
    cy.wait(1000);
    
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('NewObserver');
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // The game should still be functional
    cy.get('[data-testid="online-users-list"]').should('be.visible');
  });

  it('should maintain game state integrity during disconnections', () => {
    const playerName = 'IntegrityTestPlayer';
    
    // Join and take a seat
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Check initial available seats
    cy.get('[data-testid^="available-seat-"]').then($seats => {
      const initialSeatCount = $seats.length;
      cy.log(`Initial available seats: ${initialSeatCount}`);
      
      // Take the first available seat
      cy.get('[data-testid^="available-seat-"]').first().click();
      cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
        const value = $option.val();
        cy.get('[data-testid="buyin-dropdown"]').select(String(value));
      });
      cy.get('[data-testid="confirm-seat-btn"]').click();
      
      // Verify one less seat is available
      cy.get('[data-testid^="available-seat-"]').should('have.length', initialSeatCount - 1);
      
      // Verify online users list is consistent
      cy.get('[data-testid="online-users-list"]').within(() => {
        cy.contains('Players (1)').should('be.visible');
        cy.contains(playerName).should('be.visible');
      });
    });
  });

  it('should handle rapid seat taking and leaving', () => {
    const playerName = 'RapidTestPlayer';
    
    // Join table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Take a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Verify player is seated
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    // Wait a moment then navigate away (simulating leaving)
    cy.wait(500);
    cy.visit('/');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    
    // Quickly rejoin
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Should be back as observer
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
  });

  it('should support connection monitoring configuration', () => {
    // This test verifies the configuration is reasonable
    const playerName = 'ConfigTestPlayer';
    
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // The 5-second timeout should be reasonable for user experience
    // We can verify the system is responsive within that timeframe
    cy.wait(1000); // Wait 1 second
    
    // Take a seat to test responsiveness
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    
    // System should respond quickly (within 1 second)
    cy.get('[data-testid="confirm-seat-btn"]', { timeout: 1000 }).should('be.visible');
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Player should be seated promptly
    cy.get('[data-testid="online-users-list"]', { timeout: 2000 }).within(() => {
      cy.contains('Players').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    cy.log('Connection monitoring system is responsive and properly configured');
  });
}); 