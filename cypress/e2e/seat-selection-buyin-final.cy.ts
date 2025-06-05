describe('Seat Selection with Buy-in Dropdown', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'DropdownTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should show seat selection dialog with dropdown buy-in options', () => {
    // Join as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('DropdownTestPlayer');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Click on available seat to open seat selection dialog
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Verify dialog elements
    cy.get('[data-testid="confirm-seat-btn"]').should('be.visible');
    cy.get('[data-testid="buyin-dropdown"]').should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').should('have.length.greaterThan', 1);
    cy.contains('Take Seat').should('be.visible');
  });

  it('should allow selecting buy-in from dropdown options', () => {
    // Navigate to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('DropdownSelectTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Select first option and verify button updates
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
      cy.get('[data-testid="confirm-seat-btn"]')
        .should('contain', 'Take Seat with')
        .should('contain', '$');
    });
  });

  it('should show custom input when Custom Amount is selected', () => {
    // Navigate to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('CustomInputTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Custom input should not be visible initially
    cy.get('[data-testid="custom-buyin-input"]').should('not.exist');
    
    // Select custom amount
    cy.get('[data-testid="buyin-dropdown"]').select('-1'); // Custom Amount value
    
    // Custom input should now be visible
    cy.get('[data-testid="custom-buyin-input"]').should('be.visible');
    
    // Enter custom amount
    cy.get('[data-testid="custom-buyin-input"]').type('750');
    cy.get('[data-testid="confirm-seat-btn"]').should('contain', '$750');
  });

  it('should validate custom buy-in amounts', () => {
    // Navigate to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('ValidationTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Select custom amount
    cy.get('[data-testid="buyin-dropdown"]').select('-1');
    
    // Test invalid amount (too low)
    cy.get('[data-testid="custom-buyin-input"]').type('10');
    cy.get('[data-testid="confirm-seat-btn"]').should('be.disabled');
    
    // Test valid amount
    cy.get('[data-testid="custom-buyin-input"]').clear().type('500');
    cy.get('[data-testid="confirm-seat-btn"]').should('be.enabled');
  });

  it('should close dialog when cancel is clicked', () => {
    // Navigate to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('CancelTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Dialog should be visible
    cy.get('[data-testid="confirm-seat-btn"]').should('be.visible');
    
    // Click cancel
    cy.contains('button', 'Cancel').click();
    
    // Dialog should be gone
    cy.get('[data-testid="confirm-seat-btn"]').should('not.exist');
    cy.get('[data-testid="observer-view"]').should('be.visible');
  });

  it('should show range information when custom is selected', () => {
    // Navigate to seat selection
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('RangeTest');
    cy.get('[data-testid="join-as-observer"]').click();
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Select custom to show range info
    cy.get('[data-testid="buyin-dropdown"]').select('-1');
    
    // Should show range and table info
    cy.contains('Min:').should('be.visible');
    cy.contains('Max:').should('be.visible');
    cy.contains('Stakes:').should('be.visible');
    cy.contains('Big Blind:').should('be.visible');
  });
}); 