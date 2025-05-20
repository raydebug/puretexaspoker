describe('Player Management', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.fixture('game-data').as('gameData');
  });

  it('should handle player registration and login', () => {
    // Register new player
    cy.get('[data-testid="register-link"]').click();
    cy.get('[data-testid="register-form"]').within(() => {
      cy.get('[data-testid="username-input"]').type('NewPlayer');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="confirm-password-input"]').type('password123');
      cy.get('[data-testid="register-button"]').click();
    });

    // Verify registration success
    cy.get('[data-testid="success-message"]').should('contain', 'Registration successful');

    // Login with new credentials
    cy.get('[data-testid="login-form"]').within(() => {
      cy.get('[data-testid="username-input"]').type('NewPlayer');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
    });

    // Verify login success
    cy.get('[data-testid="user-menu"]').should('contain', 'NewPlayer');
  });

  it('should handle player profile management', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Open profile menu
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="profile-link"]').click();

    // Update profile
    cy.get('[data-testid="profile-form"]').within(() => {
      cy.get('[data-testid="avatar-select"]').select('custom');
      cy.get('[data-testid="avatar-upload"]').attachFile('avatar.png');
      cy.get('[data-testid="save-profile"]').click();
    });

    // Verify profile update
    cy.get('[data-testid="success-message"]').should('contain', 'Profile updated');
    cy.get('[data-testid="user-avatar"]').should('have.attr', 'src').and('include', 'avatar.png');
  });

  it('should handle player status changes', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Set player status to away
    cy.get('[data-testid="status-menu"]').click();
    cy.get('[data-testid="away-status"]').click();
    cy.get('[data-testid="player-status"]').should('contain', 'Away');

    // Set player status to back
    cy.get('[data-testid="status-menu"]').click();
    cy.get('[data-testid="back-status"]').click();
    cy.get('[data-testid="player-status"]').should('not.contain', 'Away');

    // Set player status to busy
    cy.get('[data-testid="status-menu"]').click();
    cy.get('[data-testid="busy-status"]').click();
    cy.get('[data-testid="player-status"]').should('contain', 'Busy');
  });

  it('should handle player statistics', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Open statistics
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="stats-link"]').click();

    // Verify statistics display
    cy.get('[data-testid="stats-container"]').within(() => {
      cy.get('[data-testid="games-played"]').should('be.visible');
      cy.get('[data-testid="win-rate"]').should('be.visible');
      cy.get('[data-testid="total-winnings"]').should('be.visible');
      cy.get('[data-testid="biggest-pot"]').should('be.visible');
    });

    // Verify statistics persistence
    cy.reload();
    cy.get('[data-testid="stats-container"]').should('be.visible');
  });

  it('should handle player settings', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Open settings
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="settings-link"]').click();

    // Update settings
    cy.get('[data-testid="settings-form"]').within(() => {
      cy.get('[data-testid="sound-toggle"]').click();
      cy.get('[data-testid="animation-toggle"]').click();
      cy.get('[data-testid="auto-muck-toggle"]').click();
      cy.get('[data-testid="save-settings"]').click();
    });

    // Verify settings update
    cy.get('[data-testid="success-message"]').should('contain', 'Settings saved');

    // Verify settings persistence
    cy.reload();
    cy.get('[data-testid="settings-form"]').within(() => {
      cy.get('[data-testid="sound-toggle"]').should('be.checked');
      cy.get('[data-testid="animation-toggle"]').should('not.be.checked');
      cy.get('[data-testid="auto-muck-toggle"]').should('be.checked');
    });
  });
}); 