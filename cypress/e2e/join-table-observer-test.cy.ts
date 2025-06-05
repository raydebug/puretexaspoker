describe('Join Table Observer Test', () => {
  beforeEach(() => {
    // Visit the lobby page
    cy.visit('/');
    
    // Set a test nickname
    cy.setCookie('playerNickname', 'TestObserver');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should add player to observers list when joining a table', () => {
    // Find an available table and click join
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    // Fill out the join dialog and join as observer
    cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type('TestObserver');
    
    // Click join button (should join as observer)
    cy.get('[data-testid="join-as-observer"]').should('be.enabled').click();
    
    // Should navigate to game page (either directly or via join-table)
    cy.url().should('satisfy', (url: string) => 
      url.includes('/game/') || url.includes('/join-table')
    );
    
    // Wait for observer view or any game content to load
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify player is in observer mode
    cy.get('body').should('contain', 'Observing Table');
    cy.get('body').should('contain', 'You are currently watching this game');
    
    // Verify the observer nickname is stored correctly
    cy.window().then((win) => {
      expect(win.localStorage.getItem('nickname')).to.eq('TestObserver');
    });
  });

  it('should handle multiple players joining as observers', () => {
    // First player joins
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type('Observer1');
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be on game page (either directly or via join-table)
    cy.url().should('satisfy', (url: string) => 
      url.includes('/game/') || url.includes('/join-table')
    );
    
    // Wait for observer view to load
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify Observer1 is in observer mode
    cy.get('body').should('contain', 'Observing Table');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('nickname')).to.eq('Observer1');
    });
    
    // Go back to lobby to join another player (simulate second browser tab)
    cy.visit('/');
    cy.setCookie('playerNickname', 'Observer2');
    
    // Join the same table
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type('Observer2');
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url().should('satisfy', (url: string) => 
      url.includes('/game/') || url.includes('/join-table')
    );
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify Observer2 is now the current observer
    cy.get('body').should('contain', 'Observing Table');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('nickname')).to.eq('Observer2');
    });
  });

  it('should show correct buy-in range information without requiring buy-in input', () => {
    // Click join on a table
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    // Verify buy-in range is shown as informational only
    cy.get('body').should('contain', 'Buy-in Range (when taking a seat)');
    
    // Verify there's no buy-in input field required for joining as observer
    cy.get('[data-testid="buy-in-input"]').should('not.exist');
    
    // Should only need nickname to join
    cy.get('[data-testid="nickname-input"]').should('be.visible');
    cy.get('[data-testid="join-as-observer"]').should('exist');
    
    // Fill nickname and join
    cy.get('[data-testid="nickname-input"]').clear().type('InfoTestPlayer');
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should successfully join without buy-in requirement
    cy.url().should('satisfy', (url: string) => 
      url.includes('/game/') || url.includes('/join-table')
    );
  });

  it('should handle full table joining as observer', () => {
    // Find a table that shows "full" status or any table for this test
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    // Join dialog should show appropriate messaging
    cy.get('[data-testid="nickname-input"]').clear().type('FullTableObserver');
    
    // Button text should indicate observer joining
    cy.get('[data-testid="join-as-observer"]')
      .should('contain', 'Join')
      .click();
    
    // Should still be able to join as observer even if table is "full" of seated players
    cy.url().should('satisfy', (url: string) => 
      url.includes('/game/') || url.includes('/join-table')
    );
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Player should be in observer mode
    cy.get('body').should('contain', 'Observing Table');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('nickname')).to.eq('FullTableObserver');
    });
  });

  it('should persist player information after joining', () => {
    const playerName = 'PersistentObserver';
    
    // Join table
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url().should('satisfy', (url: string) => 
      url.includes('/game/') || url.includes('/join-table')
    );
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify player name is stored
    cy.window().then((win) => {
      expect(win.localStorage.getItem('nickname')).to.eq(playerName);
    });
    
    // Refresh page to test persistence
    cy.reload();
    
    // After reload, player should still have the same nickname stored
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('nickname')).to.eq(playerName);
    });
  });
}); 