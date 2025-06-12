describe('Duplicate Player Fix Test', () => {
  const playerName = 'DuplicateTestUser';

  beforeEach(() => {
    // Clear any existing data
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Visit the application
    cy.visit('http://localhost:3000');
    cy.wait(2000); // Allow initial load
  });

  it('should prevent duplicate players when same nickname reconnects', () => {
    cy.log('🧪 TESTING: Duplicate Player Prevention');
    
    // Set initial nickname
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.get('[data-testid="nickname-input"]').type(playerName);
        cy.get('[data-testid="join-button"]').click();
        cy.wait(1000);
      }
    });

    // First connection: Join table as observer
    cy.log('📍 STEP 1: First connection - Join as observer');
    cy.get('[data-testid="join-table-1"]').click({ force: true });
    
    // Handle any additional nickname modal
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.get('[data-testid="nickname-input"]').clear().type(playerName);
        cy.get('[data-testid="join-as-observer"]').click();
        cy.wait(2000);
      }
    });

    // Should be in observer view
    cy.url().should('include', '/game/');
    
    // Check that user appears once in observers list
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Observers').should('be.visible');
      // Count instances of the player name (should be 1)
      cy.get('body').then(($list) => {
        const instances = ($list.text().match(new RegExp(playerName, 'g')) || []).length;
        expect(instances).to.equal(1);
        cy.log(`✅ Player appears ${instances} time(s) in observers list (expected: 1)`);
      });
    });

    // Take a seat
    cy.log('📍 STEP 2: Take a seat');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Handle seat confirmation
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="confirm-seat"]').length > 0) {
        cy.get('[data-testid="confirm-seat"]').click();
        cy.wait(2000);
      }
    });

    // Player should now be seated (appears in Players section)
    cy.get('[data-testid="online-users-list"]').within(() => {
      cy.contains('Players').should('be.visible');
      // Player should appear exactly once in the entire list
      cy.get('body').then(($list) => {
        const instances = ($list.text().match(new RegExp(playerName, 'g')) || []).length;
        expect(instances).to.equal(1);
        cy.log(`✅ Player appears ${instances} time(s) total after taking seat (expected: 1)`);
      });
    });

    // Simulate disconnect and reconnect by refreshing page
    cy.log('📍 STEP 3: Simulate reconnection');
    cy.reload();
    cy.wait(3000);

    // Set nickname again (simulating reconnect with same nickname)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.get('[data-testid="nickname-input"]').type(playerName);
        cy.get('[data-testid="join-button"]').click();
        cy.wait(1000);
      }
    });

    // Join same table again
    cy.get('[data-testid="join-table-1"]').click({ force: true });
    
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="nickname-modal"]').length > 0) {
        cy.get('[data-testid="nickname-input"]').clear().type(playerName);
        cy.get('[data-testid="join-as-observer"]').click();
        cy.wait(3000);
      }
    });

    // CRITICAL TEST: Player should NOT be duplicated
    cy.log('📍 STEP 4: Verify no duplicates after reconnection');
    cy.get('[data-testid="online-users-list"]').then(($list) => {
      const listText = $list.text();
      const instances = (listText.match(new RegExp(playerName, 'g')) || []).length;
      
      // Player should appear at most once (could be 0 if cleanup removed them)
      expect(instances).to.be.at.most(1);
      cy.log(`✅ DUPLICATE FIX TEST PASSED: Player appears ${instances} time(s) after reconnection (expected: ≤1)`);
      
      if (instances === 0) {
        cy.log('ℹ️ Player was cleaned up during reconnection - this is acceptable');
      } else if (instances === 1) {
        cy.log('✅ Player appears exactly once - duplicate prevention working');
      }
    });

    // Verify no duplicate seated players on table
    cy.get('[data-testid="poker-table"]').then(($table) => {
      const tableText = $table.text();
      const tableInstances = (tableText.match(new RegExp(playerName, 'g')) || []).length;
      
      expect(tableInstances).to.be.at.most(1);
      cy.log(`✅ TABLE DUPLICATE CHECK: Player appears ${tableInstances} time(s) on poker table (expected: ≤1)`);
    });

    cy.log('🎉 DUPLICATE PLAYER FIX TEST COMPLETED SUCCESSFULLY');
  });

  it('should handle multiple reconnections without creating duplicates', () => {
    cy.log('🧪 TESTING: Multiple Reconnections');
    
    // Helper function to join table
    const joinTable = () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="nickname-modal"]').length > 0) {
          cy.get('[data-testid="nickname-input"]').clear().type(playerName);
          cy.get('[data-testid="join-button"]').click();
          cy.wait(1000);
        }
      });

      cy.get('[data-testid="join-table-1"]').click({ force: true });
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="nickname-modal"]').length > 0) {
          cy.get('[data-testid="nickname-input"]').clear().type(playerName);
          cy.get('[data-testid="join-as-observer"]').click();
          cy.wait(2000);
        }
      });
    };

    // Helper function to check for duplicates
    const checkForDuplicates = (stepNumber: number) => {
      cy.get('[data-testid="online-users-list"]').then(($list) => {
        const instances = ($list.text().match(new RegExp(playerName, 'g')) || []).length;
        expect(instances).to.be.at.most(1);
        cy.log(`✅ Step ${stepNumber}: Player appears ${instances} time(s) (expected: ≤1)`);
      });
    };

    // First connection
    joinTable();
    checkForDuplicates(1);

    // Second connection (refresh)
    cy.reload();
    cy.wait(2000);
    joinTable();
    checkForDuplicates(2);

    // Third connection (refresh)
    cy.reload();
    cy.wait(2000);
    joinTable();
    checkForDuplicates(3);

    cy.log('🎉 MULTIPLE RECONNECTION TEST COMPLETED SUCCESSFULLY');
  });
}); 