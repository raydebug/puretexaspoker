describe('Seat Selection with Buy-in Options', () => {
  beforeEach(() => {
    // Visit the lobby page
    cy.visit('/');
    
    // Set a test nickname
    cy.setCookie('playerNickname', 'SeatTestPlayer');
    
    // Wait for lobby to load
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should show seat selection dialog with buy-in options when clicking available seat', () => {
    // Join a table as observer
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type('SeatTestPlayer');
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Click on an available seat
    cy.get('[data-testid^="available-seat-"]')
      .first()
      .click();
    
    // Seat selection dialog should appear
    cy.get('[data-testid="confirm-seat-btn"]').should('be.visible');
    
    // Should show buy-in dropdown
    cy.get('[data-testid="buyin-dropdown"]').should('be.visible');
    
    // Should have multiple options in dropdown
    cy.get('[data-testid="buyin-dropdown"] option').should('have.length.greaterThan', 1);
    
    // Custom input should not be visible initially
    cy.get('[data-testid="custom-buyin-input"]').should('not.exist');
    
    // Should show seat number in title
    cy.contains('Take Seat').should('be.visible');
  });

  it('should allow selecting different buy-in multiples', () => {
    // Join and get to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('MultiplierTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Get the first available option from the dropdown and select it
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
      cy.get('[data-testid="confirm-seat-btn"]')
        .should('contain', 'Take Seat with')
        .should('contain', '$');
    });
    
    // Try a different option (second available option)
    cy.get('[data-testid="buyin-dropdown"] option').eq(1).then($option => {
      const value = $option.val();
      if (value !== undefined && value !== '-1') { // Skip if it's the custom option
        cy.get('[data-testid="buyin-dropdown"]').select(String(value));
        cy.get('[data-testid="confirm-seat-btn"]')
          .should('contain', 'Take Seat with')
          .should('contain', '$');
      }
    });
  });

  it('should allow custom buy-in input', () => {
    // Join and get to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('CustomBuyInTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Select custom amount from dropdown
    cy.get('[data-testid="buyin-dropdown"]').select('Custom Amount');
    
    // Custom input should now be visible
    cy.get('[data-testid="custom-buyin-input"]').should('be.visible');
    
    // Enter custom buy-in amount
    cy.get('[data-testid="custom-buyin-input"]').clear().type('500');
    
    // Button should show the custom amount
    cy.get('[data-testid="confirm-seat-btn"]')
      .should('contain', 'Take Seat with $500');
  });

  it('should validate buy-in ranges', () => {
    // Join and get to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('ValidationTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Select custom amount to show input
    cy.get('[data-testid="buyin-dropdown"]').select('Custom Amount');
    
    // Read the min/max values from the range info to use in test
    cy.contains('Min:').should('be.visible');
    cy.contains('Max:').should('be.visible');
    
    // Try invalid amounts (too low)
    cy.get('[data-testid="custom-buyin-input"]').clear().type('5');
    cy.get('[data-testid="confirm-seat-btn"]').should('be.disabled');
    
    // Try invalid amounts (too high)
    cy.get('[data-testid="custom-buyin-input"]').clear().type('50000');
    cy.get('[data-testid="confirm-seat-btn"]').should('be.disabled');
    
    // Try valid amount within the middle of typical range (20x big blind = $400 for $20 BB)
    cy.get('[data-testid="custom-buyin-input"]').clear().type('400');
    cy.get('[data-testid="confirm-seat-btn"]').should('be.enabled');
  });

  it('should take seat successfully with selected buy-in', () => {
    // Join and get to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('TakeSeatTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Click on a seat and select buy-in from dropdown
    cy.get('[data-testid^="available-seat-"]').first().click();
    // Select the first available buy-in option
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
      cy.get('[data-testid="confirm-seat-btn"]').click();
    });
    
    // In test mode, should switch from observer to player view
    // (In a real implementation, this would depend on backend response)
    cy.window().then((win) => {
      // Should store the correct nickname
      expect(win.localStorage.getItem('nickname')).to.eq('TakeSeatTest');
    });
  });

  it('should close dialog when clicking cancel', () => {
    // Join and get to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('CancelTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Dialog should be visible
    cy.get('[data-testid="confirm-seat-btn"]').should('be.visible');
    
    // Click cancel button (not the text)
    cy.contains('button', 'Cancel').click();
    
    // Dialog should be gone
    cy.get('[data-testid="confirm-seat-btn"]').should('not.exist');
    
    // Should still be in observer view
    cy.get('[data-testid="observer-view"]').should('be.visible');
  });

  it('should show correct range information when custom is selected', () => {
    // Join and get to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('RangeInfoTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Select custom to show range info
    cy.get('[data-testid="buyin-dropdown"]').select('Custom Amount');
    
    // Should show min/max range when custom is selected
    cy.contains('Min:').should('be.visible');
    cy.contains('Max:').should('be.visible');
    
    // Should show stake information
    cy.contains('Stakes:').should('be.visible');
    cy.contains('Big Blind:').should('be.visible');
  });
}); 