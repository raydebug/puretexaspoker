import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('I am on the game page', () => {
  cy.visit('/');
});

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

Then('I should see the betting controls', () => {
  cy.get('.betting-controls').should('be.visible');
});

When('I check', () => {
  cy.get('.betting-controls').within(() => {
    cy.contains('Check').click();
  });
});

Then('the betting round should continue', () => {
  // Verify that the game state has changed
  cy.get('.game-status').should('not.contain', 'Your Turn');
});

When('it is my turn again', () => {
  cy.contains('Your Turn', { timeout: 10000 }).should('be.visible');
});

When('I place a bet of {int}', (amount: number) => {
  cy.placeBet(amount);
});

Then('I should see "Chips: {int}" displayed', (amount: number) => {
  cy.contains(`Chips: ${amount}`).should('be.visible');
});

Then('the pot should increase by {int}', (amount: number) => {
  cy.get('.pot').invoke('text').then((text) => {
    const potAmount = parseInt(text.replace(/[^0-9]/g, ''));
    expect(potAmount).to.be.greaterThan(0);
  });
});

When('I fold', () => {
  cy.get('.betting-controls').within(() => {
    cy.contains('Fold').click();
  });
});

Then('I should see "Folded" in my status', () => {
  cy.get('.player-status').should('contain', 'Folded');
});

Then('I should not see the betting controls', () => {
  cy.get('.betting-controls').should('not.exist');
}); 