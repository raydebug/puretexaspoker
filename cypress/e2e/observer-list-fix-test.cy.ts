describe('Observer List Fix Validation', () => {
  const testUserId = `FixTest_${Date.now()}`;

  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
  });

  it('should show observer in the list immediately after joining', () => {
    // Step 1: Join table as observer
    cy.log('🎯 Joining table as observer with user: ' + testUserId);
    
    // Wait for tables to load
    cy.get('[data-testid="table-1"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    
    // Enter nickname and join
    cy.get('[data-testid="nickname-input"]').clear().type(testUserId);
    cy.get('[data-testid="join-button"]').click();
    
    // Step 2: Verify navigation to game page
    cy.url().should('include', '/game/1');
    
    // Step 3: Verify observer appears in the UI immediately
    cy.log('🎯 Verifying observer appears in UI');
    
    // Wait for the observer count to be > 0
    cy.get('[data-testid="observer-count"]', { timeout: 15000 }).should(($el) => {
      const count = parseInt($el.text());
      expect(count).to.be.greaterThan(0);
    });
    
    // Verify the observer name appears in the list
    cy.get('[data-testid="observer-list"]').should('contain', testUserId);
    
    // Step 4: Verify SocketService state is correct
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        cy.wrap(socketService.observers).should('include', testUserId);
        cy.log('✅ SocketService correctly has observer: ' + testUserId);
      }
    });
    
    cy.log('✅ Observer list fix test passed!');
  });
}); 