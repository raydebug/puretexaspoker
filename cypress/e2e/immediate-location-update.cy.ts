describe('Immediate Location Update on Join Table', () => {
  const testNickname = `TestUser${Date.now()}`;
  
  beforeEach(() => {
    // Set up test environment
    cy.window().then((win) => {
      win.localStorage.setItem('nickname', testNickname);
    });
    
    // Visit lobby page
    cy.visit('/lobby');
    
    // Wait for tables to load
    cy.get('[data-testid="table-row"]', { timeout: 10000 }).should('be.visible');
  });

  it('should update user location immediately when clicking join table', () => {
    // Click on the first table to open join dialog
    cy.get('[data-testid="table-row"]').first().click();
    
    // Wait for join dialog to appear
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    
    // Set up console log monitoring to capture immediate location update
    cy.window().then((win) => {
      const originalConsoleLog = win.console.log;
      let immediateLocationUpdateFound = false;
      
      // Monitor console logs for immediate location update
      win.console.log = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('🎯 FRONTEND: Immediately updating location to: table-') && 
            message.includes('when joining table')) {
          immediateLocationUpdateFound = true;
          win.localStorage.setItem('immediateLocationUpdateFound', 'true');
        }
        originalConsoleLog.apply(win.console, args);
      };
    });
    
    // Click join button to trigger location update
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Verify that immediate location update happened
    cy.window().then((win) => {
      expect(win.localStorage.getItem('immediateLocationUpdateFound')).to.equal('true');
    });
    
    // Also check that socketService shows correct location
    cy.window().then((win) => {
      // Access socketService from window
      const socketService = (win as any).socketService;
      if (socketService) {
        // Check that current location starts with 'table-'
        expect(socketService.currentUserLocation).to.match(/^table-\d+$/);
      }
    });
  });

  it('should show location update in console logs when joining table', () => {
    let locationUpdateLogs: string[] = [];
    
    // Set up console monitoring
    cy.window().then((win) => {
      const originalConsoleLog = win.console.log;
      win.console.log = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('🎯 FRONTEND:') && message.includes('location')) {
          locationUpdateLogs.push(message);
        }
        originalConsoleLog.apply(win.console, args);
      };
    });
    
    // Join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Wait a moment for logs to accumulate
    cy.wait(1000);
    
    // Verify location update logs were captured
    cy.then(() => {
      expect(locationUpdateLogs.length).to.be.greaterThan(0);
      expect(locationUpdateLogs.some(log => 
        log.includes('Immediately updating location') && log.includes('when joining table')
      )).to.be.true;
    });
  });

  it('should update location before any backend processing', () => {
    let eventOrder: string[] = [];
    
    // Monitor both frontend location updates and backend events
    cy.window().then((win) => {
      const originalConsoleLog = win.console.log;
      win.console.log = (...args: any[]) => {
        const message = args.join(' ');
        
        // Track immediate location update (should be first)
        if (message.includes('🎯 FRONTEND: Immediately updating location')) {
          eventOrder.push('FRONTEND_LOCATION_UPDATE');
        }
        
        // Track backend processing events (should be after)
        if (message.includes('DEBUG: About to emit joinTable event') || 
            message.includes('DEBUG: tableJoined event received') ||
            message.includes('Backend updated') && message.includes('location to:')) {
          eventOrder.push('BACKEND_PROCESSING');
        }
        
        originalConsoleLog.apply(win.console, args);
      };
    });
    
    // Join a table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="confirm-buy-in"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="confirm-buy-in"]').click();
    
    // Wait for events to complete
    cy.wait(2000);
    
    // Verify that frontend location update happened before backend processing
    cy.then(() => {
      expect(eventOrder.length).to.be.greaterThan(0);
      const firstLocationUpdate = eventOrder.indexOf('FRONTEND_LOCATION_UPDATE');
      const firstBackendProcessing = eventOrder.indexOf('BACKEND_PROCESSING');
      
      // Frontend location update should happen before (or be the only event if backend is slow)
      if (firstBackendProcessing !== -1) {
        expect(firstLocationUpdate).to.be.lessThan(firstBackendProcessing);
      }
      expect(firstLocationUpdate).to.not.equal(-1); // Should have at least frontend update
    });
  });

  afterEach(() => {
    // Clean up
    cy.window().then((win) => {
      win.localStorage.removeItem('immediateLocationUpdateFound');
    });
  });
}); 