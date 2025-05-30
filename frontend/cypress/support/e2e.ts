// Import commands.js using ES2015 syntax:
import './commands'
import '@testing-library/cypress/add-commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

declare global {
  namespace Cypress {
    interface Chainable {
      // Add custom commands here
      login(email: string, password: string): Chainable<void>
      // Example: cy.login('user@email.com', 'password123')
      
      // Add Testing Library Commands
      findByText(text: string | RegExp): Chainable<Element>
      findByRole(role: string, options?: any): Chainable<Element>
      findByTestId(testId: string): Chainable<Element>
      joinGame(nickname: string): void
      setPlayerStatus(status: 'away' | 'back'): void
      openSeatMenu(): void
      placeBet(amount: number): void
      verifyPlayerState(nickname: string, chips: number): void
      waitForGameStart(): void
      verifyGamePhase(phase: string): void
      loginPlayer(nickname: string, chips: number): void
      joinTable(tableName: string): void
      checkHand(): void
      foldHand(): void
      openNewWindow(): Chainable<Window>
      switchToWindow(window: Window): void
      waitForGameState(): void
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

// Prevent TypeScript errors when accessing the "cy" object
declare global {
  namespace Cypress {
    interface Chainable {
      // Add custom commands types here
    }
  }
}

beforeEach(() => {
  // Remove webpack dev server overlay before each test
  cy.on('window:before:load', (win) => {
    cy.stub(win.console, 'error').as('consoleError');
    const style = win.document.createElement('style');
    style.innerHTML = '#webpack-dev-server-client-overlay { display: none !important; }';
    win.document.head.appendChild(style);
  });
});

// Add custom commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.get('[data-testid="email-input"]').should('be.visible').type(email);
  cy.get('[data-testid="password-input"]').should('be.visible').type(password);
  cy.get('[data-testid="login-button"]').should('be.visible').click();
});

Cypress.Commands.add('joinGame', (nickname: string) => {
  // Set nickname if modal is present
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="nickname-modal"]').length > 0) {
      cy.get('[data-testid="nickname-input"]').should('be.visible').clear().type(nickname);
      cy.get('[data-testid="join-button"]').should('be.enabled').click();
      // Wait for modal to disappear
      cy.get('[data-testid="nickname-modal"]').should('not.exist');
    }
  });
  
  // Wait for lobby to load and tables to appear
  cy.get('[data-testid="game-container"]').should('exist');
  
  // Look for any available table and click it
  cy.get('[data-table-id]').first().should('be.visible').click();
  
  // The dialog will appear - enter nickname if needed and submit
  cy.get('input[type="text"]').should('be.visible').then(($input) => {
    if ($input.val() !== nickname) {
      cy.wrap($input).clear().type(nickname);
    }
  });
  
  // Click the "Join Table" button in the dialog
  cy.contains('button', 'Join Table').should('be.visible').click();
  
  // Wait for navigation to /join-table page
  cy.url({ timeout: 10000 }).should('include', '/join-table');
  
  // Click the "Join Table" button on the join-table page
  cy.contains('button', 'Join Table').should('be.visible').click();
  
  // Wait for navigation to game page
  cy.url({ timeout: 10000 }).should('include', '/game/');
  
  // Wait for player to appear in the game (check for user name or online list)
  cy.get('[data-testid="user-name"]', { timeout: 10000 }).should('contain', nickname);
});

Cypress.Commands.add('setPlayerStatus', (status: 'away' | 'back') => {
  cy.get('[data-testid="player-seat"]').first().should('be.visible').click();
  if (status === 'away') {
    cy.get('[data-testid="leave-midway-button"]').should('be.visible').click();
    cy.get('[data-testid="away-status"]').should('be.visible');
  } else {
    cy.get('[data-testid="come-back-button"]').should('be.visible').click();
    cy.get('[data-testid="away-status"]').should('not.exist');
  }
});

Cypress.Commands.add('placeBet', (amount: number) => {
  cy.get('[data-testid="bet-button"]').should('be.enabled').click();
  cy.get('[data-testid="bet-amount-input"]').should('be.visible').clear().type(amount.toString());
  cy.get('[data-testid="confirm-bet-button"]').should('be.enabled').click();
  // Wait for bet confirmation
  cy.get('[data-testid="bet-confirmation"]').should('exist');
});

Cypress.Commands.add('verifyPlayerState', (nickname: string, chips: number) => {
  cy.get(`[data-testid="player-${nickname}"]`).within(() => {
    cy.get('[data-testid="player-chips"]').should('contain', chips);
  });
});

Cypress.Commands.add('waitForGameStart', () => {
  cy.get('[data-testid="game-phase"]', { timeout: 10000 }).should('contain', 'preflop');
});

Cypress.Commands.add('verifyGamePhase', (phase: string) => {
  cy.get('[data-testid="game-phase"]', { timeout: 5000 }).should('contain', phase);
});

Cypress.Commands.add('openNewWindow', () => {
  return cy.window().then((win: Cypress.AUTWindow) => {
    const newWindow = win.open('http://localhost:3000') as Window;
    if (newWindow) {
      return cy.wrap(newWindow) as unknown as Cypress.Chainable<Window>;
    }
    throw new Error('Failed to open new window');
  });
});

Cypress.Commands.add('switchToWindow', (window: Window) => {
  return cy.wrap(window).its('document').should('exist');
});

Cypress.Commands.add('waitForGameState', () => {
  cy.get('[data-testid="game-container"]', { timeout: 10000 }).should('exist');
});

Cypress.Commands.add('loginPlayer', (nickname: string, chips: number) => {
  cy.joinGame(nickname);
  cy.verifyPlayerState(nickname, chips);
});

Cypress.Commands.add('joinTable', (tableName: string) => {
  cy.get(`[data-testid="table-${tableName}"]`).should('be.visible').click();
  cy.get('[data-testid="join-table-button"]').should('be.enabled').click();
});

Cypress.Commands.add('checkHand', () => {
  cy.get('[data-testid="check-button"]').should('be.enabled').click();
});

Cypress.Commands.add('foldHand', () => {
  cy.get('[data-testid="fold-button"]').should('be.enabled').click();
});

export {}; 