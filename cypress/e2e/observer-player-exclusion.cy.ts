describe('Observer-Player State Exclusion', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Set a test nickname
    cy.setCookie('playerNickname', 'ExclusionTestPlayer');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should ensure users cannot be both observers and players simultaneously', () => {
    // Join a table as observer
    cy.get('[data-testid="table-row"]:first').should('be.visible').click();
    
    // Fill nickname and join as observer
    cy.get('[data-testid="nickname-input"]').clear().type('ExclusionTest');
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Verify user is in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Check that user is in observers list
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'ExclusionTest');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Observers');
    
    // Take a seat
    cy.get('[data-testid^="available-seat-"]').first().should('be.visible').click();
    
    // Select buy-in and confirm
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
      cy.get('[data-testid="confirm-seat-btn"]').click();
    });
    
    // Wait for seat to be taken
    cy.wait(2000);
    
    // Verify user is no longer in observer view (should be in player view)
    cy.get('[data-testid="observer-view"]').should('not.exist');
    
    // Verify user is now in players list and NOT in observers list
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Players');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'ExclusionTest');
    
    // Critical check: User should NOT appear in observers section
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Check that the observers section shows (0) or "No observers"
      cy.contains('Observers').parent().should(($section) => {
        const text = $section.text();
        expect(text).to.satisfy((text: string) => 
          text.includes('(0)') || text.includes('No observers')
        );
      });
    });
    
    // Verify that ExclusionTest only appears under Players, not Observers
    cy.get('[data-testid="online-users-list"]').then(($list) => {
      const text = $list.text();
      const exclusionTestMatches = (text.match(/ExclusionTest/g) || []).length;
      expect(exclusionTestMatches).to.equal(1, 'User should only appear once in the online list (as player, not observer)');
    });
  });

  it('should properly handle multiple users with observer-player state transitions', () => {
    // First user joins as observer
    cy.get('[data-testid="table-row"]:first').click();
    cy.get('[data-testid="nickname-input"]').clear().type('Observer1');
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Verify in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Simulate second user (different browser session would be ideal, but we'll use one session)
    cy.go('back');
    cy.get('[data-testid="table-row"]:first').click();
    cy.get('[data-testid="nickname-input"]').clear().type('Observer2');
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Check that both observers are listed
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Observer1');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Observer2');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Observers (2)');
    
    // Current user (Observer2) takes a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
      cy.get('[data-testid="confirm-seat-btn"]').click();
    });
    
    cy.wait(2000);
    
    // Verify Observer2 is now a player and Observer1 remains an observer
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Players (1)');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Observer2');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Observers (1)');
    cy.get('[data-testid="online-users-list"]').should('contain.text', 'Observer1');
    
    // Verify Observer2 appears only once (as player)
    cy.get('[data-testid="online-users-list"]').then(($list) => {
      const text = $list.text();
      const observer2Matches = (text.match(/Observer2/g) || []).length;
      expect(observer2Matches).to.equal(1, 'Observer2 should only appear once as player');
    });
  });
}); 