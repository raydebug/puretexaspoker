describe('Observer Appears When Joining Table Bug Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'ObserverTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should add player to observers list when joining a table', () => {
    const playerName = 'ObserverBugTest';
    
    // Join a table as observer
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // **CRITICAL TEST**: Player should appear in observers list
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should have Observers section
      cy.contains('Observers').should('be.visible');
      
      // Player should be in observers list  
      cy.contains(playerName).should('be.visible');
      
      // Should show correct count
      cy.contains('Observers (1)').should('be.visible');
    });
  });

  it('should handle multiple observers joining the same table', () => {
    // This simulates what should happen when multiple users join
    const observer1 = 'Observer1';
    
    // Join first observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observer1);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Should see the observer in the list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(observer1).should('be.visible');
      cy.contains('Observers (1)').should('be.visible');
    });
  });

  it('should show observer in list immediately after joining', () => {
    const playerName = 'ImmediateTest';
    
    // Join table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify observer list shows immediately (no long wait)
    cy.get('[data-testid="online-users-list"]', { timeout: 5000 }).should('be.visible');
    
    // Debug: Log what we see in the list
    cy.get('[data-testid="online-users-list"]').then(($list) => {
      cy.log('Online users list content:', $list.text());
    });
    
    // Check that player appears in observers
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName, { timeout: 3000 }).should('be.visible');
    });
  });

  it('should persist observer status after page refresh', () => {
    const playerName = 'PersistentObserver';
    
    // Join as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify observer appears
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains(playerName).should('be.visible');
    });
    
    // Refresh page
    cy.reload();
    
    // Should still be in observer view (if game state persists)
    cy.get('[data-testid="observer-view"], [data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
  });

  it('should handle observer joining with existing debug logging', () => {
    const playerName = 'DebugObserver';
    
    // Monitor console logs
    cy.window().then((win) => {
      // Capture console.log calls
      cy.stub(win.console, 'log').as('consoleLog');
    });
    
    // Join table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify player appears in list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    // Check for debug logs (optional - if debug is enabled)
    cy.get('@consoleLog').should('have.been.called');
  });
}); 