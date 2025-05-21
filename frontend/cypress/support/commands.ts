/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject = any> {
    login(username: string): Chainable<JQuery<HTMLElement>>
    joinGame(): Chainable<JQuery<HTMLElement>>
    placeBet(amount: number): Chainable<JQuery<HTMLElement>>
    fold(): Chainable<JQuery<HTMLElement>>
    checkHand(): Chainable<JQuery<HTMLElement>>
    waitForGameState(): Chainable<JQuery<HTMLElement>>
    openNewWindow(): Chainable<Window>
    switchToWindow(window: Window): Chainable<Window>
  }
}

// Custom commands for the poker game
Cypress.Commands.add('login', (username: string) => {
  cy.visit('/')
  cy.get('[data-testid="username-input"]').should('be.visible').type(username)
  cy.get('[data-testid="login-button"]').should('be.visible').click()
  return cy.get('[data-testid="game-lobby"]').should('be.visible')
})

Cypress.Commands.add('joinGame', () => {
  cy.get('[data-testid="join-game-button"]').should('be.visible').click()
  return cy.get('[data-testid="game-table"]').should('be.visible')
})

Cypress.Commands.add('placeBet', (amount: number) => {
  cy.get('[data-testid="bet-amount-input"]').should('be.visible').type(amount.toString())
  cy.get('[data-testid="place-bet-button"]').should('be.visible').click()
  return cy.get('[data-testid="bet-confirmation"]').should('be.visible')
})

Cypress.Commands.add('fold', () => {
  cy.get('[data-testid="fold-button"]').should('be.visible').click()
  return cy.get('[data-testid="fold-confirmation"]').should('be.visible')
})

Cypress.Commands.add('checkHand', () => {
  cy.get('[data-testid="check-button"]').should('be.visible').click()
  return cy.get('[data-testid="hand-result"]').should('be.visible')
})

Cypress.Commands.add('waitForGameState', () => {
  return cy.window().its('gameState').should('exist')
})

Cypress.Commands.add('openNewWindow', () => {
  return cy.window().then((win) => {
    const newWindow = win.open('', '_blank')
    return cy.wrap(newWindow)
  })
})

Cypress.Commands.add('switchToWindow', (window: Window) => {
  return cy.wrap(window).then((win) => {
    cy.visit('/', { baseUrl: 'http://localhost:3000' })
    return cy.wrap(win)
  })
}) 