import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Authentication-specific states
Given('I am browsing anonymously', () => {
  cy.visit('/')
  cy.get('[data-testid="anonymous-info"]').should('be.visible')
})

// Actions
When('I click the login button', () => {
  cy.get('[data-testid="login-button"]').click()
})

When('I enter the nickname {string}', (nickname: string) => {
  cy.get('[data-testid="nickname-input"]').type(nickname)
})

When('I click the join button', () => {
  cy.get('[data-testid="join-button"]').click()
})

When('I click the browse anonymously button', () => {
  cy.get('[data-testid="browse-anonymously-button"]').click()
})

When('I click the logout button', () => {
  cy.get('[data-testid="logout-button"]').click()
})

When('I try to enter an empty nickname', () => {
  cy.get('[data-testid="nickname-input"]').clear()
  cy.get('[data-testid="join-button"]').click()
})

When('I try to enter a nickname that is too long', () => {
  const longNickname = 'a'.repeat(51) // Assuming 50 char limit
  cy.get('[data-testid="nickname-input"]').type(longNickname)
  cy.get('[data-testid="join-button"]').click()
})

When('I try to enter a nickname with invalid characters', () => {
  cy.get('[data-testid="nickname-input"]').type('User@#$%')
  cy.get('[data-testid="join-button"]').click()
})

// Assertions
Then('I should see the login modal', () => {
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
})

Then('I should be logged in successfully', () => {
  cy.get('[data-testid="user-info"]').should('be.visible')
  cy.get('[data-testid="nickname-modal"]').should('not.exist')
})

Then('I should see my nickname {string} displayed', (nickname: string) => {
  cy.get('[data-testid="user-nickname"]').should('contain', nickname)
})

Then('I should be able to access all features', () => {
  cy.get('[data-testid^="join-table-"]').should('not.be.disabled')
  cy.get('[data-testid="logout-button"]').should('be.visible')
})

Then('I should see the anonymous browse interface', () => {
  cy.get('[data-testid="anonymous-info"]').should('be.visible')
  cy.get('[data-testid="nickname-modal"]').should('not.exist')
})

Then('I should have limited access to features', () => {
  cy.get('[data-testid^="join-table-"]').should('be.disabled')
  cy.get('[data-testid="login-button"]').should('be.visible')
})

Then('I should be logged out', () => {
  cy.get('[data-testid="anonymous-info"]').should('be.visible')
  cy.get('[data-testid="user-info"]').should('not.exist')
})

Then('I should see the login modal again', () => {
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
})

Then('I should see an error message {string}', (errorMessage: string) => {
  cy.get('[data-testid="error-message"]').should('contain', errorMessage)
})

Then('I should not be logged in', () => {
  cy.get('[data-testid="user-info"]').should('not.exist')
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
})

Then('the nickname input should be highlighted as invalid', () => {
  cy.get('[data-testid="nickname-input"]').should('have.class', 'error')
})

Then('the join button should remain disabled', () => {
  cy.get('[data-testid="join-button"]').should('be.disabled')
}) 