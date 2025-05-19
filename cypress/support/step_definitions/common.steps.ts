import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Common navigation steps
Given('I am on the game page', () => {
  cy.visit('/');
});

// Common game interaction steps
When('I join the game with nickname {string}', (nickname: string) => {
  cy.joinGame(nickname);
});

When('I take a seat', () => {
  cy.get('.seat-button').first().click();
  cy.contains('Yes').click();
});

When('it is my turn', () => {
  cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
});

When('it is my turn again', () => {
  cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
});

// Common verification steps
Then('I should see {string} displayed', (text: string) => {
  cy.contains(text).should('be.visible');
});

Then('I should see my player seat', () => {
  cy.get('.player-seat').should('exist');
});

Then('I should see the betting controls', () => {
  cy.get('.betting-controls').should('be.visible');
});

// Common betting steps
When('I place a bet of {int}', (amount: number) => {
  cy.placeBet(amount);
});

When('I check', () => {
  cy.get('.betting-controls').within(() => {
    cy.contains('Check').click();
  });
});

When('I fold', () => {
  cy.get('.betting-controls').within(() => {
    cy.contains('Fold').click();
  });
});

// Common status steps
When('I set my status to {string}', (status: 'away' | 'back') => {
  cy.setPlayerStatus(status);
});

When('I open the seat menu', () => {
  cy.openSeatMenu();
});

// Common list verification steps
Then('I should see {string} in the online users list', (text: string) => {
  cy.get('.online-list').should('be.visible').within(() => {
    cy.contains(text).should('be.visible');
  });
});

Then('I should see {string} in the players list', (text: string) => {
  cy.get('.online-list').within(() => {
    cy.contains(text).should('be.visible');
  });
});

Then('I should see {string} in the observers list', (text: string) => {
  cy.get('.online-list').within(() => {
    cy.get('.observers-list').should('contain', text);
  });
}); 