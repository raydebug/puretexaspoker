describe('Seat Selection Dropdown Simple Test', () => {
  it('should show dropdown with buy-in options', () => {
    // Visit the lobby page
    cy.visit('/');
    
    // Set a test nickname
    cy.setCookie('playerNickname', 'SimpleTestPlayer');
    
    // Wait for lobby to load and join as observer
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type('SimpleTestPlayer');
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Click on an available seat
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Seat selection dialog should appear
    cy.get('[data-testid="confirm-seat-btn"]').should('be.visible');
    cy.get('[data-testid="buyin-dropdown"]').should('be.visible');
    
    // Log dropdown options for debugging
    cy.get('[data-testid="buyin-dropdown"] option').then($options => {
      const options = Array.from($options).map(o => ({ value: o.value, text: o.textContent }));
      cy.log('Dropdown options:', JSON.stringify(options));
    });
    
    // Select the first available option (should be 10x BB = $200)
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.log('First option value:', value);
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    
    // Verify button shows correct amount
    cy.get('[data-testid="confirm-seat-btn"]')
      .should('contain', 'Take Seat with')
      .should('contain', '$');
      
    // Try custom amount
    cy.get('[data-testid="buyin-dropdown"]').select('-1'); // Custom Amount
    cy.get('[data-testid="custom-buyin-input"]').should('be.visible');
    cy.get('[data-testid="custom-buyin-input"]').type('500');
    cy.get('[data-testid="confirm-seat-btn"]').should('contain', '$500');
  });
}); 