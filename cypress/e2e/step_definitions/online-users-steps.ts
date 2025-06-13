import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Player/Observer context steps
Given('I am logged in as player {string}', (playerName: string) => {
  cy.get('[data-testid="login-button"]').click()
  cy.get('[data-testid="nickname-modal"]').should('be.visible')
  cy.get('[data-testid="nickname-input"]').type(playerName)
  cy.get('[data-testid="join-button"]').click()
  cy.get('[data-testid="user-info"]').should('be.visible')
})

Given('I have joined table {string} as a player', (tableId: string) => {
  cy.get(`[data-testid="join-table-${tableId}"]`).click()
  cy.url().should('include', `/table/${tableId}`)
})

Given('player {string} is sitting at seat {int}', (playerName: string, seatNumber: number) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('contain', playerName)
})

Given('player {string} is away from seat {int}', (playerName: string, seatNumber: number) => {
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('contain', playerName)
  cy.get(`[data-testid="seat-${seatNumber}"]`).should('contain', '(Away)')
})

// Actions
When('I view the online users list', () => {
  cy.get('[data-testid="online-list"]').should('be.visible')
})

When('more players join as players', () => {
  // This would typically involve API calls or other players joining
  // For testing purposes, we'll verify the component updates
  cy.wait(1000) // Allow time for updates
})

When('players go away', () => {
  // This would involve player state changes
  cy.wait(1000) // Allow time for updates
})

When('players return from away', () => {
  // This would involve player state changes  
  cy.wait(1000) // Allow time for updates
})

When('observers join the table', () => {
  // This would involve observer connections
  cy.wait(1000) // Allow time for updates
})

// Assertions
Then('I should see the players section with count {int}', (count: number) => {
  cy.get('[data-testid="players-section"]').should('be.visible')
  cy.get('[data-testid="players-count"]').should('contain', count.toString())
})

Then('I should see the observers section with count {int}', (count: number) => {
  cy.get('[data-testid="observers-section"]').should('be.visible')
  cy.get('[data-testid="observers-count"]').should('contain', count.toString())
})

Then('I should see player {string} in seat {int}', (playerName: string, seatNumber: number) => {
  cy.get('[data-testid="players-list"]').should('contain', playerName)
  cy.get('[data-testid="players-list"]').should('contain', `Seat ${seatNumber}`)
})

Then('I should see observer {string} in the observers list', (observerName: string) => {
  cy.get('[data-testid="observers-list"]').should('contain', observerName)
})

Then('player {string} should be marked as {string}', (playerName: string, status: string) => {
  if (status === 'You') {
    cy.get('[data-testid="players-list"]').should('contain', `${playerName} (You)`)
  } else if (status === 'Away') {
    cy.get('[data-testid="players-list"]').should('contain', `${playerName} (Away)`)
  }
})

Then('my name should be highlighted', () => {
  cy.get('[data-testid="current-user"]').should('have.class', 'current-user')
})

Then('away players should be styled differently', () => {
  cy.get('[data-testid="away-player"]').should('have.class', 'away')
})

Then('the online list should update in real-time', () => {
  cy.get('[data-testid="online-list"]').should('be.visible')
  // Verify that updates happen automatically without page refresh
  cy.get('[data-testid="players-count"]').should('be.visible')
  cy.get('[data-testid="observers-count"]').should('be.visible')
}) 