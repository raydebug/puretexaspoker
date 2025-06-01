/// <reference types="cypress" />
/// <reference types="mocha" />

describe('Chat System', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle chat messages', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);

    // Send chat message
    cy.get('[data-testid="chat-input"]').type('Hello, everyone!');
    cy.get('[data-testid="chat-send"]').click();

    // Verify message appears in chat
    cy.get('[data-testid="chat-messages"]').should('contain', 'Hello, everyone!');
  });

  it('should handle chat in new window', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);

    // Open chat in new window
    cy.window().then(win => {
      cy.stub(win, 'open' as keyof Window).returns(win).as('openWindow');
      cy.get('[data-testid="open-chat"]').click();
      cy.get('@openWindow').should('be.called');
    });

    // Send message in new window
    cy.get('[data-testid="chat-input"]').type('Hello from new window!');
    cy.get('[data-testid="chat-send"]').click();

    // Verify message appears in both windows
    cy.get('[data-testid="chat-messages"]').should('contain', 'Hello from new window!');
  });

  it('should handle chat notifications', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000,
      buyIn: 1000,
      name: 'TestPlayer'
    };

    cy.joinGame(player.nickname);
    cy.joinTable(1, player.buyIn);

    // Minimize chat
    cy.get('[data-testid="minimize-chat"]').click();

    // Send message from another player
    cy.window().then(win => {
      win.postMessage({ type: 'CHAT_MESSAGE', content: 'New message!' }, '*');
    });

    // Verify notification appears
    cy.get('[data-testid="chat-notification"]').should('be.visible');
  });
}); 