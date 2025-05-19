import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('I reload the page', () => {
  cy.reload();
});

Then('I should remain in the same seat position', () => {
  cy.get('.player-seat').then(($seat) => {
    const originalPosition = $seat.position();
    cy.reload();
    cy.get('.player-seat').should(($newSeat) => {
      const newPosition = $newSeat.position();
      expect(newPosition).to.deep.equal(originalPosition);
    });
  });
});

Then('the game state should be preserved', () => {
  cy.get('.player-seat').should('exist');
  cy.get('.dealer-button').should('be.visible');
  cy.get('.pot').should('be.visible');
  cy.get('.current-bet').should('be.visible');
});

When('I lose connection', () => {
  cy.window().then((win) => {
    win.dispatchEvent(new Event('offline'));
  });
});

Then('I should see a reconnection message', () => {
  cy.get('.reconnection-message').should('be.visible');
});

When('I restore connection', () => {
  cy.window().then((win) => {
    win.dispatchEvent(new Event('online'));
  });
}); 