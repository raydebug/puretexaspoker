import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Then('the online users list should not be visible', () => {
  cy.get('.online-list').should('not.exist');
});

When('I take a seat', () => {
  cy.get('.seat-button').first().click();
  cy.contains('Yes').click();
});

Then('I should see {string} in the online users list', (text: string) => {
  cy.get('.online-list').should('contain', text);
});

Then('I should see {string} in the players list', (text: string) => {
  cy.get('.players-list').should('contain', text);
});

Then('I should see {string} in the observers list', (text: string) => {
  cy.get('.observers-list').should('contain', text);
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

When('I set my status to {string}', (status: 'away' | 'back') => {
  cy.setPlayerStatus(status);
});

Then('I should see "(Away)" next to my name', () => {
  cy.get('.online-list').within(() => {
    cy.contains('(Away)').should('be.visible');
  });
});

Then('I should not see "(Away)" next to my name', () => {
  cy.get('.online-list').within(() => {
    cy.contains('(Away)').should('not.exist');
  });
});

When('I stand up', () => {
  cy.openSeatMenu();
  cy.contains('Stand Up').click();
});

When('I leave the table', () => {
  cy.openSeatMenu();
  cy.contains('Leave Table').click();
}); 