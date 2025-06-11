describe('Complete Observer to Player Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Set the cookie directly (this approach works in successful tests)
    cy.setCookie('playerNickname', 'FlowTestUser');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should complete join table → take seat → change seat flow', () => {
    const playerName = 'SeatChangeTest';
    
    // **STEP 1: JOIN TABLE AS OBSERVER**
    cy.log('🎯 STEP 1: Joining table as observer');
    
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Handle optional welcome popup
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-popup"]').length > 0) {
        cy.get('[data-testid="welcome-popup"]', { timeout: 4000 }).should('not.exist');
        cy.log('✅ Welcome popup handled');
      }
    });
    
    // Wait for observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.log('✅ Successfully joined table as observer');
    
    // **STEP 2: TAKE FIRST SEAT**
    cy.log('🎯 STEP 2: Taking first available seat');
    
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    cy.log('✅ Successfully took first seat');
    
    // Verify seat taken (dialog gone)
    cy.get('[data-testid="confirm-seat-btn"]').should('not.exist');
    cy.wait(2000);
    
    // **STEP 3: TAKE DIFFERENT SEAT**
    cy.log('🎯 STEP 3: Taking second seat');
    
    // Click on another available seat
    cy.get('[data-testid^="available-seat-"]').eq(1).click();
    cy.get('[data-testid="buyin-dropdown"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="buyin-dropdown"] option').eq(0).then($option => {
      const value = $option.val();
      cy.get('[data-testid="buyin-dropdown"]').select(String(value));
    });
    cy.get('[data-testid="confirm-seat-btn"]').click();
    cy.log('✅ Successfully changed to second seat');
    
    // Verify second seat taken
    cy.get('[data-testid="confirm-seat-btn"]').should('not.exist');
    cy.wait(2000);
    
    cy.log('🎉 SEAT CHANGE FLOW COMPLETED: join → first seat → second seat');
  });
}); 