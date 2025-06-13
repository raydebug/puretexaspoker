describe('Join Table Button States for Anonymous Users', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should disable all join table buttons for anonymous users', () => {
    // Start in anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="anonymous-status"]').should('contain', 'Browsing Anonymously');
    
    // Wait for tables to load
    cy.get('[data-testid="table-grid"]').should('be.visible');
    cy.get('[data-testid^="join-table-"]').should('have.length.greaterThan', 0);
    
    // **CRITICAL CHECK 1: All join table buttons should be disabled**
    cy.get('[data-testid^="join-table-"]').each(($button) => {
      cy.wrap($button).should('be.disabled');
      cy.log('✅ Join table button is disabled for anonymous user');
    });
  });

  it('should show "Login to Join" text for disabled buttons', () => {
    // Start anonymous
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // **CRITICAL CHECK 2: Button text should indicate login required**
    cy.get('[data-testid^="join-table-"]').each(($button) => {
      cy.wrap($button).should('contain', 'Login to Join');
      cy.wrap($button).should('not.contain', 'Join Table');
      cy.log('✅ Button shows "Login to Join" text');
    });
  });

  it('should have inactive styling for disabled buttons', () => {
    // Start anonymous
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // **CRITICAL CHECK 3: Disabled buttons should have inactive styling**
    cy.get('[data-testid^="join-table-"]').first().then(($button) => {
      // Check that button has disabled styling (exact styles depend on implementation)
      cy.wrap($button).should('have.css', 'cursor', 'not-allowed');
      // Common disabled button styles
      cy.wrap($button).should('satisfy', ($el) => {
        const computedStyle = window.getComputedStyle($el[0]);
        const opacity = parseFloat(computedStyle.opacity);
        const cursor = computedStyle.cursor;
        
        // Button should either have reduced opacity or disabled cursor
        return opacity < 1.0 || cursor === 'not-allowed' || cursor === 'default';
      });
      cy.log('✅ Button has inactive styling');
    });
  });

  it('should enable join table buttons after login', () => {
    const testNickname = `EnableTest${Date.now()}`;
    
    // Start anonymous - buttons should be disabled
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    cy.get('[data-testid^="join-table-"]').first().should('be.disabled');
    cy.get('[data-testid^="join-table-"]').first().should('contain', 'Login to Join');
    
    // Login
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    
    // Verify logged in state
    cy.get('[data-testid="user-info"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', `Welcome, ${testNickname}`);
    
    // **CRITICAL CHECK 4: Buttons should now be enabled**
    cy.get('[data-testid^="join-table-"]').each(($button) => {
      cy.wrap($button).should('not.be.disabled');
      cy.wrap($button).should('contain', 'Join Table');
      cy.wrap($button).should('not.contain', 'Login to Join');
      cy.log('✅ Join table button is enabled after login');
    });
  });

  it('should disable buttons again after logout', () => {
    const testNickname = `LogoutTest${Date.now()}`;
    
    // Login first
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="nickname-input"]').type(testNickname);
    cy.get('[data-testid="join-button"]').click();
    cy.get('[data-testid="user-info"]').should('be.visible');
    
    // Verify buttons are enabled
    cy.get('[data-testid^="join-table-"]').first().should('not.be.disabled');
    cy.get('[data-testid^="join-table-"]').first().should('contain', 'Join Table');
    
    // Logout
    cy.get('[data-testid="logout-button"]').click();
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="browse-anonymously-button"]').click();
    
    // Verify anonymous state
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('not.exist');
    
    // **CRITICAL CHECK 5: Buttons should be disabled again**
    cy.get('[data-testid^="join-table-"]').each(($button) => {
      cy.wrap($button).should('be.disabled');
      cy.wrap($button).should('contain', 'Login to Join');
      cy.wrap($button).should('not.contain', 'Join Table');
      cy.log('✅ Join table button is disabled after logout');
    });
  });

  it('should show tooltip on hover for disabled buttons', () => {
    // Start anonymous
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // **CRITICAL CHECK 6: Check title attribute for tooltip**
    cy.get('[data-testid^="join-table-"]').first().should('have.attr', 'title');
    cy.get('[data-testid^="join-table-"]').first().then(($btn) => {
      const title = $btn.attr('title');
      expect(title).to.include('login');
      cy.log('✅ Button has title attribute with login message');
    });
    
    // Also verify the title attribute contains the expected text
    cy.get('[data-testid^="join-table-"]').first().should('have.attr', 'title', 'Please login to join tables');
    cy.log('✅ Tooltip shows correct message for disabled button');
  });

  it('should trigger login modal when disabled button is clicked (fallback behavior)', () => {
    // Start anonymous
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Verify button is disabled
    cy.get('[data-testid^="join-table-"]').first().should('be.disabled');
    
    // **CRITICAL CHECK 7: Even if disabled, clicking should trigger login (fallback)**
    // Note: This might need to be implemented as a click handler on the button container
    cy.get('[data-testid^="join-table-"]').first().click({ force: true });
    
    // Should trigger login modal as fallback
    cy.get('[data-testid="nickname-modal"]').should('be.visible');
    cy.get('[data-testid="nickname-input"]').should('be.visible');
    cy.log('✅ Clicking disabled button triggers login modal as fallback');
  });

  it('should prevent navigation when buttons are disabled', () => {
    // Start anonymous
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Get current URL
    cy.url().then((currentUrl) => {
      // Try to click disabled button
      cy.get('[data-testid^="join-table-"]').first().should('be.disabled');
      cy.get('[data-testid^="join-table-"]').first().click({ force: true });
      
      // **CRITICAL CHECK 8: URL should not change to game page**
      cy.url().should('eq', currentUrl);
      cy.url().should('not.include', '/game/');
      cy.log('✅ Disabled button prevents navigation to game page');
      
      // Login modal appears instead of navigation
      cy.get('[data-testid="nickname-modal"]').should('be.visible');
      
      // Close modal to check that we're still in lobby
      cy.get('[data-testid="browse-anonymously-button"]').click();
      cy.get('[data-testid="table-grid"]').should('be.visible');
      cy.get('[data-testid="anonymous-info"]').should('be.visible');
    });
  });

  it('should maintain disabled state during page interactions', () => {
    // Start anonymous
    cy.get('[data-testid="anonymous-info"]').should('be.visible');
    cy.get('[data-testid="table-grid"]').should('be.visible');
    
    // Verify initial disabled state
    cy.get('[data-testid^="join-table-"]').first().should('be.disabled');
    
    // Interact with page (use viewport scroll instead of element scroll)
    cy.scrollTo('bottom');
    cy.wait(500);
    cy.scrollTo('top');
    
    // Check if filters exist and interact with them
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="table-filters"]').length > 0) {
        cy.get('[data-testid="table-filters"]').should('be.visible');
        cy.log('Table filters found - testing interaction');
      }
    });
    
    // **CRITICAL CHECK 9: Buttons should remain disabled after interactions**
    cy.get('[data-testid^="join-table-"]').each(($button) => {
      cy.wrap($button).should('be.disabled');
      cy.wrap($button).should('contain', 'Login to Join');
    });
    
    cy.log('✅ Disabled state maintained during page interactions');
  });
}); 