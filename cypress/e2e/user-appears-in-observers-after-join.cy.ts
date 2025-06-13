describe('User Appears in Observers After Join Table', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
  });

  it('should show user in observers list after joining table as observer', () => {
    const observerName = `Observer${Date.now()}`;

    // Step 1: Join table as observer
    cy.log('🎯 Step 1: Join table as observer');
    cy.get('[data-testid="table-row"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="table-row"]').first().click();
    
    // Login with unique nickname
    cy.get('[data-testid="nickname-input"]').clear().type(observerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Step 2: Wait for navigation to game page
    cy.log('🎯 Step 2: Verify navigation to game page');
    cy.url().should('include', '/game/');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Step 3: Verify observers list shows user (not online users count)
    cy.log('🎯 Step 3: Verify user appears in observers list');
    cy.get('[data-testid="online-users-list"]', { timeout: 10000 }).should('be.visible');
    
    // Should show "Observers (1)" - NOT "Online Users: 1"
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (1)').should('be.visible');
      cy.contains('Online Users').should('not.exist');
      
      // User should appear in the observers list
      cy.contains(observerName).should('be.visible');
    });
    
    cy.log('✅ Success: User appears in observers list after joining table');
  });

  it('should show empty observers list when no observers', () => {
    // Visit game page directly (no observers)
    cy.visit('/game/1');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Should show "Observers (0)" with "No observers" message
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (0)').should('be.visible');
      cy.contains('No observers').should('be.visible');
      cy.contains('Online Users').should('not.exist');
    });
  });

  it('should update observers count when multiple users join', () => {
    const observer1 = `Observer1_${Date.now()}`;
    const observer2 = `Observer2_${Date.now()}`;

    // First observer joins
    cy.log('🎯 First observer joins');
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observer1);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url().should('include', '/game/');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify first observer appears
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (1)').should('be.visible');
      cy.contains(observer1).should('be.visible');
    });

    // Leave table to prepare for second observer test
    cy.get('button').contains('Leave Table').click();
    cy.url().should('include', '/');

    // Second observer joins same table (table navigation might change the URL)
    cy.log('🎯 Second observer joins');
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observer2);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url().should('include', '/game/');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Verify second observer appears in list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      cy.contains(observer2).should('be.visible');
      
      // Should NOT show online users count
      cy.contains('Online Users').should('not.exist');
    });
  });

  it('should remove user from observers list when taking a seat', () => {
    const testUser = `Player${Date.now()}`;

    // Join as observer
    cy.log('🎯 Step 1: Join as observer');
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(testUser);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url().should('include', '/game/');
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
    
    // Wait for seat transition
    cy.wait(3000);
    
    // Verify user is removed from observers list
    cy.log('🎯 Step 3: Verify user removed from observers');
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers (0)').should('be.visible');
      cy.contains('No observers').should('be.visible');
      cy.contains(testUser).should('not.exist');
      
      // Still should NOT show online users count
      cy.contains('Online Users').should('not.exist');
    });
  });

  it('should maintain correct format for observers list display', () => {
    const observer = `FormatTest${Date.now()}`;

    // Join as observer
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(observer);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.url().should('include', '/game/');
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Check specific UI formatting requirements
    cy.get('[data-testid="online-users-list"]').within(() => {
      // Title should be "Observers (X)" format
      cy.get('h3').should('contain.text', 'Observers (1)');
      
      // Observer name should be displayed as individual item
      cy.get('[data-testid="observer-0"]').should('contain.text', observer);
      
      // Should NEVER show online users related text
      cy.contains('Online Users').should('not.exist');
      cy.contains('Total').should('not.exist');
      cy.contains('Count').should('not.exist');
    });
  });
}); 