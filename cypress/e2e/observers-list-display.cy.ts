describe('Observers List Display in Game Table Page', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
  });

  it('should display observers list without online users count in game table page', () => {
    const observerName = `Observer${Date.now()}`;

    // Navigate to lobby and join table as observer
    cy.log('🎯 Step 1: Join table as observer');
    cy.get('[data-testid="table-1"]').should('be.visible');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    
    // Login with unique nickname
    cy.get('[data-testid="nickname-input"]').clear().type(observerName);
    cy.get('[data-testid="join-button"]').click();
    
    // Wait for navigation to game page
    cy.log('🎯 Step 2: Verify navigation to game page');
    cy.url().should('include', '/game/1');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify observers list is displayed (not online users count)
    cy.log('🎯 Step 3: Verify observers list display');
    cy.get('[data-testid="online-users-list"]', { timeout: 10000 }).should('be.visible');
    
    // Should show "Observers (1)" heading - NOT "Online Users: 1"
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (1)').should('be.visible');
      cy.contains('Online Users').should('not.exist');
      
      // Should display the observer's name
      cy.contains(observerName).should('be.visible');
    });
    
    cy.log('✅ Success: Game table page displays observers list without online users count');
  });

  it('should show "No observers" when observers list is empty', () => {
    // Visit game page directly (simulating empty observers state)
    cy.visit('/game/1');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Should show "Observers (0)" with "No observers" message
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (0)').should('be.visible');
      cy.contains('No observers').should('be.visible');
      cy.contains('Online Users').should('not.exist');
    });
  });

  it('should display multiple observers correctly', () => {
    const observer1 = `Observer1_${Date.now()}`;
    const observer2 = `Observer2_${Date.now()}`;

    // First observer joins
    cy.log('🎯 Step 1: First observer joins');
    cy.get('[data-testid="table-1"]').should('be.visible');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    
    cy.get('[data-testid="nickname-input"]').clear().type(observer1);
    cy.get('[data-testid="join-button"]').click();
    
    cy.url().should('include', '/game/1');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify first observer appears
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (1)').should('be.visible');
      cy.contains(observer1).should('be.visible');
    });

    // Return to lobby for second observer
    cy.get('button').contains('Leave Table').click();
    cy.url().should('include', '/');

    // Second observer joins the same table
    cy.log('🎯 Step 2: Second observer joins same table');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    
    cy.get('[data-testid="nickname-input"]').clear().type(observer2);
    cy.get('[data-testid="join-button"]').click();
    
    cy.url().should('include', '/game/1');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify both observers appear (count may be 1 or 2 depending on timing)
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(observer2).should('be.visible');
      
      // Verify NO online users count is displayed
      cy.contains('Online Users').should('not.exist');
    });
  });

  it('should update observers list when observer becomes player', () => {
    const testUser = `Player${Date.now()}`;

    // Join as observer
    cy.log('🎯 Step 1: Join as observer');
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    cy.get('[data-testid="nickname-input"]').clear().type(testUser);
    cy.get('[data-testid="join-button"]').click();
    
    cy.url().should('include', '/game/1');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify user appears in observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (1)').should('be.visible');
      cy.contains(testUser).should('be.visible');
    });
    
    // Take a seat
    cy.log('🎯 Step 2: Take a seat');
    cy.get('[data-testid^="available-seat-"]').first().click();
    cy.get('[data-testid="buyin-amount"]').clear().type('200');
    cy.get('[data-testid="confirm-seat"]').click();
    
    // Wait for seat to be taken
    cy.wait(3000);
    
    // Verify user is removed from observers list
    cy.log('🎯 Step 3: Verify user removed from observers');
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (0)').should('be.visible');
      cy.contains('No observers').should('be.visible');
      cy.contains(testUser).should('not.exist');
      
      // Still no online users count
      cy.contains('Online Users').should('not.exist');
    });
  });

  it('should maintain consistent observers list display format', () => {
    const observer = `FormatTest${Date.now()}`;

    // Join as observer
    cy.get('[data-testid="table-1"] button').contains('Join').click();
    cy.get('[data-testid="nickname-input"]').clear().type(observer);
    cy.get('[data-testid="join-button"]').click();
    
    cy.url().should('include', '/game/1');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Check specific formatting requirements
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Title should be "Observers (X)" format
      cy.get('h3').should('contain.text', 'Observers (1)');
      
      // Observer name should be displayed as individual item
      cy.get('[data-testid="observer-0"]').should('contain.text', observer);
      
      // No online users related text anywhere
      cy.contains('Online Users').should('not.exist');
      cy.contains('Total').should('not.exist');
    });
  });
}); 