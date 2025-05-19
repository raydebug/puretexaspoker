import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Then('I should see my player seat', () => {
  cy.get('.player-seat').should('exist');
});

Then('I should see {string} displayed', (text: string) => {
  cy.contains(text).should('be.visible');
});

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