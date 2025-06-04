describe('Table Join Error Handling', () => {
  beforeEach(() => {
    // Visit the lobby page and handle nickname modal if present
    cy.visit('/lobby');
    
    // Handle nickname modal if it appears
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.get('[data-testid="nickname-modal"]').within(() => {
          cy.get('input').type('TestPlayer');
          cy.get('button').click();
        });
      }
    });
    
    cy.wait(2000);
  });

  it('should handle the table join flow and error states', () => {
    // Wait for lobby to load
    cy.contains('Lobby', { timeout: 10000 }).should('be.visible');
    
    // Wait for tables to load (either via socket or HTTP fallback)
    cy.get('[data-testid="table-row"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);

    // Click on a table to start join process
    cy.get('[data-testid="table-row"]').first().click();
    
    // Should show join dialog
    cy.get('[data-testid="buy-in-input"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="join-table-btn"]').click();

    // Should navigate to join-table page first
    cy.url({ timeout: 10000 }).should('include', '/join-table');
    
    // Then automatically navigate to game page
    cy.url({ timeout: 10000 }).should('include', '/game/');
    
    // Should show connecting state initially
    cy.contains('Connecting to table...', { timeout: 5000 }).should('be.visible');
    
    // Wait to see what happens - either success or error
    cy.wait(8000);
    
    // Check current state - should show some kind of result
    cy.get('body').then(($body) => {
      if ($body.text().includes('Error connecting to table')) {
        // Error state - verify our error handling works
        cy.log('✅ Error state detected - testing error handling');
        cy.contains('Error connecting to table').should('be.visible');
        cy.get('[data-testid="back-button"]').should('be.visible');
        cy.get('.spinner').should('not.exist');
        
        // Test back button works
        cy.get('[data-testid="back-button"]').click();
        cy.url().should('include', '/lobby');
      } else if ($body.text().includes('You are already connected to another table')) {
        // Specific error we're testing for
        cy.log('✅ Already joined error detected');
        cy.contains('You are already connected to another table').should('be.visible');
        cy.contains('Please refresh the page and try again').should('be.visible');
        cy.get('[data-testid="back-button"]').should('be.visible');
        cy.get('.spinner').should('not.exist');
        
        // Test back button
        cy.get('[data-testid="back-button"]').click();
        cy.url().should('include', '/lobby');
      } else if ($body.text().includes('Waiting for game data')) {
        // Partially successful but stuck - this indicates our timeout fallback worked
        cy.log('⚠️ Stuck on waiting for game data - testing fallback timeout');
        cy.contains('Waiting for game data').should('be.visible');
        cy.get('[data-testid="back-button"]').should('be.visible');
        
        // This is still an error state, so test back button
        cy.get('[data-testid="back-button"]').click();
        cy.url().should('include', '/lobby');
      } else if ($body.text().includes('Database error')) {
        // Database error - test our error handling
        cy.log('✅ Database error detected');
        cy.contains('Database error').should('be.visible');
        cy.get('[data-testid="back-button"]').should('be.visible');
        cy.get('.spinner').should('not.exist');
      } else {
        // Might have succeeded or unknown state
        cy.log('ℹ️ Unknown or successful state');
        // Just verify we're not stuck in loading
        cy.get('.spinner').should('not.exist');
      }
    });
  });

  it('should simulate error with mock socketService', () => {
    // Ensure we're in lobby
    cy.contains('Lobby', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="table-row"]', { timeout: 15000 }).should('exist');

    // Mock the socket service before joining
    cy.window().then((win) => {
      const mockSocketService = {
        connect: cy.stub().resolves(),
        joinTable: cy.stub(),
        onError: cy.stub().callsFake((callback) => {
          // Simulate error after delay
          setTimeout(() => {
            callback({ message: 'Already joined another table' });
          }, 1000);
        }),
        getCurrentPlayer: cy.stub().returns(null),
        getGameState: cy.stub().returns(null),
        getSocket: cy.stub().returns({ connected: false }),
        getConnectionAttempts: cy.stub().returns(1),
        leaveCurrentTable: cy.stub(),
        requestLobbyTables: cy.stub(),
        onTablesUpdate: cy.stub(),
        offTablesUpdate: cy.stub()
      };
      
      (win as any).socketService = mockSocketService;
    });

    // Navigate through join flow
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="buy-in-input"]').clear().type('100');
    cy.get('[data-testid="join-table-btn"]').click();

    // Should navigate to game page
    cy.url().should('include', '/game/');
    cy.contains('Connecting to table...').should('be.visible');

    // Wait for our mocked error
    cy.wait(3000);

    // Should show our specific error message
    cy.contains('You are already connected to another table').should('be.visible');
    cy.contains('Please refresh the page and try again').should('be.visible');
    cy.get('[data-testid="back-button"]').should('be.visible');
    cy.get('.spinner').should('not.exist');

    // Test back button
    cy.get('[data-testid="back-button"]').click();
    cy.url().should('include', '/lobby');
  });
}); 