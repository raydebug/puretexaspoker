describe('Table Join Error Handling', () => {
  beforeEach(() => {
    // Visit the lobby page before each test
    cy.visit('/lobby');
    cy.wait(3000); // Wait for initial load and tables to populate
  });

  it('should load lobby page and display tables', () => {
    // First verify the basic lobby functionality works
    cy.contains('Pure Texas Poker').should('be.visible');
    
    // Check if tables are loaded (either from socket or fallback)
    cy.get('[data-testid="table-row"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should handle "Already joined another table" error gracefully', () => {
    // Wait for tables to load first
    cy.get('[data-testid="table-row"]', { timeout: 10000 }).should('exist');
    
    // Mock the socket service to simulate the "already joined" error
    cy.window().then((win) => {
      // Override socketService methods to simulate error
      const mockSocketService = {
        connect: cy.stub(),
        joinTable: cy.stub(),
        onError: cy.stub().callsFake((callback) => {
          // Simulate the error callback being called
          setTimeout(() => {
            callback({ message: 'Already joined another table' });
          }, 1000);
        }),
        getCurrentPlayer: cy.stub().returns(null),
        getGameState: cy.stub().returns(null),
        getSocket: cy.stub().returns({ connected: false }),
        getConnectionAttempts: cy.stub().returns(1),
        leaveCurrentTable: cy.stub()
      };
      
      // Replace the socketService
      (win as any).socketService = mockSocketService;
    });

    // Try to join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="buy-in-input"]').type('100');
    cy.get('[data-testid="join-table-btn"]').click();

    // Should navigate to game page and show connecting state
    cy.url().should('include', '/game/');
    cy.contains('Connecting to table...').should('be.visible');

    // Wait for error to be processed
    cy.wait(2000);

    // Should show the specific error message for "already joined"
    cy.contains('You are already connected to another table').should('be.visible');
    cy.contains('Please refresh the page and try again').should('be.visible');
    cy.contains('or leave your current table first').should('be.visible');

    // Should show return to lobby button
    cy.get('[data-testid="back-button"]').should('be.visible');
    
    // Should NOT show loading spinner anymore
    cy.get('.spinner').should('not.exist');

    // Clicking back button should return to lobby
    cy.get('[data-testid="back-button"]').click();
    cy.url().should('include', '/lobby');
  });

  it('should handle socket connection failure gracefully', () => {
    // Wait for tables to load first
    cy.get('[data-testid="table-row"]', { timeout: 10000 }).should('exist');
    
    // Mock socket service to simulate connection failure
    cy.window().then((win) => {
      const mockSocketService = {
        connect: cy.stub(),
        joinTable: cy.stub(),
        onError: cy.stub().callsFake((callback) => {
          setTimeout(() => {
            callback({ message: 'Failed to connect to server' });
          }, 1000);
        }),
        getCurrentPlayer: cy.stub().returns(null),
        getGameState: cy.stub().returns(null),
        getSocket: cy.stub().returns({ connected: false }),
        getConnectionAttempts: cy.stub().returns(5),
        leaveCurrentTable: cy.stub()
      };
      
      (win as any).socketService = mockSocketService;
    });

    // Try to join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="buy-in-input"]').type('100');
    cy.get('[data-testid="join-table-btn"]').click();

    // Should show connecting state initially
    cy.contains('Connecting to table...').should('be.visible');
    
    // Wait for error
    cy.wait(2000);

    // Should show connection error
    cy.contains('Error connecting to table').should('be.visible');
    cy.contains('Failed to connect to server').should('be.visible');
    
    // Should show return button and not loading spinner
    cy.get('[data-testid="back-button"]').should('be.visible');
    cy.get('.spinner').should('not.exist');
  });

  it('should handle generic table errors', () => {
    // Wait for tables to load first
    cy.get('[data-testid="table-row"]', { timeout: 10000 }).should('exist');
    
    // Mock socket service to simulate generic error
    cy.window().then((win) => {
      const mockSocketService = {
        connect: cy.stub(),
        joinTable: cy.stub(),
        onError: cy.stub().callsFake((callback) => {
          setTimeout(() => {
            callback({ message: 'Table is full' });
          }, 1000);
        }),
        getCurrentPlayer: cy.stub().returns(null),
        getGameState: cy.stub().returns(null),
        getSocket: cy.stub().returns({ connected: true }),
        getConnectionAttempts: cy.stub().returns(1),
        leaveCurrentTable: cy.stub()
      };
      
      (win as any).socketService = mockSocketService;
    });

    // Try to join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="buy-in-input"]').type('100');
    cy.get('[data-testid="join-table-btn"]').click();

    // Wait for error
    cy.wait(2000);

    // Should show the generic error message
    cy.contains('Error connecting to table').should('be.visible');
    cy.contains('Table is full').should('be.visible');
    
    // Should show return option
    cy.get('[data-testid="back-button"]').should('be.visible');
    cy.get('.spinner').should('not.exist');
  });
}); 