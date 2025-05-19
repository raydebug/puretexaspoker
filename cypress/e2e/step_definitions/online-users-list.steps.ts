import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('I join the game with nickname {string}', (nickname: string) => {
  cy.joinGame(nickname);
});

When('I take a seat', () => {
  cy.get('.seat-button').first().click();
  cy.contains('Yes').click();
});

When('I stand up', () => {
  cy.openSeatMenu();
  cy.contains('Stand Up').click();
});

Then('I should see {string} in the online users list', (text: string) => {
  cy.get('.online-list').should('contain', text);
});

Then('I should see {string} in the observers list', (text: string) => {
  cy.get('.observers-list').should('contain', text);
});

Then('I should see {string} in the players list', (text: string) => {
  cy.get('.players-list').should('contain', text);
});

Then('I should see {string} next to my name', (text: string) => {
  cy.get('.player-name').should('contain', text);
});

Then('my name should be highlighted', () => {
  cy.get('.player-name').should('have.css', 'font-weight', 'bold');
});

Then('my name should appear with reduced opacity', () => {
  cy.get('.player-name').should('have.css', 'opacity', '0.5');
});

Then('my name should appear with full opacity', () => {
  cy.get('.player-name').should('have.css', 'opacity', '1');
}); 