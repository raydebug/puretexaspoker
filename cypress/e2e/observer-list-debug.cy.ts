describe('Observer List Debug Test', () => {
  const testUserId = `ObserverDebugTest_${Date.now()}`;

  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000); // Wait for initial load
  });

  it('should debug the observer list update flow', () => {
    // Step 1: Join table as observer
    cy.log('🎯 Step 1: Joining table as observer');
    cy.get('[data-testid="table-1"]').should('be.visible');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    
    // Fill in nickname
    cy.get('[data-testid="nickname-input"]').clear().type(testUserId);
    cy.get('[data-testid="join-button"]').click();
    
    // Step 2: Wait for navigation to game page
    cy.log('🎯 Step 2: Waiting for navigation to game page');
    cy.url().should('include', '/game/1');
    cy.wait(2000);
    
    // Step 3: Check if observer appears in the observer list
    cy.log('🎯 Step 3: Checking observer list in UI');
    
    // Check for observer in the UI
    cy.get('[data-testid="online-list"]', { timeout: 10000 }).should('be.visible');
    
    // Debug: Check console logs and socketService state
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      
      if (socketService) {
        cy.log('🔍 SocketService observers:', socketService.observers);
        cy.log('🔍 SocketService current user location:', socketService.getCurrentUserLocation());
        cy.log('🔍 SocketService connection status:', socketService.getSocket()?.connected);
        
        // Verify socketService has correct observer data
        cy.wrap(socketService.observers).should('include', testUserId);
        
        // Force trigger onlineUsersUpdate to see if the issue is in the callback chain
        cy.log('🔧 Manually triggering onlineUsersUpdate');
        const gameState = socketService.getGameState();
        const players = gameState?.players || [];
        socketService.emitOnlineUsersUpdate && socketService.emitOnlineUsersUpdate();
      } else {
        cy.log('❌ SocketService not found on window');
      }
    });
    
    // Step 4: Check if observer appears in the actual UI component
    cy.log('🎯 Step 4: Verifying observer appears in UI');
    
    // Wait for observer to appear in UI (with detailed error message if it fails)
    cy.get('[data-testid="observer-count"]').should(($el) => {
      const count = parseInt($el.text());
      if (count === 0) {
        throw new Error(`Observer count is 0 - ${testUserId} not found in UI observer list`);
      }
      expect(count).to.be.greaterThan(0);
    });
    
    // Check observer name appears in the list
    cy.get('[data-testid="observer-list"]').should('contain', testUserId);
    
    cy.log('✅ Observer list debug test completed successfully');
  });
}); 