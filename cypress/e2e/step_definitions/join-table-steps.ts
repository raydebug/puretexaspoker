import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Tables state steps
Given('tables are loaded and visible', () => {
  cy.get('[data-testid="table-grid"]').should('be.visible')
  cy.get('[data-testid^="join-table-"]').should('have.length.greaterThan', 0)
})

// Join table specific anonymous state steps  
Given('I am browsing anonymously and tables are visible', () => {
  cy.get('[data-testid="anonymous-info"]').should('be.visible')
  cy.get('[data-testid="anonymous-status"]').should('contain', 'Browsing Anonymously')
  cy.get('[data-testid="table-grid"]').should('be.visible')
})

Given('all join table buttons are disabled', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('be.disabled')
  })
})

Given('join table buttons are disabled', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('be.disabled')
  })
})

// Login state steps
Given('I am logged in with a valid nickname', () => {
  const testNickname = `TestUser${Date.now()}`
  cy.get('[data-testid="login-button"]').click()
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
  cy.get('[data-testid="nickname-input"]').type(testNickname)
  cy.get('[data-testid="join-button"]').click()
  cy.get('[data-testid="user-info"]').should('be.visible')
})

Given('all join table buttons are enabled', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('not.be.disabled')
    cy.wrap($button).should('contain', 'Join Table')
  })
})

// Actions
When('I view the table list', () => {
  cy.get('[data-testid="table-grid"]').should('be.visible')
})

When('I login with a valid nickname', () => {
  const testNickname = `TestUser${Date.now()}`
  cy.get('[data-testid="login-button"]').click()
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
  cy.get('[data-testid="nickname-input"]').type(testNickname)
  cy.get('[data-testid="join-button"]').click()
})

When('I logout and choose to browse anonymously', () => {
  cy.get('[data-testid="logout-button"]').click()
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
  cy.get('[data-testid="browse-anonymously-button"]').click()
})

When('I hover over a disabled join table button', () => {
  cy.get('[data-testid^="join-table-"]').first().trigger('mouseover', { force: true })
})

When('I attempt to click a join table button', () => {
  cy.get('[data-testid^="join-table-"]').first().click({ force: true })
})

// Assertions
Then('all join table buttons should be disabled', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('be.disabled')
  })
})

Then('join table buttons should have inactive styling', () => {
  cy.get('[data-testid^="join-table-"]').first().should('have.css', 'opacity', '0.6')
  cy.get('[data-testid^="join-table-"]').first().should('have.css', 'cursor', 'not-allowed')
})

Then('join table buttons should show {string} text', (expectedText: string) => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('contain', expectedText)
  })
})

Then('join table buttons should not be clickable', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('be.disabled')
  })
})

Then('all join table buttons should become enabled', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('not.be.disabled')
  })
})

Then('join table buttons should have active styling', () => {
  cy.get('[data-testid^="join-table-"]').first().should('have.css', 'opacity', '1')
  cy.get('[data-testid^="join-table-"]').first().should('not.have.css', 'cursor', 'not-allowed')
})

Then('join table buttons should be clickable', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('not.be.disabled')
  })
})

Then('join table buttons should revert to inactive styling', () => {
  cy.get('[data-testid^="join-table-"]').first().should('have.css', 'opacity', '0.6')
})

Then('all join table buttons should become disabled', () => {
  cy.get('[data-testid^="join-table-"]').each(($button) => {
    cy.wrap($button).should('be.disabled')
  })
})

Then('I should see a tooltip saying {string}', (tooltipText: string) => {
  cy.get('[data-testid^="join-table-"]').first().should('have.attr', 'title', tooltipText)
})

Then('the login modal should appear', () => {
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
})

Then('I should be prompted to enter my nickname', () => {
  cy.get('[data-testid="nickname-input"]').should('be.visible')
}) 