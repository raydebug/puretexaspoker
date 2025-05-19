import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Then('the online users list should not be visible', () => {
  cy.get('.online-list').should('not.exist');
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

When('I click on my seat', () => {
  cy.get('.player-seat').first().click();
});

Then('I should see {string}', (text: string) => {
  cy.contains(text).should('be.visible');
}); 