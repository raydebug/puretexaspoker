describe('Session Establishment and Join Table Flow', () => {
  const testNickname = `TestUser${Date.now()}`;
  
  beforeEach(() => {
    // Set up test environment
    cy.window().then((win) => {
      win.localStorage.setItem('nickname', testNickname);
    });
    
    // Visit lobby page
    cy.visit('/lobby');
    
    // Wait for tables to load - handle both table loading and empty state
    cy.get('body').then($body => {
      if ($body.find('[data-testid="table-row"]').length > 0) {
        cy.get('[data-testid="table-row"]', { timeout: 15000 }).should('be.visible');
      } else {
        // If no tables exist, wait a bit for them to potentially load
        cy.wait(5000);
        // Check again, if still no tables, continue with test but log warning
        cy.get('body').then($body2 => {
          if ($body2.find('[data-testid="table-row"]').length === 0) {
            cy.log('WARNING: No tables found, this test may need manual table creation');
          }
        });
      }
    });
  });

  it('should wait for tableJoined event before navigation to prevent session issues', () => {
    // Skip if no tables are available
    cy.get('body').then($body => {
      if ($body.find('[data-testid="table-row"]').length === 0) {
        cy.log('Skipping test - no tables available');
        return;
      }
    });
    let eventOrder: string[] = [];
    let sessionDataChecks: any[] = [];
    
    // Monitor console logs for proper event sequence
    cy.window().then((win) => {
      const originalConsoleLog = win.console.log;
      win.console.log = (...args: any[]) => {
        const message = args.join(' ');
        
        // Track event sequence
        if (message.includes('DEBUG: About to emit joinTable event')) {
          eventOrder.push('EMIT_JOIN_TABLE');
        }
        if (message.includes('DEBUG: tableJoined event received')) {
          eventOrder.push('TABLE_JOINED_EVENT');
        }
        if (message.includes('DEBUG: Navigating to game page after tableJoined')) {
          eventOrder.push('NAVIGATION_START');
        }
        
        // Track session data availability
        if (message.includes('Session data check:') && message.includes('tableId:')) {
          const sessionMatch = message.match(/tableId: (\d+|null)/);
          if (sessionMatch) {
            sessionDataChecks.push({
              timestamp: Date.now(),
              tableId: sessionMatch[1],
              hasSession: sessionMatch[1] !== 'null'
            });
          }
        }
        
        originalConsoleLog.apply(win.console, args);
      };
    });
    
    // Click on the first table to open join dialog
    cy.get('[data-testid="table-row"]').first().click();
    
    // Wait for join dialog to appear
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    
    // Click join button to trigger the flow
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Wait for navigation to complete
    cy.url({ timeout: 10000 }).should('include', '/game');
    
    // Verify proper event sequence
    cy.then(() => {
      expect(eventOrder).to.include('EMIT_JOIN_TABLE');
      expect(eventOrder).to.include('TABLE_JOINED_EVENT');
      expect(eventOrder).to.include('NAVIGATION_START');
      
      // Verify that tableJoined event comes before navigation
      const joinTableIndex = eventOrder.indexOf('EMIT_JOIN_TABLE');
      const tableJoinedIndex = eventOrder.indexOf('TABLE_JOINED_EVENT');
      const navigationIndex = eventOrder.indexOf('NAVIGATION_START');
      
      expect(joinTableIndex).to.be.lessThan(tableJoinedIndex);
      expect(tableJoinedIndex).to.be.lessThan(navigationIndex);
    });
    
    // Verify session data was established properly
    cy.then(() => {
      const hasValidSession = sessionDataChecks.some(check => check.hasSession);
      expect(hasValidSession).to.be.true;
    });
  });

  it('should establish backend session before allowing takeSeat operations', () => {
    let sessionEstablished = false;
    let takeSeatAttempted = false;
    
    // Monitor for session establishment and takeSeat attempts
    cy.window().then((win) => {
      const originalConsoleLog = win.console.log;
      win.console.log = (...args: any[]) => {
        const message = args.join(' ');
        
        if (message.includes('DEBUG: tableJoined event received')) {
          sessionEstablished = true;
        }
        
        if (message.includes('takeSeat') || message.includes('Taking seat')) {
          takeSeatAttempted = true;
        }
        
        originalConsoleLog.apply(win.console, args);
      };
    });
    
    // Join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Wait for navigation to game page
    cy.url({ timeout: 10000 }).should('include', '/game');
    
    // Verify that game page has proper elements showing session is established
    cy.get('[data-testid="game-table"]', { timeout: 10000 }).should('be.visible');
    
    // If there are available seats, try to take one
    cy.get('body').then($body => {
      if ($body.find('[data-testid="seat-button"]:not([disabled])').length > 0) {
        // Click on an available seat
        cy.get('[data-testid="seat-button"]:not([disabled])').first().click();
        
        // Verify that takeSeat operation can proceed without session errors
        cy.get('[data-testid="buy-in-input"]', { timeout: 5000 }).should('be.visible');
        cy.get('[data-testid="buy-in-input"]').type('100');
        cy.get('[data-testid="take-seat-confirm"]').click();
        
        // Should not see session error
        cy.get('body').should('not.contain', 'Invalid session data');
        cy.get('body').should('not.contain', 'Please rejoin the table');
      }
    });
    
    // Verify session was established before any takeSeat attempts
    cy.then(() => {
      if (takeSeatAttempted) {
        expect(sessionEstablished).to.be.true;
      }
    });
  });

  it('should properly handle socket events with correct event names', () => {
    let emittedEvents: string[] = [];
    
    // Monitor socket events being emitted
    cy.window().then((win) => {
      // Access socket service and monitor events
      const socketService = (win as any).socketService;
      if (socketService && socketService.getSocket()) {
        const originalEmit = socketService.getSocket().emit;
        socketService.getSocket().emit = function(event: string, ...args: any[]) {
          emittedEvents.push(event);
          return originalEmit.apply(this, [event, ...args]);
        };
      }
    });
    
    // Join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Wait for events to be emitted
    cy.wait(2000);
    
    // Verify correct event names are being used
    cy.then(() => {
      expect(emittedEvents).to.include('joinTable'); // Not 'table:join'
      expect(emittedEvents).to.include('updateUserLocation'); // Not 'location:update'
    });
  });

  it('should clear session data when returning to lobby', () => {
    let sessionCleared = false;
    
    // Monitor for session clearing
    cy.window().then((win) => {
      const originalConsoleLog = win.console.log;
      win.console.log = (...args: any[]) => {
        const message = args.join(' ');
        
        if (message.includes('Clearing session data') || 
            message.includes('leaveTable with tableId: 0')) {
          sessionCleared = true;
        }
        
        originalConsoleLog.apply(win.console, args);
      };
    });
    
    // Join a table first
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Wait for navigation to game page
    cy.url({ timeout: 10000 }).should('include', '/game');
    
    // Return to lobby
    cy.get('[data-testid="back-to-lobby"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="back-to-lobby"]').click();
    
    // Should be back at lobby
    cy.url({ timeout: 5000 }).should('include', '/lobby');
    
    // Verify session was cleared
    cy.then(() => {
      expect(sessionCleared).to.be.true;
    });
  });

  it('should prevent race conditions in join table flow', () => {
    let navigationAttempts = 0;
    let tableJoinedReceived = false;
    
    // Monitor navigation attempts vs tableJoined events
    cy.window().then((win) => {
      const originalConsoleLog = win.console.log;
      const originalPushState = win.history.pushState;
      
      // Monitor navigation
      win.history.pushState = function(...args) {
        if (args[2] && args[2].toString().includes('/game')) {
          navigationAttempts++;
        }
        return originalPushState.apply(this, args);
      };
      
      // Monitor tableJoined events
      win.console.log = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('DEBUG: tableJoined event received')) {
          tableJoinedReceived = true;
        }
        originalConsoleLog.apply(win.console, args);
      };
    });
    
    // Join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Wait for navigation
    cy.url({ timeout: 10000 }).should('include', '/game');
    
    // Verify that navigation only happened after tableJoined event
    cy.then(() => {
      expect(tableJoinedReceived).to.be.true;
      expect(navigationAttempts).to.equal(1); // Should only navigate once
    });
  });

  afterEach(() => {
    // Clean up any test data
    cy.window().then((win) => {
      win.localStorage.removeItem('nickname');
    });
  });
}); 