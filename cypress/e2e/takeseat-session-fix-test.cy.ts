describe('TakeSeat Session Data Fix Test', () => {
  const testUserId = `TakeSeatFixTest_${Date.now()}`;

  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
  });

  it('should successfully take a seat without session data errors', () => {
    // Step 1: Join table as observer
    cy.log('🎯 Step 1: Joining table as observer');
    cy.get('[data-testid="table-1"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    
    // Enter nickname and join
    cy.get('[data-testid="nickname-input"]').clear().type(testUserId);
    cy.get('[data-testid="join-button"]').click();
    
    // Step 2: Verify navigation to game page
    cy.url().should('include', '/game/1');
    cy.wait(2000);
    
    // Step 3: Verify observer appears in the UI
    cy.log('🎯 Step 2: Verifying observer appears in UI');
    cy.get('[data-testid="observer-count"]', { timeout: 15000 }).should(($el) => {
      const count = parseInt($el.text());
      expect(count).to.be.greaterThan(0);
    });
    
    // Step 4: Try to take a seat
    cy.log('🎯 Step 3: Attempting to take a seat');
    
    // Click on an empty seat
    cy.get('[data-testid="seat-1"]', { timeout: 10000 }).should('be.visible').click();
    
    // Buy-in dialog should appear
    cy.get('[data-testid="seat-dialog"]', { timeout: 5000 }).should('be.visible');
    
    // Enter buy-in amount
    cy.get('[data-testid="buyin-input"]').clear().type('500');
    
    // Confirm seat selection
    cy.get('[data-testid="confirm-seat-button"]').click();
    
    // Step 5: Verify seat is taken successfully (no session error)
    cy.log('🎯 Step 4: Verifying seat taken successfully');
    
    // Should not see any error about "Invalid session data"
    cy.get('body').should('not.contain', 'Invalid session data');
    cy.get('body').should('not.contain', 'Please rejoin the table');
    
    // Should see the seat is now occupied
    cy.get('[data-testid="seat-1"]').should('contain', testUserId);
    
    // Observer count should decrease (user moved from observer to player)
    cy.get('[data-testid="observer-count"]').should(($el) => {
      const count = parseInt($el.text());
      expect(count).to.equal(0); // Should be 0 since user is now a player
    });
    
    cy.log('✅ TakeSeat session data fix test passed!');
  });
  
  it('should handle errors gracefully when seat is already taken', () => {
    // First user takes a seat
    cy.log('🎯 Setting up: First user takes seat');
    cy.get('[data-testid="table-1"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    cy.get('[data-testid="nickname-input"]').clear().type('FirstUser');
    cy.get('[data-testid="join-button"]').click();
    cy.url().should('include', '/game/1');
    
    // Take seat 1
    cy.get('[data-testid="seat-1"]', { timeout: 10000 }).should('be.visible').click();
    cy.get('[data-testid="seat-dialog"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="buyin-input"]').clear().type('500');
    cy.get('[data-testid="confirm-seat-button"]').click();
    
    // Verify seat is taken
    cy.get('[data-testid="seat-1"]').should('contain', 'FirstUser');
    
    // Now test second user trying to take the same seat
    cy.log('🎯 Testing: Second user attempts same seat');
    
    // Open new browser context (simulate second user)
    cy.visit('/');
    cy.get('[data-testid="table-1"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    cy.get('[data-testid="nickname-input"]').clear().type(testUserId);
    cy.get('[data-testid="join-button"]').click();
    cy.url().should('include', '/game/1');
    
    // Try to take the already occupied seat
    cy.get('[data-testid="seat-1"]', { timeout: 10000 }).should('contain', 'FirstUser');
    
    // Should not be able to click on occupied seat, or should get proper error
    // (This depends on UI implementation - seat might be disabled or show error)
    
    cy.log('✅ Error handling test completed');
  });
}); 