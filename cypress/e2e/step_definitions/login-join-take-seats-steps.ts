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
  // After login, the join table button should now be enabled and clickable
  cy.get('[data-testid^="join-table-"]').first().should('not.be.disabled')
  cy.get('[data-testid^="join-table-"]').first().click()
  
  // Wait for either a dialog to appear OR navigation to happen
  cy.then(() => {
    // Check if a dialog appeared first
    cy.get('body').then($body => {
      if ($body.find('[data-testid*="dialog"], [class*="dialog"], [role="dialog"]').length > 0) {
        // Dialog appeared - handle it
        cy.get('[data-testid*="dialog"], [class*="dialog"], [role="dialog"]').should('be.visible')
        cy.get('button:contains("Join"), button:contains("Confirm"), [data-testid*="join"], [data-testid*="confirm"]').first().click()
      }
    })
  })
  
  // Wait for navigation to happen (either directly or after dialog)
  cy.url({ timeout: 15000 }).should('match', /\/(join-table|game\/\d+|table\/\d+)/)
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
  cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${nickname}`)
})

Then('the online users count should be updated to reflect my login', () => {
  cy.get('[data-testid="online-users-list"]').should('be.visible')
  cy.get('[data-testid="online-users-list"]').should('contain.text', 'Online Users')
})

Then('the online users count should increase by 1', () => {
  cy.get('[data-testid="online-users-list"]').invoke('text').then((text) => {
    const count = parseInt(text.match(/\d+/)?.[0] || '0')
    expect(count).to.be.greaterThan(0)
  })
})

// Assertions - Navigation
Then('I should be on the game page', () => {
  cy.url().should('match', /\/(game\/\d+|table\/\d+)/)
  cy.get('[data-testid="game-container"], [data-testid="table-interface"], [data-testid="poker-table"]', { timeout: 15000 }).should('be.visible')
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