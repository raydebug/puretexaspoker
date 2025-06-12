describe('Socket Connection Persistence Bug Investigation', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(2000); // Wait for lobby to load
  });

  it('should maintain the same socket connection from observer join to seat taking', () => {
    // Set up a nickname
    const nickname = 'SocketTestUser';
    cy.window().then((win) => {
      win.localStorage.setItem('nickname', nickname);
    });

    // Get initial table list
    cy.get('[data-testid="table-card"]', { timeout: 10000 }).should('exist');
    
    // Click on the first available table
    cy.get('[data-testid="table-card"]').first().within(() => {
      cy.get('[data-testid="join-button"]').click();
    });

    // Set nickname in the join dialog
    cy.get('[data-testid="nickname-input"]', { timeout: 5000 }).should('exist');
    cy.get('[data-testid="nickname-input"]').clear().type(nickname);
    cy.get('[data-testid="join-table-button"]').click();

    // Wait for navigation to game page
    cy.url({ timeout: 10000 }).should('include', '/game/');

    // Verify we're in the game as observer
    cy.get('[data-testid="game-table"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="observer-list"]', { timeout: 5000 }).should('contain', nickname);

    // CRITICAL: Log the socket ID before attempting to take a seat
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService && socketService.socket) {
        const initialSocketId = socketService.socket.id;
        cy.log(`Initial Socket ID: ${initialSocketId}`);
        
        // Click on an empty seat to trigger takeSeat
        cy.get('[data-testid="seat-button-4"]:not(.occupied)', { timeout: 5000 }).click();
        
        // In the seat dialog, set buy-in and confirm
        cy.get('[data-testid="buyin-input"]', { timeout: 5000 }).clear().type('200');
        cy.get('[data-testid="confirm-seat-button"]').click();

        // CRITICAL: Check if socket ID changed after takeSeat
        cy.wait(3000).then(() => {
          const currentSocketId = socketService.socket ? socketService.socket.id : 'DISCONNECTED';
          cy.log(`Socket ID after takeSeat: ${currentSocketId}`);
          
          if (initialSocketId !== currentSocketId) {
            cy.log(`🚨 BUG CONFIRMED: Socket ID changed from ${initialSocketId} to ${currentSocketId}`);
          } else {
            cy.log(`✅ Socket ID remained the same: ${initialSocketId}`);
          }
        });
      }
    });

    // Wait for any seat error or success
    cy.wait(5000);
    
    // Take a screenshot to see the final state
    cy.screenshot('socket-connection-test-final-state');
  });

  it('should track socket connection state changes during the observer-to-player flow', () => {
    const nickname = 'ConnectionTracker';
    cy.window().then((win) => {
      win.localStorage.setItem('nickname', nickname);
    });

    let connectionEvents: string[] = [];

    // Monitor socket connection events
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        // Track connection changes
        const originalConnect = socketService.connect;
        socketService.connect = function() {
          connectionEvents.push(`CONNECT_CALLED at ${Date.now()}`);
          return originalConnect.apply(this, arguments);
        };

        // Monitor socket creation
        const originalSocket = socketService.socket;
        Object.defineProperty(socketService, 'socket', {
          get: function() { return this._socket; },
          set: function(value) {
            if (value && value !== this._socket) {
              connectionEvents.push(`NEW_SOCKET_CREATED at ${Date.now()}: ${value.id}`);
            }
            this._socket = value;
          }
        });
        socketService._socket = originalSocket;
      }
    });

    // Navigate to a table
    cy.get('[data-testid="table-card"]').first().within(() => {
      cy.get('[data-testid="join-button"]').click();
    });

    cy.get('[data-testid="nickname-input"]').clear().type(nickname);
    cy.get('[data-testid="join-table-button"]').click();

    cy.url().should('include', '/game/');
    cy.get('[data-testid="observer-list"]').should('contain', nickname);

    // Try to take a seat
    cy.get('[data-testid="seat-button-3"]:not(.occupied)').click();
    cy.get('[data-testid="buyin-input"]').clear().type('200');
    cy.get('[data-testid="confirm-seat-button"]').click();

    // Log all connection events
    cy.wait(5000).then(() => {
      cy.window().then(() => {
        connectionEvents.forEach(event => cy.log(event));
        
        if (connectionEvents.length > 1) {
          cy.log('🚨 MULTIPLE CONNECTION EVENTS DETECTED - This suggests socket recreation');
        } else {
          cy.log('✅ Single connection maintained throughout the flow');
        }
      });
    });

    cy.screenshot('connection-tracking-test-final');
  });
}); 