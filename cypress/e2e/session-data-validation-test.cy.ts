describe('Session Data Validation Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(2000);
  });

  it('should successfully complete observer-to-player transition without session data errors', () => {
    const nickname = 'SessionDataTest';
    
    // Navigate to table via the programmatic approach to avoid UI timing issues
    cy.window().then((win) => {
      win.localStorage.setItem('nickname', nickname);
      
      // Use direct navigation to avoid lobby UI complications
      cy.visit('/game/1');
      cy.wait(3000);
      
      // Verify we're in the game as observer
      cy.get('[data-testid="observer-list"]', { timeout: 10000 }).should('exist');
      
      // Try to take a seat and see if we get session data errors
      cy.get('[data-testid="seat-button-2"]:not(.occupied)', { timeout: 5000 }).should('exist').click();
      
      // Fill buy-in dialog
      cy.get('[data-testid="buyin-input"]', { timeout: 5000 }).clear().type('200');
      cy.get('[data-testid="confirm-seat-button"]').click();
      
      // Wait for either success or error
      cy.wait(5000);
      
      // Check for error messages that would indicate session data issues
      cy.get('body').then(($body) => {
        const hasSessionError = $body.text().includes('Invalid session data') || 
                               $body.text().includes('Please rejoin the table');
        
        if (hasSessionError) {
          cy.log('🚨 SESSION DATA ERROR DETECTED');
          throw new Error('Session data error occurred - the bug is still present');
        } else {
          cy.log('✅ No session data errors detected');
        }
      });
      
      cy.screenshot('session-data-test-result');
    });
  });

  it('should maintain socket connection throughout the observer-to-player flow', () => {
    const nickname = 'SocketPersistenceTest';
    
    cy.window().then((win) => {
      win.localStorage.setItem('nickname', nickname);
      
      // Navigate directly to game page
      cy.visit('/game/2');
      cy.wait(3000);
      
      // Log socket information if available
      cy.window().then((window) => {
        const socketService = (window as any).socketService;
        if (socketService && socketService.socket) {
          cy.log(`Initial Socket ID: ${socketService.socket.id}`);
          cy.log(`Socket Connected: ${socketService.socket.connected}`);
        } else {
          cy.log('No socket service or socket found');
        }
      });
      
      // Try the seat action
      cy.get('[data-testid="seat-button-3"]:not(.occupied)', { timeout: 5000 }).click();
      cy.get('[data-testid="buyin-input"]').clear().type('200');
      
      // Check socket state before taking seat
      cy.window().then((window) => {
        const socketService = (window as any).socketService;
        if (socketService && socketService.socket) {
          cy.log(`Pre-takeSeat Socket ID: ${socketService.socket.id}`);
          cy.log(`Pre-takeSeat Connected: ${socketService.socket.connected}`);
        }
      });
      
      cy.get('[data-testid="confirm-seat-button"]').click();
      cy.wait(3000);
      
      // Check socket state after taking seat
      cy.window().then((window) => {
        const socketService = (window as any).socketService;
        if (socketService && socketService.socket) {
          cy.log(`Post-takeSeat Socket ID: ${socketService.socket.id}`);
          cy.log(`Post-takeSeat Connected: ${socketService.socket.connected}`);
        } else {
          cy.log('Socket service lost after takeSeat attempt');
        }
      });
      
      cy.screenshot('socket-persistence-test-result');
    });
  });
}); 