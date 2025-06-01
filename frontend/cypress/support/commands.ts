/// <reference types="cypress" />

// ***********************************************
// Custom commands for the poker game
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      enterNickname(nickname: string): Chainable<Subject>
      joinGame(nickname: string): Chainable<Subject>
      setPlayerStatus(status: 'away' | 'back'): Chainable<Subject>
      openSeatMenu(): Chainable<Subject>
      placeBet(amount: number): Chainable<Subject>
      verifyPlayerState(nickname: string, chips: number): Chainable<Subject>
      verifyChips(nickname: string, expectedChips: number): Chainable<Subject>
      waitForGameStart(): Chainable<Subject>
      waitForPhase(phase: string): Chainable<Subject>
      verifyGamePhase(phase: string): Chainable<Subject>
      loginPlayer(nickname: string, chips: number): Chainable<Subject>
      joinTable(tableName: string): Chainable<Subject>
      checkHand(): Chainable<Subject>
      foldHand(): Chainable<Subject>
      simulateNetworkError(): Chainable<Subject>
      simulateSlowNetwork(): Chainable<Subject>
      verifyGameState(expectedState: any): Chainable<Subject>
      takeSeat(seatNumber: number): Chainable<Subject>
      waitForGameAction(action: string): Chainable<Subject>
      leaveTable(): Chainable<Subject>
      waitForPlayers(count: number): Chainable<Subject>
      waitForHandCompletion(): Chainable<Subject>
      openNewWindow(): Cypress.Chainable
      switchToWindow(window: Window): void
      waitForGameState(): void
      login(nickname: string): void
    }
  }
}

// Enter nickname command
Cypress.Commands.add('enterNickname', (nickname: string) => {
  cy.log('Entering nickname:', nickname)
  cy.get('[data-testid="nickname-input"]').type(nickname)
})

// Join game command
Cypress.Commands.add('joinGame', (nickname: string) => {
  cy.log('Joining game with nickname:', nickname)
  cy.visit('/')
  cy.get('[data-testid="nickname-input"]').type(nickname)
  cy.get('[data-testid="join-button"]').click()
})

// Set player status command
Cypress.Commands.add('setPlayerStatus', (status: 'away' | 'back') => {
  cy.log(`Setting player status to: ${status}`)
  cy.get('[data-testid="player-menu"]').click()
  cy.get(`[data-testid="${status}-button"]`).click()
})

// Open seat menu command
Cypress.Commands.add('openSeatMenu', () => {
  cy.log('Opening seat menu')
  cy.get('[data-testid="seat-menu-button"]').click()
})

// Place bet command
Cypress.Commands.add('placeBet', (amount: number) => {
  cy.log(`Placing bet: ${amount}`)
  cy.get('[data-testid="bet-input"]').type(amount.toString())
  cy.get('[data-testid="bet-button"]').click()
})

// Verify player state command
Cypress.Commands.add('verifyPlayerState', (nickname: string, chips: number) => {
  cy.log(`Verifying player state for ${nickname} with ${chips} chips`)
  cy.get(`[data-testid="player-${nickname}"]`).within(() => {
    cy.get('[data-testid="player-chips"]').should('contain', chips)
  })
})

// Verify chips command
Cypress.Commands.add('verifyChips', (nickname: string, expectedChips: number) => {
  cy.log(`Verifying chips for ${nickname}: expected ${expectedChips}`)
  cy.get(`[data-testid="player-${nickname}-chips"]`).should('contain', expectedChips)
})

// Wait for game start command
Cypress.Commands.add('waitForGameStart', () => {
  cy.log('Waiting for game to start')
  cy.get('[data-testid="game-status"]', { timeout: 10000 }).should('contain', 'active')
})

// Wait for phase command
Cypress.Commands.add('waitForPhase', (phase: string) => {
  cy.log(`Waiting for game phase: ${phase}`)
  cy.get('[data-testid="game-phase"]', { timeout: 10000 }).should('contain', phase)
})

// Verify game phase command
Cypress.Commands.add('verifyGamePhase', (phase: string) => {
  cy.log(`Verifying game phase: ${phase}`)
  cy.get('[data-testid="game-phase"]').should('contain', phase)
})

// Login player command
Cypress.Commands.add('loginPlayer', (nickname: string, chips: number) => {
  cy.log(`Logging in player ${nickname} with ${chips} chips`)
  cy.visit('/')
  cy.get('[data-testid="nickname-input"]', { timeout: 10000 }).should('be.visible').type(nickname)
  cy.get('[data-testid="join-button"]', { timeout: 10000 }).should('be.visible').click()
  cy.get('[data-testid="game-container"]', { timeout: 10000 }).should('be.visible')
  cy.contains(`Welcome, ${nickname}`, { timeout: 10000 }).should('be.visible')
})


// Check hand command
Cypress.Commands.add('checkHand', () => {
  cy.log('Checking hand')
  cy.get('[data-testid="check-button"]').click()
})

// Fold hand command
Cypress.Commands.add('foldHand', () => {
  cy.log('Folding hand')
  cy.get('[data-testid="fold-button"]').click()
})

// Take seat command
Cypress.Commands.add('takeSeat', (seatNumber: number) => {
  cy.log(`Taking seat ${seatNumber}`)
  cy.get(`[data-testid="seat-${seatNumber}"]`, { timeout: 10000 }).should('be.visible').click()
  cy.get('[data-testid="take-seat-button"]', { timeout: 10000 }).should('be.visible').click()
  cy.get(`[data-testid="player-seat-${seatNumber}"]`, { timeout: 10000 }).should('be.visible')
})

// Wait for game action command
Cypress.Commands.add('waitForGameAction', (action: string) => {
  cy.log(`Waiting for game action: ${action}`)
  cy.get('[data-testid="game-action"]', { timeout: 10000 }).should('contain', action)
})

// Leave table command
Cypress.Commands.add('leaveTable', () => {
  cy.log('Leaving table')
  cy.get('[data-testid="leave-table-button"]').click()
  cy.get('[data-testid="confirm-leave-button"]').click()
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
      res.setDelay(2000)
    })
  })
})

// Verify game state command
Cypress.Commands.add('verifyGameState', (expectedState: any) => {
  cy.log('Verifying game state')
  cy.window().then((win: any) => {
    cy.wrap(win.store.getState().game).should('deep.include', expectedState)
  })
})

// Wait for players command
Cypress.Commands.add('waitForPlayers', (count: number) => {
  cy.log(`Waiting for ${count} players`)
  cy.get('[data-testid="player-count"]', { timeout: 10000 }).should('contain', count)
})

// Wait for hand completion command
Cypress.Commands.add('waitForHandCompletion', () => {
  cy.log('Waiting for hand completion')
  cy.get('[data-testid="game-phase"]', { timeout: 10000 }).should('contain', 'showdown')
})

// Open new window command
Cypress.Commands.add('openNewWindow', () => {
  return cy.window().then((win: Window & typeof globalThis) => {
    const newWindow = win.open('http://localhost:3000');
    return newWindow;
  });
})

// Switch to window command
Cypress.Commands.add('switchToWindow', (window: Window) => {
  cy.wrap(window).as('newWindow')
  cy.get('@newWindow').then((win: any) => {
    win.focus()
  })
})

// Wait for game state command
Cypress.Commands.add('waitForGameState', () => {
  cy.get('[data-testid="game-container"]', { timeout: 10000 }).should('exist')
})

// Login command
Cypress.Commands.add('login', (nickname: string) => {
  cy.get('[data-testid="nickname-input"]').type(nickname)
  cy.get('[data-testid="join-button"]').click()
})

export {}; 