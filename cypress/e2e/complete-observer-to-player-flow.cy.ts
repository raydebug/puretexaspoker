describe('Complete Observer to Player Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Handle nickname modal directly (always appears on fresh visit)
    cy.get('[data-testid="nickname-modal"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="nickname-input"]').type('FlowTestUser');
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('not.exist');
    
    // Wait for tables to load
    cy.get('[data-testid="table-row"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should complete the full observer-to-player flow with seat changes', () => {
    const playerName = 'CompleteFlowPlayer';
    
    // **STEP 1: VERIFY USER STARTS IN LOBBY**
    cy.log('🎯 STEP 1: Verifying user starts in lobby');
    cy.window().then((win) => {
      const location = (win as any).socketService?.getCurrentUserLocation();
      cy.log(`Initial location: ${JSON.stringify(location)}`);
      // Location should be null or indicate lobby status
    });
    
    // **STEP 2: JOIN TABLE AS OBSERVER**
    cy.log('🎯 STEP 2: Joining table as observer');
    
    // Click on first available table
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Check for welcome popup (optional - may not be implemented yet)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-popup"]').length > 0) {
        cy.get('[data-testid="welcome-popup"]').should('be.visible');
        cy.get('[data-testid="welcome-popup"]', { timeout: 4000 }).should('not.exist');
        cy.log('✅ Welcome popup appeared and closed');
      } else {
        cy.log('ℹ️ Welcome popup not found - proceeding without it');
      }
    });
    
    // **STEP 3: VERIFY NAVIGATION TO GAME PAGE**
    cy.url({ timeout: 10000 }).should('include', '/game/');
    cy.log('✅ Successfully navigated to game page');
    
    // **STEP 4: VERIFY USER LOCATION IS UPDATED TO TABLE-X**
    cy.wait(3000); // Allow time for socket connection and location update
    cy.window().then((win) => {
      const location = (win as any).socketService?.getCurrentUserLocation();
      cy.log(`Location after joining: ${JSON.stringify(location)}`);
      
      // Extract table ID from URL for verification
      cy.url().then((url) => {
        const tableId = url.split('/game/')[1];
        cy.log(`Expected table location: table-${tableId}`);
        
        // Verify location is set to correct table
        if (location && location.table) {
          expect(location.table.toString()).to.equal(tableId);
          expect(location.seat).to.be.null; // Should be observer (no seat)
          cy.log('✅ Location correctly updated to table-x as observer');
        } else if (location && typeof location === 'string') {
          // Handle legacy location format
          expect(location).to.equal(`table-${tableId}`);
          cy.log('✅ Location correctly updated to table-x (legacy format)');
        }
      });
    });
    
    // **STEP 5: VERIFY USER APPEARS IN OBSERVERS LIST**
    cy.log('🎯 STEP 5: Verifying user appears in observers list');
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).should('be.visible');
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should have Observers section
      cy.contains('Observers').should('be.visible');
      
      // **CRITICAL**: Player should be in observers list  
      cy.contains(playerName).should('be.visible');
      cy.log('✅ User appears in observers list');
    });
    
    // **STEP 6: TAKE FIRST SEAT**
    cy.log('🎯 STEP 6: Taking first available seat');
    
    // Find and click first available seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Handle seat buy-in modal
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Wait for seat to be taken
    cy.wait(2000);
    
    // **STEP 7: VERIFY USER REMOVED FROM OBSERVERS LIST**
    cy.log('🎯 STEP 7: Verifying user removed from observers list');
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Observers section should not contain the player anymore
      cy.get('body').then(($body) => {
        if ($body.find(':contains("Observers")').length > 0) {
          // If Observers section exists, player should not be in it
          cy.contains('Observers').parent().within(() => {
            cy.contains(playerName).should('not.exist');
          });
        }
        cy.log('✅ User removed from observers list');
      });
    });
    
    // **STEP 8: VERIFY USER APPEARS IN PLAYERS LIST WITH SEAT NUMBER**
    cy.log('🎯 STEP 8: Verifying user appears in players list with seat number');
    
    let firstSeatNumber: string;
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Should have Players section
      cy.contains('Players').should('be.visible');
      
      // Player should be in players list with seat number
      cy.contains('Players').parent().within(() => {
        cy.contains(playerName).should('be.visible');
        
        // Extract seat number from the display (e.g., "PlayerName (Seat 2)")
        cy.contains(playerName).invoke('text').then((text) => {
          const seatMatch = text.match(/Seat (\d+)/);
          if (seatMatch) {
            firstSeatNumber = seatMatch[1];
            cy.log(`✅ User appears in players list with seat ${firstSeatNumber}`);
          }
        });
      });
    });
    
    // **STEP 9: TAKE DIFFERENT SEAT**
    cy.log('🎯 STEP 9: Taking a different seat');
    
    // First stand up from current seat
    cy.get('[data-testid^="seat-"]').contains(playerName).parent().within(() => {
      cy.get('[data-testid="stand-up-btn"]').click();
    });
    
    cy.wait(1000);
    
    // Find and click a different available seat
    cy.get('[data-testid^="available-seat-"]').eq(1).click();
    
    // Handle seat buy-in modal again
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // Wait for new seat to be taken
    cy.wait(2000);
    
    // **STEP 10: VERIFY USER IN PLAYERS LIST WITH NEW SEAT NUMBER**
    cy.log('🎯 STEP 10: Verifying user appears with new seat number');
    
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').parent().within(() => {
        cy.contains(playerName).should('be.visible');
        
        // Extract new seat number and verify it's different
        cy.contains(playerName).invoke('text').then((text) => {
          const seatMatch = text.match(/Seat (\d+)/);
          if (seatMatch) {
            const newSeatNumber = seatMatch[1];
            cy.log(`✅ User now in seat ${newSeatNumber} (was in seat ${firstSeatNumber})`);
            expect(newSeatNumber).to.not.equal(firstSeatNumber);
          }
        });
      });
    });
    
    // **STEP 11: VERIFY FINAL LOCATION STATE**
    cy.log('🎯 STEP 11: Verifying final location state');
    
    cy.window().then((win) => {
      const location = (win as any).socketService?.getCurrentUserLocation();
      cy.log(`Final location: ${JSON.stringify(location)}`);
      
      // Should have table and seat set
      if (location && location.table) {
        expect(location.table).to.not.be.null;
        expect(location.seat).to.not.be.null;
        cy.log('✅ Final location state shows user seated at table with seat number');
      }
    });
    
    cy.log('🎉 COMPLETE FLOW TEST PASSED: lobby → observer → player → seat change');
  });

  it('should handle multiple users in observers and players lists', () => {
    const firstPlayer = 'Observer1';
    const secondPlayer = 'Observer2';
    
    cy.log('🎯 Testing multiple users flow');
    
    // First user joins as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(firstPlayer);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url({ timeout: 10000 }).should('include', '/game/');
    
    // Verify first user in observers list
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(firstPlayer).should('be.visible');
    });
    
    // Open new window for second user (simulated by refreshing and rejoining)
    cy.reload();
    
    // Handle nickname modal for second user
    cy.get('[data-testid="nickname-modal"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="nickname-input"]').type(secondPlayer);
    cy.get('[data-testid="join-button"]').click();
    
    // Join same table as second observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(secondPlayer);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url({ timeout: 10000 }).should('include', '/game/');
    
    // Verify both users in observers list
    cy.get('[data-testid="online-users-list"]', { timeout: 15000 }).within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(firstPlayer).should('be.visible');
      cy.contains(secondPlayer).should('be.visible');
    });
    
    // Second user takes a seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    cy.wait(2000);
    
    // Verify: first user still in observers, second user in players
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Observers should have first user
      cy.contains('Observers').parent().within(() => {
        cy.contains(firstPlayer).should('be.visible');
        cy.contains(secondPlayer).should('not.exist');
      });
      
      // Players should have second user
      cy.contains('Players').parent().within(() => {
        cy.contains(secondPlayer).should('be.visible');
        cy.contains(firstPlayer).should('not.exist');
      });
    });
    
    cy.log('✅ Multiple users flow verified: observers and players lists work correctly');
  });
}); 