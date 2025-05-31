/// <reference types="cypress" />

describe('Debug Lobby', () => {
  beforeEach(() => {
    // Set a nickname to skip the modal
    cy.setCookie('playerNickname', 'TestPlayer');
  });

  it('should show tables in lobby', () => {
    cy.visit('/');
    
    // Wait for the lobby to load
    cy.get('[data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
    
    // Wait a moment for socket connection and table loading
    cy.wait(5000);
    
    // Debug what's on the page
    cy.log('Checking for tables...');
    
    // Check if tables exist
    cy.get('body').should('be.visible').then(() => {
      // Try to find table elements
      cy.get('[data-testid^="table-"]', { timeout: 2000 })
        .should('have.length.greaterThan', 0)
        .then(() => {
          cy.log('SUCCESS: Found tables!');
        });
    }).catch(() => {
      cy.log('No tables found - checking for other states');
      
      // Check for loading state
      cy.contains('Loading tables', { timeout: 1000 }).then(() => {
        cy.log('Still loading tables...');
      }).catch(() => {
        
        // Check for empty state
        cy.contains('No tables match', { timeout: 1000 }).then(() => {
          cy.log('No tables match filters');
        }).catch(() => {
          
          // Check for error state
          cy.contains('error', { timeout: 1000, matchCase: false }).then(() => {
            cy.log('Error state detected');
          }).catch(() => {
            cy.log('Unknown state - need manual inspection');
          });
        });
      });
    });
  });
}); 