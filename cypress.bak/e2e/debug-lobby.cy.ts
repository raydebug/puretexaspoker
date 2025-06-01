/// <reference types="cypress" />

describe('Debug Lobby', () => {
  beforeEach(() => {
    // Set a nickname cookie to skip the modal
    cy.setCookie('playerNickname', 'TestPlayer');
  });

  it('should show tables in lobby', () => {
    cy.visit('/');
    
    // Wait for the lobby to load
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    
    // Wait a moment for socket connection and table loading
    cy.wait(5000);
    
    // Check if tables exist
    cy.get('[data-testid^="table-"]').should('have.length.greaterThan', 0);
    
    cy.log('SUCCESS: Tables are loading correctly!');
  });

  it('should open join dialog when clicking a table', () => {
    cy.visit('/');
    
    // Wait for the lobby to load
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    
    // Wait for tables to load
    cy.get('[data-testid^="table-"]', { timeout: 10000 }).should('have.length.greaterThan', 0);
    
    // Click on the first table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Check if join dialog appears
    cy.get('[data-testid="nickname-input"]').should('be.visible');
    cy.get('[data-testid="buy-in-input"]').should('be.visible');
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible');
    
    // Fill in the form
    cy.get('[data-testid="nickname-input"]').clear().type('TestPlayer');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    
    // Wait for form to update
    cy.wait(1000);
    
    // Check if button is enabled
    cy.get('[data-testid="confirm-buy-in"]').should('not.be.disabled');
    
    cy.log('SUCCESS: Join dialog is working correctly!');
  });

  it('should navigate to game page when submitting join dialog', () => {
    cy.visit('/');
    
    // Wait for the lobby to load
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    
    // Wait for tables to load
    cy.get('[data-testid^="table-"]', { timeout: 10000 }).should('have.length.greaterThan', 0);
    
    // Click on the first table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Check if join dialog appears
    cy.get('[data-testid="nickname-input"]').should('be.visible');
    
    // In test mode, the button should work regardless of input values
    // Just click the button directly
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });
    
    // Check if we navigate to game page (the flow is: lobby -> join dialog -> join-table -> auto-join -> game)
    cy.url({ timeout: 15000 }).should('include', '/game/');
    
    cy.log('SUCCESS: Navigation to game page works!');
  });

  it('should show what is in the game page after navigation', () => {
    cy.visit('/');
    
    // Wait for the lobby to load
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    
    // Wait for tables to load
    cy.get('[data-testid^="table-"]', { timeout: 10000 }).should('have.length.greaterThan', 0);
    
    // Click on the first table
    cy.get('[data-testid^="table-"]').first().click();
    
    // Check if join dialog appears
    cy.get('[data-testid="nickname-input"]').should('be.visible');
    
    // Click the button to navigate
    cy.get('[data-testid="confirm-buy-in"]').should('be.visible').click({ force: true });
    
    // Check if we navigate to game page
    cy.url({ timeout: 15000 }).should('include', '/game/');
    
    // Wait for game container to appear
    cy.get('[data-testid="game-container"]', { timeout: 15000 }).should('be.visible');
    
    // Debug: Check what test IDs are actually present
    cy.get('[data-testid]').should('exist').then(() => {
      cy.log('Found elements with test IDs');
    });
    
    // Try to find specific elements we expect
    cy.get('body').should('contain.text', 'game').then(() => {
      cy.log('Page contains game-related content');
    });
    
    cy.log('SUCCESS: Reached game page and logged content');
  });
}); 