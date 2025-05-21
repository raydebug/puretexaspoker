describe('Table Management', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.fixture('game-data').as('gameData');
  });

  it('should handle table creation and configuration', () => {
    // Login as admin
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Open table creation form
    cy.get('[data-testid="create-table-button"]').click();
    cy.get('[data-testid="table-form"]').should('be.visible');

    // Configure table
    cy.get('[data-testid="table-form"]').within(() => {
      cy.get('[data-testid="table-name"]').type('Test Table');
      cy.get('[data-testid="min-players"]').type('2');
      cy.get('[data-testid="max-players"]').type('9');
      cy.get('[data-testid="small-blind"]').type('5');
      cy.get('[data-testid="big-blind"]').type('10');
      cy.get('[data-testid="min-buy-in"]').type('100');
      cy.get('[data-testid="max-buy-in"]').type('1000');
      cy.get('[data-testid="create-button"]').click();
    });

    // Verify table creation
    cy.get('[data-testid="success-message"]').should('contain', 'Table created');
    cy.get('[data-testid="table-list"]').should('contain', 'Test Table');
  });

  it('should handle table joining and leaving', () => {
    // Login first player
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.name, player1.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Verify player is seated
    cy.get('[data-testid="player-seat"]').should('be.visible');
    cy.get('[data-testid="player-chips"]').should('contain', '1000');

    // Leave table
    cy.get('[data-testid="leave-table-button"]').click();
    cy.get('[data-testid="confirm-leave"]').click();

    // Verify player has left
    cy.get('[data-testid="player-seat"]').should('not.exist');
  });

  it('should handle table settings', () => {
    // Login as admin
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Open table settings
    cy.get('[data-testid="table-settings-button"]').click();
    cy.get('[data-testid="table-settings-form"]').should('be.visible');

    // Update settings
    cy.get('[data-testid="table-settings-form"]').within(() => {
      cy.get('[data-testid="auto-start-toggle"]').click();
      cy.get('[data-testid="time-bank-toggle"]').click();
      cy.get('[data-testid="save-settings"]').click();
    });

    // Verify settings update
    cy.get('[data-testid="success-message"]').should('contain', 'Settings saved');

    // Verify settings persistence
    cy.reload();
    cy.get('[data-testid="table-settings-form"]').within(() => {
      cy.get('[data-testid="auto-start-toggle"]').should('be.checked');
      cy.get('[data-testid="time-bank-toggle"]').should('be.checked');
    });
  });

  it('should handle table statistics', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Open table statistics
    cy.get('[data-testid="table-stats-button"]').click();
    cy.get('[data-testid="table-stats"]').should('be.visible');

    // Verify statistics display
    cy.get('[data-testid="table-stats"]').within(() => {
      cy.get('[data-testid="total-hands"]').should('be.visible');
      cy.get('[data-testid="avg-pot"]').should('be.visible');
      cy.get('[data-testid="players-per-hand"]').should('be.visible');
      cy.get('[data-testid="flop-seen"]').should('be.visible');
    });

    // Verify statistics persistence
    cy.reload();
    cy.get('[data-testid="table-stats"]').should('be.visible');
  });

  it('should handle table chat moderation', () => {
    // Login as admin
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Open chat
    cy.get('[data-testid="chat-toggle"]').click();

    // Test chat moderation
    cy.get('[data-testid="chat-input"]').type('Inappropriate message{enter}');
    cy.get('[data-testid="moderate-message"]').click();
    cy.get('[data-testid="mute-player"]').click();

    // Verify moderation action
    cy.get('[data-testid="moderation-log"]').should('contain', 'Player muted');
    cy.get('[data-testid="chat-input"]').should('be.disabled');
  });
}); 