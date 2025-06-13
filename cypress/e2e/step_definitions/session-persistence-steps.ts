import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Session-specific table states
Given('I am playing at table {string}', (tableId: string) => {
  cy.get(`[data-testid="join-table-${tableId}"]`).click()
  cy.url().should('include', `/table/${tableId}`)
})

// Actions
// Session-specific refresh that doesn't clear data
When('I refresh the page preserving session', () => {
  cy.reload()
})

When('I close and reopen the browser', () => {
  cy.clearCookies()
  cy.visit('/')
})

When('I navigate away and return', () => {
  cy.visit('/about') // Navigate to a different page
  cy.go('back')
})

When('I close the browser tab and reopen', () => {
  // Simulate tab close/reopen by clearing session but keeping local storage
  cy.reload()
})

When('I restart the browser', () => {
  // Simulate browser restart by clearing all data
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/')
})

// Assertions
Then('I should still be logged in as {string}', (nickname: string) => {
  cy.get('[data-testid="user-info"]').should('be.visible')
  cy.get('[data-testid="user-nickname"]').should('contain', nickname)
})

Then('I should be at the same table {string}', (tableId: string) => {
  cy.url().should('include', `/table/${tableId}`)
})

Then('my position should be maintained', () => {
  cy.get('[data-testid="current-user-seat"]').should('be.visible')
})

Then('I should return to the lobby', () => {
  cy.url().should('not.include', '/table/')
  cy.get('[data-testid="table-grid"]').should('be.visible')
})

Then('I should need to login again', () => {
  cy.get('[data-testid="anonymous-info"]').should('be.visible')
  cy.get('[data-testid="login-button"]').should('be.visible')
})

Then('my session data should be preserved', () => {
  cy.get('[data-testid="user-info"]').should('be.visible')
})

Then('my session should be cleared', () => {
  cy.get('[data-testid="anonymous-info"]').should('be.visible')
}) 