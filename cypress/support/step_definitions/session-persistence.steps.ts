import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('I am on the game page', () => {
  cy.visit('/');
});

When('I join the game with nickname {string}', (nickname: string) => {
  cy.joinGame(nickname);
});

Then('I should see {string} displayed', (text: string) => {
  cy.contains(text).should('be.visible');
});

When('I take a seat', () => {
  cy.get('.seat-button').first().click();
  cy.contains('Yes').click();
});

Then('I should see my player seat', () => {
  cy.get('.player-seat').should('exist');
});

When('I reload the page', () => {
  cy.reload();
});

Then('I should be in the same seat position', () => {
  // Get the seat position before reload
  cy.get('.player-seat').invoke('attr', 'data-seat-position').as('originalSeatPosition');
  
  // After reload, verify the seat position is the same
  cy.get('.player-seat').should(($seat) => {
    const currentPosition = $seat.attr('data-seat-position');
    expect(currentPosition).to.equal(Cypress.env('originalSeatPosition'));
  });
});

Then('my game state should be preserved', () => {
  // Verify game state elements are present and correct
  cy.get('.player-seat').should('exist');
  cy.get('.dealer-button').should('be.visible');
  cy.get('.pot').should('be.visible');
  cy.get('.current-bet').should('be.visible');
});

When('I simulate a connection loss', () => {
  // Simulate WebSocket disconnection
  cy.window().then((win) => {
    win.dispatchEvent(new Event('offline'));
  });
});

Then('I should see a reconnection message', () => {
  cy.contains('Reconnecting...').should('be.visible');
});

When('the connection is restored', () => {
  // Simulate WebSocket reconnection
  cy.window().then((win) => {
    win.dispatchEvent(new Event('online'));
  });
}); 