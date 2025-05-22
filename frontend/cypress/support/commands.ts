/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      login(username: string): Chainable<void>
      joinGame(): Chainable<void>
      placeBet(amount: number): Chainable<void>
      fold(): Chainable<void>
      checkHand(): Chainable<void>
      waitForGameState(): Chainable<void>
      joinTable(tableName: string): Chainable<void>
      loginPlayer(name: string, chips: number): Chainable<void>
      simulateNetworkError(): Chainable<void>
      simulateSlowNetwork(): Chainable<void>
      verifyGameState(expectedState: any): Chainable<void>
    }
  }
}

// Login command
Cypress.Commands.add('login', (username: string) => {
  cy.log('Attempting to login with username:', username)
  cy.get('[data-testid="nickname-input"]').type(username)
  cy.get('[data-testid="join-button"]').click()
})

// Join game command
Cypress.Commands.add('joinGame', () => {
  cy.log('Attempting to join game')
  cy.get('[data-testid="join-button"]').click()
})

// Join table command
Cypress.Commands.add('joinTable', (tableName: string) => {
  cy.log('Attempting to join table:', tableName)
  cy.get(`[data-table-id="${tableName}"]`).click()
  cy.get('[data-testid="join-table-button"]').click()
  cy.get('[data-testid="game-table"]').should('be.visible')
})

// Login player command with chips
Cypress.Commands.add('loginPlayer', (name: string, chips: number) => {
  cy.log(`Attempting to login player: ${name} with chips: ${chips}`)
  // First, visit the join page
  cy.visit('/')
  
  // Enter nickname and join
  cy.get('[data-testid="nickname-input"]').type(name)
  cy.get('[data-testid="join-button"]').click()
  
  // Wait for lobby page to load
  cy.url().should('include', '/lobby')
  cy.get('[data-testid="game-container"]').should('be.visible')
  cy.log('Successfully logged in and reached lobby')
})

// Place bet command
Cypress.Commands.add('placeBet', (amount: number) => {
  cy.log(`Attempting to place bet: ${amount}`)
  cy.get('[data-testid="bet-input"]').type(amount.toString())
  cy.get('[data-testid="bet-button"]').click()
})

// Fold command
Cypress.Commands.add('fold', () => {
  cy.log('Attempting to fold')
  cy.get('[data-testid="fold-button"]').click()
})

// Check hand command
Cypress.Commands.add('checkHand', () => {
  cy.log('Attempting to check hand')
  cy.get('[data-testid="check-button"]').click()
})

// Wait for game state command
Cypress.Commands.add('waitForGameState', () => {
  cy.log('Waiting for game state')
  cy.get('[data-testid="game-state"]', { timeout: 10000 }).should('be.visible')
})

// Simulate network error command
Cypress.Commands.add('simulateNetworkError', () => {
  cy.log('Simulating network error')
  cy.intercept('**', (req) => {
    req.destroy()
  })
})

// Simulate slow network command
Cypress.Commands.add('simulateSlowNetwork', () => {
  cy.log('Simulating slow network')
  cy.intercept('**', (req) => {
    req.on('response', (res) => {
      // Delay the response by 2 seconds
      res.setDelay(2000)
    })
  })
})

// Verify game state command
Cypress.Commands.add('verifyGameState', (expectedState: any) => {
  cy.log('Verifying game state')
  cy.window().its('store').invoke('getState').should((state) => {
    expect(state.game).to.deep.include(expectedState)
  })
})

export {}; 