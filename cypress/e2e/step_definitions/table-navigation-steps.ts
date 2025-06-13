import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Table navigation specific setup

// Table states
Given('table {string} is available', (tableId: string) => {
  cy.get(`[data-testid="table-${tableId}"]`).should('be.visible')
})

Given('table {string} has players waiting', (tableId: string) => {
  cy.get(`[data-testid="table-${tableId}"] [data-testid="player-count"]`)
    .should('contain', '/')
})

Given('table {string} is full', (tableId: string) => {
  cy.get(`[data-testid="table-${tableId}"] [data-testid="status"]`)
    .should('contain', 'Full')
})

// This step is already defined in common-steps.ts

// Actions
When('I click on {string} for table {string}', (action: string, tableId: string) => {
  if (action === 'Join Table') {
    cy.get(`[data-testid="join-table-${tableId}"]`).click()
  } else if (action === 'Observe') {
    cy.get(`[data-testid="observe-table-${tableId}"]`).click()
  }
})

When('I navigate to table {string}', (tableId: string) => {
  cy.visit(`/table/${tableId}`)
})

When('I click the back button', () => {
  cy.get('[data-testid="back-to-lobby-button"]').click()
})

When('I use the browser back button', () => {
  cy.go('back')
})

When('I refresh the page', () => {
  cy.reload()
})

When('I try to access table {string} directly', (tableId: string) => {
  cy.visit(`/table/${tableId}`)
})

When('I try to join a full table', () => {
  cy.get('[data-testid="table-status"]:contains("Full")')
    .parent()
    .find('[data-testid^="join-table-"]')
    .click({ force: true })
})

// Assertions
Then('I should be redirected to table {string}', (tableId: string) => {
  cy.url().should('include', `/table/${tableId}`)
})

Then('I should see the table interface', () => {
  cy.get('[data-testid="table-interface"]').should('be.visible')
})

Then('I should see the player seats', () => {
  cy.get('[data-testid^="seat-"]').should('have.length.greaterThan', 0)
})

Then('I should see the observer interface', () => {
  cy.get('[data-testid="observer-interface"]').should('be.visible')
})

Then('I should return to the lobby', () => {
  cy.url().should('not.include', '/table/')
  cy.get('[data-testid="table-grid"]').should('be.visible')
})

Then('I should see the table list', () => {
  cy.get('[data-testid="table-grid"]').should('be.visible')
  cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0)
})

Then('I should remain at the same table', () => {
  cy.get('[data-testid="table-interface"]').should('be.visible')
  cy.url().should('include', '/table/')
})

Then('I should be redirected to the lobby', () => {
  cy.url().should('not.include', '/table/')
  cy.get('[data-testid="table-grid"]').should('be.visible')
})

Then('I should see an error message {string}', (errorMessage: string) => {
  cy.get('[data-testid="error-message"]').should('contain', errorMessage)
})

Then('the join button should be disabled', () => {
  cy.get('[data-testid^="join-table-"]').should('be.disabled')
})

Then('I should be redirected to login', () => {
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
})

Then('I should see {string} button for table {string}', (buttonText: string, tableId: string) => {
  if (buttonText === 'Join Table') {
    cy.get(`[data-testid="join-table-${tableId}"]`).should('be.visible')
  } else if (buttonText === 'Observe') {
    cy.get(`[data-testid="observe-table-${tableId}"]`).should('be.visible')
  }
}) 