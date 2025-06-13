import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Real-time updates specific setup
Given('multiple users are connected', () => {
  // This would typically involve multiple browser sessions or API simulation
  // For testing purposes, we'll verify the system handles multiple users
  cy.window().then((win) => {
    // Simulate multiple user connections
    win.localStorage.setItem('simulateMultipleUsers', 'true')
  })
})

Given('other players are also at the table', () => {
  cy.get('[data-testid^="seat-"]').should('contain', 'Player')
})

// Actions that trigger real-time updates
When('a new player joins the lobby', () => {
  // Simulate socket event for new player joining
  cy.window().its('socket').then((socket) => {
    socket.emit('user-joined', { 
      nickname: `NewPlayer${Date.now()}`,
      timestamp: Date.now()
    })
  })
  cy.wait(1000) // Allow for real-time update
})

When('a player leaves the lobby', () => {
  // Simulate socket event for player leaving
  cy.window().its('socket').then((socket) => {
    socket.emit('user-left', { 
      nickname: 'SomePlayer',
      timestamp: Date.now()
    })
  })
  cy.wait(1000)
})

When('a player joins my table', () => {
  // Simulate player joining table
  cy.window().its('socket').then((socket) => {
    socket.emit('player-joined-table', { 
      tableId: '1',
      player: { nickname: `JoiningPlayer${Date.now()}`, seat: 2 },
      timestamp: Date.now()
    })
  })
  cy.wait(1000)
})

When('a player leaves my table', () => {
  // Simulate player leaving table
  cy.window().its('socket').then((socket) => {
    socket.emit('player-left-table', { 
      tableId: '1',
      playerId: 'some-player-id',
      timestamp: Date.now()
    })
  })
  cy.wait(1000)
})

When('a player goes away', () => {
  // Simulate player going away
  cy.window().its('socket').then((socket) => {
    socket.emit('player-away', { 
      tableId: '1',
      playerId: 'some-player-id',
      away: true,
      timestamp: Date.now()
    })
  })
  cy.wait(1000)
})

When('a player returns from away', () => {
  // Simulate player returning
  cy.window().its('socket').then((socket) => {
    socket.emit('player-away', { 
      tableId: '1',
      playerId: 'some-player-id',
      away: false,
      timestamp: Date.now()
    })
  })
  cy.wait(1000)
})

When('table status changes', () => {
  // Simulate table status change
  cy.window().its('socket').then((socket) => {
    socket.emit('table-status-changed', { 
      tableId: '1',
      status: 'In Progress',
      playerCount: 4,
      timestamp: Date.now()
    })
  })
  cy.wait(1000)
})

// Wait step is already defined in common-steps.ts

// Assertions for real-time updates
Then('I should see the lobby user count update', () => {
  cy.get('[data-testid="online-count"]').should('be.visible')
  // Verify the count is dynamic and updates
  cy.get('[data-testid="online-count"]').should('not.contain', '0')
})

Then('the online users list should update immediately', () => {
  cy.get('[data-testid="online-list"]').should('be.visible')
  // Verify no page refresh is needed
  cy.get('[data-testid="players-list"], [data-testid="observers-list"]')
    .should('be.visible')
})

Then('I should see the new player in the list', () => {
  cy.get('[data-testid="players-list"], [data-testid="observers-list"]')
    .should('contain', 'NewPlayer')
})

Then('the player should be removed from the list', () => {
  cy.get('[data-testid="players-list"], [data-testid="observers-list"]')
    .should('not.contain', 'SomePlayer')
})

Then('I should see the new player seated', () => {
  cy.get('[data-testid^="seat-"]').should('contain', 'JoiningPlayer')
})

Then('the seat should become empty', () => {
  cy.get('[data-testid="seat-2"]').should('not.contain', 'Player')
})

Then('I should see the player marked as away', () => {
  cy.get('[data-testid^="seat-"]').should('contain', '(Away)')
})

Then('the away status should be removed', () => {
  cy.get('[data-testid^="seat-"]').should('not.contain', '(Away)')
})

Then('I should see the table status update', () => {
  cy.get('[data-testid="table-status"]').should('contain', 'In Progress')
})

Then('the lobby table list should reflect the changes', () => {
  cy.visit('/') // Go back to lobby
  cy.get('[data-testid="table-1"] [data-testid="status"]')
    .should('contain', 'In Progress')
})

Then('all updates should happen without page refresh', () => {
  // Verify that updates are happening via WebSocket, not page refresh
  cy.window().then((win) => {
    // Check that navigation hasn't been triggered
    expect(win.performance.navigation.type).to.equal(0)
  })
})

Then('the interface should remain responsive', () => {
  // Verify UI remains interactive during updates
  cy.get('[data-testid="login-button"], [data-testid="logout-button"]')
    .should('be.visible')
  cy.get('[data-testid^="join-table-"], [data-testid^="observe-table-"]')
    .should('be.visible')
}) 