import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('I join the game with nickname {string}', (nickname: string) => {
  cy.joinGame(nickname);
});

Then('I should see {string} displayed', (text: string) => {
  cy.contains(text).should('be.visible');
});

Then('I should see my player seat', () => {
  cy.get('.player-seat').should('exist');
});

Then('I should see the betting controls', () => {
  cy.get('.betting-controls').should('be.visible');
});

When('I reload the page', () => {
  cy.reload();
});

Then('I should see my session persisted', () => {
  cy.get('.player-seat').should('exist');
  cy.contains('Chips: 1000').should('be.visible');
}); 