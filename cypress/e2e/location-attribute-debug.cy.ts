describe('Location Attribute Debug Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'LocationAttributeTest');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should verify location attribute is correctly set when arriving at game page', () => {
    const playerName = 'LocationAttributeTest';
    
    // Step 1: Verify initial location in lobby
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        expect(initialLocation).to.equal('lobby');
        cy.log('🔍 STEP 1 - Initial location:', initialLocation);
      }
    });
    
    // Step 2: Initiate table join process
    cy.get('[data-testid="table-row"]').first().then(($row) => {
      const tableId = $row.attr('data-table-id');
      cy.log('🔍 STEP 2 - Joining table ID:', tableId);
    });
    
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Step 3: Check location immediately after navigation
    cy.url({ timeout: 10000 }).should('include', '/game/').then((url) => {
      cy.log('🔍 STEP 3 - Navigated to URL:', url);
      
      // Extract table ID from URL
      const urlMatch = url.match(/\/game\/(\d+)/);
      if (urlMatch) {
        const expectedTableId = urlMatch[1];
        cy.log('🔍 STEP 3 - Expected table ID from URL:', expectedTableId);
        
        // Check if location matches URL
        cy.window().then((win) => {
          const socketService = (win as any).socketService;
          if (socketService) {
            const currentLocation = socketService.getCurrentUserLocation();
            cy.log('🔍 STEP 3 - Current location after navigation:', currentLocation);
            
            // This is the critical test - does location match the table we joined?
            const expectedLocation = `table-${expectedTableId}`;
            
            if (currentLocation === expectedLocation) {
              cy.log('✅ STEP 3 - Location attribute CORRECT:', currentLocation);
            } else {
              cy.log('❌ STEP 3 - Location attribute INCORRECT!');
              cy.log('   Expected:', expectedLocation);
              cy.log('   Actual:', currentLocation);
              
              // This would explain why the user doesn't appear in observers list
              throw new Error(`Location mismatch! Expected: ${expectedLocation}, Got: ${currentLocation}`);
            }
          }
        });
      }
    });
    
    // Step 4: Wait for socket connection to establish and re-check
    cy.wait(3000);
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const locationAfterWait = socketService.getCurrentUserLocation();
        cy.log('🔍 STEP 4 - Location after wait:', locationAfterWait);
        
        const socket = socketService.getSocket();
        cy.log('🔍 STEP 4 - Socket connected:', socket?.connected);
        cy.log('🔍 STEP 4 - Socket ID:', socket?.id);
      }
    });
    
    // Step 5: Check if observer view is visible (should be if location is correct)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="observer-view"]').length > 0) {
        cy.log('✅ STEP 5 - Observer view is visible');
        cy.get('[data-testid="observer-view"]').should('be.visible');
      } else {
        cy.log('❌ STEP 5 - Observer view NOT found - this confirms location issue');
        cy.get('[data-testid="lobby-container"]').then(($lobby) => {
          if ($lobby.length > 0) {
            cy.log('❌ STEP 5 - Still in lobby - navigation/location failed');
          }
        });
      }
    });
    
    // Step 6: Check observers list only if we successfully reached game page
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="online-users-list"]').length > 0) {
        cy.log('🔍 STEP 6 - Checking observers list');
        cy.get('[data-testid="online-users-list"]').within(() => {
          cy.get('body').then(($list) => {
            const listText = $list.text();
            cy.log('🔍 STEP 6 - Observers list content:', listText);
            
            if (listText.includes(playerName)) {
              cy.log('✅ STEP 6 - User FOUND in observers list');
            } else {
              cy.log('❌ STEP 6 - User NOT found in observers list');
              cy.log('   This confirms the location attribute issue!');
            }
          });
        });
      } else {
        cy.log('❌ STEP 6 - No observers list found - confirms we are not on game page');
      }
    });
  });

  it('should debug the complete location update flow step by step', () => {
    const playerName = 'LocationFlowDebug';
    
    // Monitor all location changes
    let locationChanges: string[] = [];
    
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        // Hook into location updates to track all changes
        const originalHandleLocationUpdate = socketService.handleLocationUpdate;
        socketService.handleLocationUpdate = function(data: any) {
          locationChanges.push(`${data.nickname}: ${data.location}`);
          cy.log('📍 LOCATION UPDATE:', `${data.nickname} → ${data.location}`);
          return originalHandleLocationUpdate.call(this, data);
        };
        
        // Also track manual location changes
        Object.defineProperty(socketService, 'currentUserLocation', {
          get: function() { return this._currentUserLocation || 'lobby'; },
          set: function(value) { 
            locationChanges.push(`Manual: ${value}`);
            cy.log('📍 MANUAL LOCATION SET:', value);
            this._currentUserLocation = value; 
          }
        });
      }
    });
    
    // Execute the join flow
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Wait and analyze what happened
    cy.wait(5000);
    
    cy.then(() => {
      cy.log('🔍 COMPLETE LOCATION CHANGE HISTORY:');
      locationChanges.forEach((change, index) => {
        cy.log(`  ${index + 1}. ${change}`);
      });
      
      if (locationChanges.length === 0) {
        cy.log('❌ NO LOCATION CHANGES DETECTED - This is the problem!');
      }
    });
  });
}); 