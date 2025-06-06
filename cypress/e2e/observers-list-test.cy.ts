describe('Observers List Test', () => {
  beforeEach(() => {
    // Visit the lobby page
    cy.visit('/');
    
    // Set a test nickname
    cy.setCookie('playerNickname', 'ObserverTestPlayer');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should add player to observers list when joining a table', () => {
    const testNickname = 'ObserverPlayer1';
    
    // Join a table as observer
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    // Fill in nickname and join as observer (auto-joins as observer with new flow)
    cy.get('[data-testid="nickname-input"]').clear().type(testNickname);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should navigate to observer view
    cy.url().should('satisfy', (url: string) => 
      url.includes('/game/') || url.includes('/join-table')
    );
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Check that online users list is visible
    cy.get('[data-testid="online-users-list"]', { timeout: 5000 }).should('be.visible');
    
    // Check that observers section exists and shows the test nickname
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('(1)').should('be.visible'); // Observer count
      cy.contains(testNickname).should('be.visible');
    });
  });

  it('should show observers section in online users list', () => {
    const player1 = 'Observer1';
    
    // First player joins
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(player1);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Check online users list structure
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Check Players section exists
      cy.contains('Players').should('be.visible');
      
      // Check Observers section exists
      cy.contains('Observers').should('be.visible');
      cy.contains('(1)').should('be.visible'); // One observer
      cy.contains(player1).should('be.visible');
    });
  });

  it('should show correct observer count in online users list', () => {
    const testNickname = 'ObserverCounter';
    
    // Join table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(testNickname);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify online users list shows correct observer information
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Check observer count and list
      cy.contains('Observers').should('be.visible');
      cy.contains('(1)').should('be.visible');
      cy.contains(testNickname).should('be.visible');
    });
    
    // Verify observer can see game state but cannot interact
    cy.get('[data-testid="poker-table"]').should('be.visible');
    
    // Check that observer controls are present
    cy.contains('Leave Table').should('be.visible');
  });

  it('should display online users list with observer status', () => {
    const testNickname = 'StatusObserver';
    
    // Join table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(testNickname);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify online users list is positioned and visible
    cy.get('[data-testid="online-users-list"]').should('be.visible');
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Check title
      cy.contains('Online Users').should('be.visible');
      
      // Check sections exist
      cy.contains('Players').should('be.visible');
      cy.contains('Observers').should('be.visible');
      
      // Check observer appears in list
      cy.contains(testNickname).should('be.visible');
    });
    
    // Verify observer view elements
    cy.contains('Observing Table').should('be.visible');
    cy.contains('You are currently watching this game').should('be.visible');
  });

  it('should handle observer leaving and updating list', () => {
    const testNickname = 'LeavingObserver';
    
    // Join table as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(testNickname);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify player is in observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('(1)').should('be.visible');
      cy.contains(testNickname).should('be.visible');
    });
    
    // Leave the table using the Leave Table button
    cy.contains('Leave Table').click();
    
    // Should be back in lobby
    cy.get('[data-testid="lobby-container"]', { timeout: 5000 }).should('be.visible');
    
    // URL should be back to root/lobby
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
}); 