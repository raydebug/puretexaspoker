import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Observer to Player specific setup
Given('table {string} has {int} available seats', (tableId: string, seatCount: number) => {
  cy.get(`[data-testid="table-${tableId}"]`).should('be.visible')
  cy.get(`[data-testid="table-${tableId}"] [data-testid="available-seats"]`)
    .should('contain', seatCount.toString())
})

Given('there are empty seats available', () => {
  cy.get('[data-testid^="seat-"]').then($seats => {
    const emptySeat = Array.from($seats).find(seat => 
      !Cypress.$(seat).find('[data-testid*="player"]').length
    )
    expect(emptySeat).to.exist
  })
})

Given('other players are seated', () => {
  cy.get('[data-testid^="seat-"]').should('contain', 'Player')
})

// Actions
When('I click on an empty seat', () => {
  cy.get('[data-testid^="seat-"]:not(:has([data-testid*="player"]))')
    .first()
    .click()
})

When('I click {string}', (buttonText: string) => {
  cy.contains('button', buttonText).click()
})

When('I select seat {int}', (seatNumber: number) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).click()
})

When('I confirm my seat selection', () => {
  cy.get('[data-testid="confirm-seat-button"]').click()
})

When('I observe the table for {int} seconds', (seconds: number) => {
  cy.wait(seconds * 1000)
})

When('another player joins', () => {
  // This would be simulated by socket events in a real scenario
  cy.wait(1000)
})

// Assertions - UI State
Then('I should be at table {string}', (tableId: string) => {
  cy.url().should('include', `/table/${tableId}`)
})

Then('I should see the observe interface', () => {
  cy.get('[data-testid="observer-interface"]').should('be.visible')
})

Then('I should see the {string} button', (buttonText: string) => {
  cy.contains('button', buttonText).should('be.visible')
})

Then('I should see available seats highlighted', () => {
  cy.get('[data-testid="empty-seat"]').should('have.class', 'available')
})

Then('I should see a seat selection modal', () => {
  cy.get('[data-testid="seat-selection-modal"]').should('be.visible')
})

Then('I should see seat {int} highlighted', (seatNumber: number) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('have.class', 'selected')
})

// Assertions - Player State
Then('I should become a player', () => {
  cy.get('[data-testid="player-interface"]').should('be.visible')
  cy.get('[data-testid="observer-interface"]').should('not.exist')
})

Then('I should be seated at seat {int}', (seatNumber: number) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('contain', 'You')
})

Then('my status should change from observer to player', () => {
  cy.get('[data-testid="user-status"]').should('contain', 'Player')
  cy.get('[data-testid="user-status"]').should('not.contain', 'Observer')
})

Then('I should see player action buttons', () => {
  cy.get('[data-testid="player-actions"]').should('be.visible')
  cy.get('[data-testid="fold-button"]').should('be.visible')
  cy.get('[data-testid="call-button"]').should('be.visible')
  cy.get('[data-testid="raise-button"]').should('be.visible')
})

// Assertions - Online List
Then('the online users list should update', () => {
  cy.get('[data-testid="online-list"]').should('be.visible')
})

Then('I should appear in the players section', () => {
  cy.get('[data-testid="players-list"]').should('contain', 'You')
})

Then('I should no longer appear in the observers section', () => {
  cy.get('[data-testid="observers-list"]').should('not.contain', 'You')
})

Then('the player count should increase', () => {
  cy.get('[data-testid="players-count"]').should('contain', '1')
})

Then('the observer count should decrease', () => {
  cy.get('[data-testid="observers-count"]').should('contain', '0')
})

// Error cases
Then('I should see an error message {string}', (errorMessage: string) => {
  cy.get('[data-testid="error-message"]').should('contain', errorMessage)
})

Then('I should remain as an observer', () => {
  cy.get('[data-testid="observer-interface"]').should('be.visible')
  cy.get('[data-testid="player-interface"]').should('not.exist')
}) 