import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Then('I should see {string} in the game status', (status) => {
  cy.get('.game-status').should('contain', status);
});

Then('I should see the dealer button', () => {
  cy.get('.dealer-button').should('be.visible');
});

Then('I should see the pot display', () => {
  cy.get('.pot').should('be.visible');
});

Then('I should see the current bet display', () => {
  cy.get('.current-bet').should('be.visible');
});

When('it is my turn', () => {
  // Wait for the game to start and it's the player's turn
  cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
});

Then('I should see the betting controls', () => {
  cy.get('.betting-controls').should('be.visible');
});

When('I place a bet of {int}', (amount: number) => {
  cy.placeBet(amount);
});

Then('I should see the updated pot amount', () => {
  cy.get('.pot').should('be.visible');
  // The pot amount should be greater than 0 after betting
  cy.get('.pot').invoke('text').then((text) => {
    const potAmount = parseInt(text.replace(/[^0-9]/g, ''));
    expect(potAmount).to.be.greaterThan(0);
  });
}); 