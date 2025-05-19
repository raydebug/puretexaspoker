import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('I open the seat menu', () => {
  cy.openSeatMenu();
});

When('I set my status to {string}', (status: 'away' | 'back') => {
  cy.setPlayerStatus(status);
});

Then('I should see the away status icon', () => {
  cy.get('.status-icon').should('be.visible');
});

Then('I should not see the away status icon', () => {
  cy.get('.status-icon').should('not.exist');
}); 