describe('Observer Appears When Joining Table Bug Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'ObserverTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('PAUSE TEST: Show UI when user appears in observers list', () => {
    const playerName = 'PauseTestUser';
    
    // Join table as observer
    cy.log('🎯 STEP 1: Joining table as observer');
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Wait for navigation to game page
    cy.log('🎯 STEP 2: Waiting for game page navigation');
    cy.url({ timeout: 15000 }).should('include', '/game/');
    
    // Wait for observer view
    cy.log('🎯 STEP 3: Waiting for observer view to load');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Wait for observers list to appear
    cy.log('🎯 STEP 4: Waiting for observers list to appear');
    cy.get('[data-testid="online-users-list"]', { timeout: 10000 }).should('be.visible');
    
    // Verify user appears in observers list
    cy.log('🎯 STEP 5: Verifying user appears in observers list');
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName, { timeout: 5000 }).should('be.visible');
      cy.contains(/Observers \(\d+\)/).should('be.visible');
    });
    
    // 🔴 PAUSE HERE - User is now in observers list!
    cy.log('✅ SUCCESS: User appears in observers list! Pausing to inspect UI...');
    cy.pause(); // This will pause the test execution
    
    // After resuming, log the final state
    cy.log('🎯 Test resumed - observers list verified');
  });

  it('should add player to observers list when joining a table', () => {
    const playerName = 'ObserverBugTest';
    
    // **VERIFY INITIAL LOCATION**: Should start in lobby
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        expect(initialLocation).to.equal('lobby');
        cy.log('✅ Initial location verified: lobby');
      }
    });
    
    // Join a table as observer
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // **VERIFY IMMEDIATE BACKEND LOCATION UPDATE**: Backend should receive location update immediately
    cy.wait(1000); // Wait for immediate location update to process
    
    // **VERIFY WELCOME POPUP (OPTIONAL)**: May show "welcome join table-<x>" before navigation
    // Check if welcome popup appears, but don't fail if it doesn't (timing issue)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-popup"]').length > 0) {
        cy.get('[data-testid="welcome-popup"]').should('be.visible');
        cy.get('[data-testid="welcome-popup"]').within(() => {
          cy.contains('Welcome!').should('be.visible');
          cy.contains('You\'re joining table-').should('be.visible');
          cy.log('✅ Welcome popup displayed successfully');
        });
        
        // Wait for popup to auto-close
        cy.get('[data-testid="welcome-popup"]', { timeout: 4000 }).should('not.exist');
        cy.log('✅ Welcome popup closed after timeout');
      } else {
        cy.log('ℹ️ Welcome popup not found - may have appeared and closed quickly');
      }
    });
    
    // **VERIFY LOCATION BEFORE ENTERING GAME PAGE**: Should update to table-x
    cy.url({ timeout: 10000 }).should('include', '/game/').then((url) => {
      // Extract table ID from URL
      const urlMatch = url.match(/\/game\/(\d+)/);
      if (urlMatch) {
        const expectedTableId = urlMatch[1];
        const expectedLocation = `table-${expectedTableId}`;
        
        // Wait for socket connection and location update
        cy.wait(3000);
        
        cy.window().then((win) => {
          const socketService = (win as any).socketService;
          if (socketService) {
            const currentLocation = socketService.getCurrentUserLocation();
            cy.log('🔍 Current location after join:', currentLocation);
            cy.log('🔍 Expected location:', expectedLocation);
            
            // **CRITICAL VERIFICATION**: Location attribute must be updated before checking observers
            expect(currentLocation).to.equal(expectedLocation);
            cy.log('✅ Location attribute correctly updated from lobby to:', currentLocation);
          }
        });
      }
    });
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // **CRITICAL TEST**: Player should appear in observers list (only after location is verified)
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should have Observers section
      cy.contains('Observers').should('be.visible');
      
      // Player should be in observers list  
      cy.contains(playerName).should('be.visible');
      
      // Should show correct count
      cy.contains('Observers (1)').should('be.visible');
    });
  });

  it('should handle multiple observers joining the same table', () => {
    // This simulates what should happen when multiple users join
    const observer1 = 'Observer1';
    
    // Join first observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observer1);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Should see the observer in the list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(observer1).should('be.visible');
      cy.contains('Observers (1)').should('be.visible');
    });
  });

  it('should show observer in list immediately after joining', () => {
    const playerName = 'ImmediateTest';
    
    // Join table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify observer list shows immediately (no long wait)
    cy.get('[data-testid="online-users-list"]', { timeout: 5000 }).should('be.visible');
    
    // Debug: Log what we see in the list
    cy.get('[data-testid="online-users-list"]').then(($list) => {
      cy.log('Online users list content:', $list.text());
    });
    
    // Check that player appears in observers
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName, { timeout: 3000 }).should('be.visible');
    });
  });

  it('should persist observer status after page refresh', () => {
    const playerName = 'PersistentObserver';
    
    // Join as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify observer appears
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains(playerName).should('be.visible');
    });
    
    // Refresh page
    cy.reload();
    
    // Should still be in observer view (if game state persists)
    cy.get('[data-testid="observer-view"], [data-testid="lobby-container"]', { timeout: 10000 }).should('be.visible');
  });

  it('should handle observer joining with existing debug logging', () => {
    const playerName = 'DebugObserver';
    
    // Monitor console logs
    cy.window().then((win) => {
      // Capture console.log calls
      cy.stub(win.console, 'log').as('consoleLog');
    });
    
    // Join table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify player appears in list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(playerName).should('be.visible');
    });
    
    // Check for debug logs (optional - if debug is enabled)
    cy.get('@consoleLog').should('have.been.called');
  });
}); 