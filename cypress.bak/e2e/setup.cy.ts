/// <reference types="cypress" />

describe('Basic Setup', () => {
  beforeEach(() => {
    // Prevent Cypress from failing on uncaught exceptions
    Cypress.on('uncaught:exception', (err: Error) => {
      console.log('Uncaught exception:', err.message);
      return false;
    });

    // Remove webpack dev server overlay before each test
    cy.on('window:before:load', (win: Cypress.AUTWindow) => {
      console.log('Window before load');
      const style = win.document.createElement('style');
      style.innerHTML = '#webpack-dev-server-client-overlay { display: none !important; }';
      win.document.head.appendChild(style);
    });

    // Log network requests
    cy.intercept('*').as('allRequests');
    cy.get('@allRequests').then((interception) => {
      console.log('Request:', interception);
    });
  });

  beforeEach(() => {
    // Clear cookies before each test
    cy.clearCookies();
    console.log('Cookies cleared');
  });

  it('should show nickname modal when no nickname is set', () => {
    console.log('Starting test: should show nickname modal');
    cy.visit('/', { 
      failOnStatusCode: false,
      onBeforeLoad(win: Cypress.AUTWindow) {
        console.log('Before page load');
      },
      onLoad(win: Cypress.AUTWindow) {
        console.log('Page loaded');
      }
    });
    
    cy.window().then((win: Cypress.AUTWindow) => {
      console.log('Window loaded, document ready state:', win.document.readyState);
      console.log('Document body:', win.document.body.innerHTML);
    });

    cy.get('[data-testid="nickname-modal"]').should('exist').then(($el: JQuery) => {
      console.log('Nickname modal found:', $el.length > 0);
    });
    cy.get('[data-testid="nickname-input"]').should('exist');
  });

  it('should allow entering nickname in modal and show lobby', () => {
    cy.visit('/', { failOnStatusCode: false });
    cy.get('[data-testid="nickname-input"]').type('TestPlayer');
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    cy.get('[data-testid="game-container"]').should('exist');
    cy.contains('Welcome, TestPlayer');
  });

  it('should have the main game container if nickname cookie is set', () => {
    cy.setCookie('playerNickname', 'TestPlayer');
    cy.visit('/', { failOnStatusCode: false });
    cy.get('[data-testid="game-container"]').should('exist');
    cy.contains('Welcome, TestPlayer');
  });
}); 