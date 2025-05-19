import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('I join the game with nickname {string}', (nickname: string) => {
  cy.joinGame(nickname);
});

When('I take a seat', () => {
  cy.get('.seat-button').first().click();
  cy.contains('Yes').click();
});

Then('I should see my player seat', () => {
  cy.get('.player-seat').should('exist');
});

Then('I should see the betting controls', () => {
  cy.get('.betting-controls').should('be.visible');
}); 