import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

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

Then('the pot should increase by {int}', (amount) => {
  cy.get('.pot-amount').should(($el) => {
    const potAmount = parseInt($el.text().replace(/[^0-9]/g, ''));
    expect(potAmount).to.be.gt(0);
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

Then('my status should show as Folded', () => {
  cy.get('.player-status').should('contain', 'Folded');
});

Then('the betting controls should not be visible', () => {
  cy.get('.betting-controls').should('not.exist');
}); 