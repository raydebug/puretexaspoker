describe('Debug Location Update Issue', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'DebugLocationPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should debug location update process step by step', () => {
    const playerName = 'DebugLocationPlayer';
    
    // Step 1: Check initial location
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const initialLocation = socketService.getCurrentUserLocation();
        cy.log('🔍 INITIAL LOCATION:', initialLocation);
        expect(initialLocation).to.equal('lobby');
      }
    });
    
    // Step 2: Monitor socket events
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const socket = socketService.getSocket();
        if (socket) {
          // Set up event monitoring
          socket.on('tableJoined', (data) => {
            cy.log('🔍 RECEIVED tableJoined:', JSON.stringify(data));
          });
          
          socket.on('location:updated', (data) => {
            cy.log('🔍 RECEIVED location:updated:', JSON.stringify(data));
          });
          
          socket.on('gameJoined', (data) => {
            cy.log('🔍 RECEIVED gameJoined:', JSON.stringify(data));
          });
        }
      }
    });
    
    // Step 3: Click to join table
    cy.log('🔍 CLICKING JOIN BUTTON');
    cy.get('[data-testid="table-row"]').first().click();
    
    // Step 4: Handle nickname modal if it appears
    cy.get('body').then((body) => {
      if (body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.log('🔍 NICKNAME MODAL APPEARED');
        cy.get('[data-testid="nickname-input"]').clear().type(playerName);
        cy.get('[data-testid="join-as-observer"]').click();
      } else {
        cy.log('🔍 NO NICKNAME MODAL - ALREADY SET VIA COOKIE');
      }
    });
    
    // Step 5: Wait for any navigation or changes
    cy.wait(3000);
    
    // Step 6: Check what happened to location
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        const currentLocation = socketService.getCurrentUserLocation();
        cy.log('🔍 FINAL LOCATION:', currentLocation);
        
        // Log socket connection status
        const socket = socketService.getSocket();
        cy.log('🔍 SOCKET CONNECTED:', socket?.connected);
        cy.log('🔍 SOCKET ID:', socket?.id);
      }
    });
    
    // Step 7: Check current URL
    cy.url().then((url) => {
      cy.log('🔍 CURRENT URL:', url);
    });
    
    // Step 8: Check if observer view is visible
    cy.get('body').then((body) => {
      if (body.find('[data-testid="observer-view"]').length > 0) {
        cy.log('🔍 OBSERVER VIEW IS VISIBLE');
        cy.get('[data-testid="observer-view"]').should('be.visible');
      } else {
        cy.log('🔍 OBSERVER VIEW NOT FOUND - STILL IN LOBBY?');
        cy.get('[data-testid="lobby-container"]').should('be.visible');
      }
    });
  });

  it('should manually test join table function', () => {
    // Test the socket service joinTable method directly
    cy.window().then((win) => {
      const socketService = (win as any).socketService;
      if (socketService) {
        cy.log('🔍 TESTING DIRECT joinTable CALL');
        
        // Try to join table 1 directly
        socketService.joinTable(1);
        
        // Wait and check
        cy.wait(2000).then(() => {
          const newLocation = socketService.getCurrentUserLocation();
          cy.log('🔍 LOCATION AFTER DIRECT CALL:', newLocation);
        });
      }
    });
  });
}); 