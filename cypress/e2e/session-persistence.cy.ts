/// <reference types="cypress" />

describe('Session Persistence', () => {
  beforeEach(() => {
    // Visit the site before each test
    cy.visit('/');
  });

  it('persists player nickname after page reload', () => {
    // Join game with a nickname
    cy.joinGame('PersistenceTest');
    
    // Verify player joined successfully
    cy.contains('PersistenceTest').should('be.visible');
    
    // Reload the page
    cy.reload();
    
    // Verify the nickname is still there after reload
    cy.contains('PersistenceTest').should('be.visible');
  });

  it('persists player seat after page reload', () => {
    // Join game and take a seat
    cy.joinGame('SeatTest');
    
    // Find an available seat and take it
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Verify player is seated
    cy.get('.player-seat').should('exist');
    cy.contains('SeatTest').should('be.visible');
    
    // Reload the page
    cy.reload();
    
    // Verify player is still seated after reload
    cy.get('.player-seat').should('exist');
    cy.contains('SeatTest').should('be.visible');
  });

  it('persists player away status after page reload', () => {
    // Join game and take a seat
    cy.joinGame('AwayTest');
    
    // Find an available seat and take it
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Set status to away
    cy.setPlayerStatus('away');
    
    // Verify away status
    cy.get('.status-icon').should('be.visible');
    
    // Reload the page
    cy.reload();
    
    // Verify away status persists
    cy.get('.status-icon').should('be.visible');
  });

  it('persists player chips after page reload', () => {
    // Join game and take a seat
    cy.joinGame('ChipsTest');
    
    // Find an available seat and take it
    cy.get('.seat-button').first().click();
    cy.contains('button', 'Yes').click();
    
    // Verify initial chip count
    cy.contains('Chips: 1000').should('be.visible');
    
    // Record the chip count
    cy.get('.player-chips').invoke('text').then((chipText) => {
      const initialChips = parseInt(chipText.replace(/[^0-9]/g, ''));
      
      // Reload the page
      cy.reload();
      
      // Verify chip count is the same after reload
      cy.get('.player-chips').invoke('text').then((newChipText) => {
        const newChips = parseInt(newChipText.replace(/[^0-9]/g, ''));
        expect(newChips).to.equal(initialChips);
      });
    });
  });

  it('persists observer status after page reload', () => {
    // Join game as observer
    cy.joinGame('ObserverTest');
    
    // Verify player is in observer list
    cy.get('.online-list').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('ObserverTest').should('be.visible');
    });
    
    // Reload the page
    cy.reload();
    
    // Verify player is still in observer list
    cy.get('.online-list').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains('ObserverTest').should('be.visible');
    });
  });

  it('persists chat messages after page reload', () => {
    // Join game
    cy.joinGame('ChatTest');
    
    // Send a chat message
    cy.get('.chat-input').type('Test persistence message');
    cy.get('button').contains('Send').click();
    
    // Verify message is visible
    cy.contains('Test persistence message').should('be.visible');
    
    // Reload the page
    cy.reload();
    
    // Verify message is still visible
    cy.contains('Test persistence message').should('be.visible');
  });
}); 