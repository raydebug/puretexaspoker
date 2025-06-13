import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Common Background Steps
Given('I am on the poker lobby page', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/')
})

Given('I am on the poker lobby', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/')
})

Given('I am on the game page', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/')
})

// Common Authentication Steps
Given('I am logged in as {string}', (nickname: string) => {
  cy.get('[data-testid="login-button"]').click()
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
  cy.get('[data-testid="nickname-input"]').type(nickname)
  cy.get('[data-testid="join-button"]').click()
  cy.get('[data-testid="user-info"]').should('be.visible')
})

Given('I am logged in with nickname {string}', (nickname: string) => {
  cy.get('[data-testid="login-button"]').click()
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
  cy.get('[data-testid="nickname-input"]').type(nickname)
  cy.get('[data-testid="join-button"]').click()
  cy.get('[data-testid="user-info"]').should('be.visible')
})

// Common Navigation Steps
Given('I am at table {string}', (tableId: string) => {
  cy.get(`[data-testid="join-table-${tableId}"]`).click()
  cy.url().should('include', `/table/${tableId}`)
})

Given('I am observing table {string}', (tableId: string) => {
  cy.get(`[data-testid="observe-table-${tableId}"]`).click()
  cy.url().should('include', `/table/${tableId}`)
})

// Common Action Steps
When('I refresh the page', () => {
  cy.reload()
})

When('I wait for {int} seconds', (seconds: number) => {
  cy.wait(seconds * 1000)
})

// Common Assertion Steps
Then('I should see an error message {string}', (errorMessage: string) => {
  cy.get('[data-testid="error-message"]').should('contain', errorMessage)
}) 