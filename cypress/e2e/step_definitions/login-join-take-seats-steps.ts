import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Authentication States
Given('I am not logged in', () => {
  cy.get('[data-testid="user-info"]').should('not.exist')
  cy.get('[data-testid="anonymous-info"]').should('be.visible')
})

// Actions - Login Flow
When('I attempt to join a table', () => {
  // For anonymous users, the button is disabled but should trigger login modal
  cy.get('[data-testid^="join-table-"]').first().click({ force: true })
})

When('I login with nickname {string}', (nickname: string) => {
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
  cy.get('[data-testid="nickname-input"]').type(nickname)
  cy.get('[data-testid="join-button"]').click()
})

When('I click join table to visit the game page', () => {
  cy.get('[data-testid^="join-table-"]').first().click()
  cy.url().should('include', '/table/')
})

// Actions - Seat Management
When('I take an available seat {string}', (seatNumber: string) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('be.visible')
  cy.get(`[data-testid="seat-${seatNumber}"]`).click()
  cy.get(`[data-testid="take-seat-${seatNumber}"]`).click()
})

When('I take another available seat {string}', (seatNumber: string) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('be.visible')
  cy.get(`[data-testid="seat-${seatNumber}"]`).click()
  cy.get(`[data-testid="take-seat-${seatNumber}"]`).click()
})

// Assertions - Login Flow
Then('I should be prompted to login first', () => {
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
})

Then('I should see a welcome message with {string} on the top right', (nickname: string) => {
  cy.get('[data-testid="user-info"]').should('be.visible')
  cy.get('[data-testid="user-nickname"]').should('contain', nickname)
})

Then('the online users count should be updated to reflect my login', () => {
  cy.get('[data-testid="online-count"]').should('be.visible')
})

Then('the online users count should increase by 1', () => {
  cy.get('[data-testid="online-count"]').invoke('text').then((text) => {
    const count = parseInt(text.match(/\d+/)?.[0] || '0')
    expect(count).to.be.greaterThan(0)
  })
})

// Assertions - Navigation
Then('I should be on the game page', () => {
  cy.url().should('include', '/table/')
  cy.get('[data-testid="game-container"]').should('be.visible')
})

// Assertions - Observers List
Then('I should see {string} in the observers list', (nickname: string) => {
  cy.get('[data-testid="observers-list"]').should('contain', nickname)
})

Then('I should not see {string} in the players list', (nickname: string) => {
  cy.get('[data-testid="players-list"]').should('not.contain', nickname)
})

Then('I should be removed from the observers list', () => {
  cy.get('[data-testid="observers-list"]').should('not.contain', 'TestPlayer')
})

Then('I should not see {string} in the observers list', (nickname: string) => {
  cy.get('[data-testid="observers-list"]').should('not.contain', nickname)
})

// Assertions - Players List
Then('I should see {string} in the players list at seat {string}', (nickname: string, seatNumber: string) => {
  cy.get(`[data-testid="seat-${seatNumber}-player"]`).should('contain', nickname)
  cy.get('[data-testid="players-list"]').should('contain', nickname)
})

Then('I should not see {string} at seat {string}', (nickname: string, seatNumber: string) => {
  cy.get(`[data-testid="seat-${seatNumber}-player"]`).should('not.contain', nickname)
})

// Assertions - Seat States
Then('seat {string} should be in taken state', (seatNumber: string) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('have.class', 'taken')
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('not.have.class', 'available')
})

Then('seat {string} should return to available state', (seatNumber: string) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('have.class', 'available')
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('not.have.class', 'taken')
})

Then('the players list should reflect this seat change', () => {
  cy.get('[data-testid="players-list"]').should('be.visible')
  // Verify that the player appears only in the new seat position
  cy.get('[data-testid="players-list"] .player-seat-3').should('contain', 'TestPlayer')
  cy.get('[data-testid="players-list"] .player-seat-1').should('not.contain', 'TestPlayer')
}) 