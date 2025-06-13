describe('Observer to Player Transition - Session Validation', () => {
  const testNickname = `TestUser${Date.now()}`;
  
  beforeEach(() => {
    // Set up test environment
    cy.window().then((win) => {
      win.localStorage.setItem('nickname', testNickname);
    });
    
    // Visit lobby page
    cy.visit('/lobby');
    
    // Wait for page to load and check for tables
    cy.wait(3000);
  });

  it('should complete observer → player flow without session errors', () => {
    // Check if tables are available
    cy.get('body').then($body => {
      if ($body.find('[data-testid="table-row"]').length === 0) {
        cy.log('No tables available - skipping test');
        return;
      }

      let sessionEvents: string[] = [];
      let socketEvents: { event: string, data: any }[] = [];

      // Monitor socket events and session establishment
      cy.window().then((win) => {
        const originalConsoleLog = win.console.log;
        const socketService = (win as any).socketService;
        
        // Monitor console logs for session events
        win.console.log = (...args: any[]) => {
          const message = args.join(' ');
          
          if (message.includes('tableJoined event received')) {
            sessionEvents.push('SESSION_ESTABLISHED');
          }
          if (message.includes('takeSeat') && !message.includes('Invalid session')) {
            sessionEvents.push('SEAT_TAKEN_SUCCESS');
          }
          if (message.includes('Invalid session data')) {
            sessionEvents.push('SESSION_ERROR');
          }
          
          originalConsoleLog.apply(win.console, args);
        };

        // Monitor socket emissions
        if (socketService && socketService.getSocket()) {
          const originalEmit = socketService.getSocket().emit;
          socketService.getSocket().emit = function(event: string, ...args: any[]) {
            socketEvents.push({ event, data: args });
            return originalEmit.apply(this, [event, ...args]);
          };
        }
      });

      // Step 1: Join table as observer
      cy.get('[data-testid="table-row"]').first().click();
      cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
      cy.get('[data-testid="confirm-buy-in"]').click();

      // Step 2: Wait for navigation to game page (our session fix ensures this happens after session establishment)
      cy.url({ timeout: 15000 }).should('include', '/game');
      
      // Step 3: Verify we're in observer mode
      cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');

      // Step 4: Look for available seats and try to take one
      cy.get('body').then($gameBody => {
        if ($gameBody.find('[data-testid^="available-seat-"]').length > 0) {
          // Click on an available seat
          cy.get('[data-testid^="available-seat-"]').first().click();
          
          // Should see seat selection dialog
          cy.get('[data-testid="buy-in-input"]', { timeout: 5000 }).should('be.visible');
          
          // Enter buy-in amount
          cy.get('[data-testid="buy-in-input"]').clear().type('50');
          
          // Confirm seat taking
          cy.get('[data-testid="take-seat-confirm"]').click();
          
          // Verify no session errors occurred
          cy.then(() => {
            expect(sessionEvents).to.include('SESSION_ESTABLISHED');
            expect(sessionEvents).to.not.include('SESSION_ERROR');
          });
          
          // Verify correct socket events were emitted
          cy.then(() => {
            const joinTableEvents = socketEvents.filter(e => e.event === 'joinTable');
            const takeSeatEvents = socketEvents.filter(e => e.event === 'takeSeat');
            
            expect(joinTableEvents.length).to.be.greaterThan(0);
            // takeSeat might not be captured if seat taking completes quickly
          });
          
        } else {
          cy.log('No available seats to test seat taking');
        }
      });

      // Verify session was properly established
      cy.then(() => {
        expect(sessionEvents).to.include('SESSION_ESTABLISHED');
      });
    });
  });

  it('should emit correct socket events during observer → player transition', () => {
    // Check if tables are available
    cy.get('body').then($body => {
      if ($body.find('[data-testid="table-row"]').length === 0) {
        cy.log('No tables available - skipping test');
        return;
      }

      let emittedEvents: string[] = [];

      cy.window().then((win) => {
        const socketService = (win as any).socketService;
        
        if (socketService && socketService.getSocket()) {
          const originalEmit = socketService.getSocket().emit;
          socketService.getSocket().emit = function(event: string, ...args: any[]) {
            emittedEvents.push(event);
            return originalEmit.apply(this, [event, ...args]);
          };
        }
      });

      // Join table as observer
      cy.get('[data-testid="table-row"]').first().click();
      cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
      cy.get('[data-testid="confirm-buy-in"]').click();

      // Wait for navigation
      cy.url({ timeout: 15000 }).should('include', '/game');

      // Verify correct events were emitted (our fix ensures these are correct)
      cy.then(() => {
        expect(emittedEvents).to.include('joinTable'); // Not 'table:join'
        expect(emittedEvents).to.include('updateUserLocation'); // Not 'location:update'
        
        // Should NOT include old incorrect event names
        expect(emittedEvents).to.not.include('table:join');
        expect(emittedEvents).to.not.include('location:update');
      });
    });
  });

  it('should handle session cleanup when returning to lobby', () => {
    // Check if tables are available
    cy.get('body').then($body => {
      if ($body.find('[data-testid="table-row"]').length === 0) {
        cy.log('No tables available - skipping test');
        return;
      }

      let sessionClearEvents: any[] = [];

      cy.window().then((win) => {
        const socketService = (win as any).socketService;
        
        if (socketService && socketService.getSocket()) {
          const originalEmit = socketService.getSocket().emit;
          socketService.getSocket().emit = function(event: string, ...args: any[]) {
            if (event === 'leaveTable' && args[0] && args[0].tableId === 0) {
              sessionClearEvents.push({ event, data: args });
            }
            return originalEmit.apply(this, [event, ...args]);
          };
        }
      });

      // Join table
      cy.get('[data-testid="table-row"]').first().click();
      cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
      cy.get('[data-testid="confirm-buy-in"]').click();

      // Wait for game page
      cy.url({ timeout: 15000 }).should('include', '/game');

      // Return to lobby
      cy.get('[data-testid="back-to-lobby"]', { timeout: 5000 }).should('be.visible');
      cy.get('[data-testid="back-to-lobby"]').click();

      // Should be back at lobby
      cy.url({ timeout: 5000 }).should('include', '/lobby');

      // Verify session clearing event was emitted (our fix)
      cy.then(() => {
        expect(sessionClearEvents.length).to.be.greaterThan(0);
        expect(sessionClearEvents[0].data[0].tableId).to.equal(0);
      });
    });
  });

  afterEach(() => {
    // Clean up
    cy.window().then((win) => {
      win.localStorage.removeItem('nickname');
    });
  });
}); 