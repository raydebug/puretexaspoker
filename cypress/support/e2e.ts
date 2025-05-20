/// <reference types="cypress" />

// Import testing library
import '@testing-library/cypress/add-commands';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor'

// Import custom commands
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log the error for debugging
  console.error('Uncaught exception:', err);
  
  // Only fail the test if it's a critical error
  if (err.message.includes('Critical error')) {
    return true;
  }
  
  return false;
});

// Handle test failures with detailed logging
Cypress.on('fail', (error, runnable) => {
  console.error('Test failed:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    test: runnable.title
  });
  
  // Add screenshot on failure
  cy.screenshot(`failure-${runnable.title}`);
  
  throw error;
});

// DO NOT create sessions here - they will be created in the beforeEach hooks of each test file
// This avoids the "Cannot call cy.session() outside a running test" error 

// Custom commands for game interactions
Cypress.Commands.add('joinGame', (nickname: string) => {
  cy.visit('/')
  cy.get('[data-testid="nickname-input"]').type(nickname)
  cy.get('[data-testid="join-button"]').click()
  // Wait for navigation to complete
  cy.url().should('include', '/game/1')
})

Cypress.Commands.add('setPlayerStatus', (status: 'away' | 'back') => {
  if (status === 'away') {
    cy.get('[data-testid="player-menu"]').click()
    cy.get('[data-testid="away-button"]').click()
    cy.get('[data-testid="status-icon"]').should('be.visible')
  } else {
    cy.get('[data-testid="player-menu"]').click()
    cy.get('[data-testid="back-button"]').click()
    cy.get('[data-testid="status-icon"]').should('not.exist')
  }
})

Cypress.Commands.add('openSeatMenu', () => {
  cy.get('[data-testid="player-seat"]').first().click()
  cy.get('[data-testid="seat-menu"]').should('be.visible')
})

Cypress.Commands.add('placeBet', (amount: number) => {
  cy.get('[data-testid="bet-input"]').type(amount.toString())
  cy.get('[data-testid="bet-button"]').click()
  cy.get('[data-testid="current-bet"]').should('contain', amount.toString())
})

// New custom commands for error handling and network testing
Cypress.Commands.add('simulateNetworkError', () => {
  cy.intercept('**/*', {
    forceNetworkError: true
  })
})

Cypress.Commands.add('simulateSlowNetwork', (delay: number) => {
  cy.intercept('**/*', (req) => {
    req.on('response', (res) => {
      res.setDelay(delay)
    })
  })
})

Cypress.Commands.add('verifyGameState', (expectedState: any) => {
  cy.get('[data-testid="game-state"]').should('contain', expectedState)
})

// Type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      joinGame(nickname: string): Chainable<void>
      setPlayerStatus(status: 'away' | 'back'): Chainable<void>
      openSeatMenu(): Chainable<void>
      placeBet(amount: number): Chainable<void>
      simulateNetworkError(): void
      simulateSlowNetwork(delay: number): void
      verifyGameState(expectedState: any): void
      waitForGameStart(): Chainable<void>
      verifyPlayerState(nickname: string, chips: number): Chainable<void>
      verifyGamePhase(phase: string): Chainable<void>
      loginPlayer(nickname: string, chips: number): void
      joinTable(tableName: string): void
      checkHand(): void
      foldHand(): void
      verifyPlayerState(nickname: string, chips: number): void
      waitForGameStart(): void
      verifyGamePhase(phase: string): void
    }
  }
}

// Hide fetch/XHR requests from command log
const app = window.top;
if (app) {
  app.document.addEventListener('DOMContentLoaded', () => {
    const style = app.document.createElement('style');
    style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
    app.document.head.appendChild(style);
  });
}

// Prevent TypeScript from reading file as legacy script
export {}; 