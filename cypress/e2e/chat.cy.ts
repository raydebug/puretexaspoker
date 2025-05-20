describe('Chat Functionality', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.fixture('game-data').as('gameData');
  });

  it('should allow players to send and receive messages', () => {
    // Login first player
    cy.get('@gameData').then((data: any) => {
      const player1 = data.players[0];
      cy.loginPlayer(player1.name, player1.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Login second player in a new window
    cy.window().then((win) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        const newWindow = win.open('/');
        cy.wrap(newWindow).then((win) => {
          cy.stub(win, 'open').as('openWindow');
          cy.loginPlayer(player2.name, player2.chips);
        });
      });
    });

    // Open chat
    cy.get('[data-testid="chat-toggle"]').click();
    cy.get('[data-testid="chat-container"]').should('be.visible');

    // Send message from first player
    cy.get('[data-testid="chat-input"]').type('Hello from Player 1{enter}');
    cy.get('[data-testid="chat-messages"]').should('contain', 'Hello from Player 1');

    // Send message from second player
    cy.window().then((win) => {
      cy.get('@gameData').then((data: any) => {
        const player2 = data.players[1];
        cy.get('[data-testid="chat-input"]').type(`Hello from ${player2.name}{enter}`);
        cy.get('[data-testid="chat-messages"]').should('contain', `Hello from ${player2.name}`);
      });
    });

    // Verify message formatting
    cy.get('[data-testid="chat-messages"]').within(() => {
      cy.get('.message').should('have.length', 2);
      cy.get('.message').first().should('contain', 'Player 1');
      cy.get('.message').last().should('contain', 'Player 2');
    });
  });

  it('should handle emoji and special characters', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Open chat
    cy.get('[data-testid="chat-toggle"]').click();

    // Send message with emoji
    cy.get('[data-testid="chat-input"]').type('Hello 👋{enter}');
    cy.get('[data-testid="chat-messages"]').should('contain', 'Hello 👋');

    // Send message with special characters
    cy.get('[data-testid="chat-input"]').type('Special chars: !@#$%^&*(){enter}');
    cy.get('[data-testid="chat-messages"]').should('contain', 'Special chars: !@#$%^&*()');
  });

  it('should handle chat moderation', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Open chat
    cy.get('[data-testid="chat-toggle"]').click();

    // Try to send empty message
    cy.get('[data-testid="chat-input"]').type('{enter}');
    cy.get('[data-testid="chat-messages"]').should('not.contain', '');

    // Try to send very long message
    const longMessage = 'a'.repeat(500);
    cy.get('[data-testid="chat-input"]').type(longMessage);
    cy.get('[data-testid="chat-input"]').should('have.value', longMessage.slice(0, 200));

    // Try to send message with profanity
    cy.get('[data-testid="chat-input"]').type('bad word{enter}');
    cy.get('[data-testid="chat-messages"]').should('not.contain', 'bad word');
    cy.get('[data-testid="chat-error"]').should('be.visible');
  });

  it('should handle chat persistence', () => {
    // Login player
    cy.get('@gameData').then((data: any) => {
      const player = data.players[0];
      cy.loginPlayer(player.name, player.chips);
    });

    // Join table
    cy.joinTable('table1');

    // Open chat
    cy.get('[data-testid="chat-toggle"]').click();

    // Send message
    cy.get('[data-testid="chat-input"]').type('Persistent message{enter}');
    cy.get('[data-testid="chat-messages"]').should('contain', 'Persistent message');

    // Reload page
    cy.reload();

    // Verify message is still there
    cy.get('[data-testid="chat-toggle"]').click();
    cy.get('[data-testid="chat-messages"]').should('contain', 'Persistent message');
  });
}); 