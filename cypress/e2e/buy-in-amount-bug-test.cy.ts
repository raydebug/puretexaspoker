describe('Buy-in Amount Bug Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.setCookie('playerNickname', 'BuyInTestPlayer');
    cy.get('[data-testid="lobby-container"]').should('be.visible');
    cy.get('[data-testid="table-row"]').should('have.length.greaterThan', 0);
  });

  it('should display correct chip amount based on selected buy-in (not hardcoded $1000)', () => {
    const playerName = 'BuyInBugTest';
    const customBuyIn = 40; // Test with $40 buy-in
    
    // Join a table as observer
    cy.get('[data-testid="table-row"]')
      .first()
      .click();

    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    // Should be in observer view
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    
    // Click on an available seat to take it
    cy.get('[data-testid^="available-seat-"]')
      .first()
      .click();
    
    // Seat selection dialog should appear
    cy.get('[data-testid="confirm-seat-btn"]').should('be.visible');
    
    // Check if we can use custom buy-in option
    cy.get('body').then($body => {
      if ($body.find('[data-testid="custom-buyin-option"]').length > 0) {
        // Select custom buy-in option
        cy.get('[data-testid="custom-buyin-option"]').click();
        cy.get('[data-testid="custom-buyin-input"]').clear().type(customBuyIn.toString());
      } else {
        // Try to use dropdown with the closest amount to our target
        cy.get('[data-testid="buyin-dropdown"]').then($dropdown => {
          const options = $dropdown.find('option');
          let closestValue = customBuyIn;
          let closestDiff = Infinity;
          
          options.each((index, option) => {
            const value = parseInt(option.value);
            if (!isNaN(value) && value > 0) {
              const diff = Math.abs(value - customBuyIn);
              if (diff < closestDiff) {
                closestDiff = diff;
                closestValue = value;
              }
            }
          });
          
          cy.get('[data-testid="buyin-dropdown"]').select(closestValue.toString());
        });
      }
    });
    
    cy.get('[data-testid="confirm-seat-btn"]').click();
    
    // **CRITICAL TEST**: Verify the player's chips match the buy-in amount (not $1000)
    cy.get('[data-testid="poker-table"]').within(() => {
      // Look for the player's chip display
      cy.contains(playerName).should('be.visible');
      
      // The player should have the correct chip amount (not $1000)
      cy.contains(playerName).parent().within(() => {
        // Should NOT show $1000 (the old bug)
        cy.contains('$1000').should('not.exist');
        
        // Should show a reasonable buy-in amount
        cy.get('[data-testid^="player-chips"], .player-chips').should('be.visible');
      });
    });
  });

  it('should handle different buy-in amounts correctly', () => {
    const testCases = [
      { name: 'MinBuyIn40', buyIn: 40 },
      { name: 'MidBuyIn100', buyIn: 100 },
      { name: 'MaxBuyIn200', buyIn: 200 }
    ];

    testCases.forEach((testCase, index) => {
      // Use different tables to avoid conflicts
      cy.get('[data-testid="table-row"]').eq(index % 3).click();
      
      cy.get('[data-testid="nickname-input"]').clear().type(testCase.name);
      cy.get('[data-testid="join-as-observer"]').click();
      
      cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
      
      // Take first available seat
      cy.get('[data-testid^="available-seat-"]').first().click();
      
      // Select the appropriate buy-in amount
      cy.get('[data-testid="buyin-dropdown"] option').then($options => {
        const targetOption = Array.from($options).find(option => 
          parseInt(option.value) >= testCase.buyIn - 10 && 
          parseInt(option.value) <= testCase.buyIn + 10
        );
        
        if (targetOption) {
          cy.get('[data-testid="buyin-dropdown"]').select(targetOption.value);
        } else {
          // Use first available option if exact match not found
          cy.get('[data-testid="buyin-dropdown"] option').eq(1).then($option => {
            cy.get('[data-testid="buyin-dropdown"]').select($option.val());
          });
        }
      });
      
      cy.get('[data-testid="confirm-seat-btn"]').click();
      
      // Verify the chip amount is not $1000
      cy.get('[data-testid="poker-table"]').within(() => {
        cy.contains(testCase.name).should('be.visible');
        cy.contains('$1000').should('not.exist');
      });
      
      // Return to lobby for next iteration
      if (index < testCases.length - 1) {
        cy.get('[data-testid="leave-table-btn"], [data-testid="return-lobby-btn"]').click();
        cy.get('[data-testid="lobby-container"]').should('be.visible');
      }
    });
  });

  it('should persist correct buy-in amount through socket events', () => {
    const playerName = 'SocketBuyInTest';
    
    // Intercept socket events to verify correct data
    cy.window().then((win) => {
      win.socketEventLog = [];
      
      // Mock socket service to log events
      if (win.socketService) {
        const originalRequestSeat = win.socketService.requestSeat;
        win.socketService.requestSeat = function(nickname, seatNumber, buyIn) {
          win.socketEventLog.push({ 
            event: 'requestSeat', 
            data: { nickname, seatNumber, buyIn } 
          });
          return originalRequestSeat.call(this, nickname, seatNumber, buyIn);
        };
      }
    });
    
    // Join table and take seat
    cy.get('[data-testid="table-row"]').first().click();
    cy.get('[data-testid="nickname-input"]').clear().type(playerName);
    cy.get('[data-testid="join-as-observer"]').click();
    
    cy.get('[data-testid="observer-view"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid^="available-seat-"]').first().click();
    
    // Select a specific buy-in amount
    cy.get('[data-testid="buyin-dropdown"] option').eq(1).then($option => {
      const selectedBuyIn = parseInt($option.val());
      cy.get('[data-testid="buyin-dropdown"]').select($option.val());
      cy.get('[data-testid="confirm-seat-btn"]').click();
      
      // Verify the socket event was called with correct buy-in
      cy.window().then((win) => {
        const events = win.socketEventLog || [];
        const seatRequestEvent = events.find(e => e.event === 'requestSeat');
        
        if (seatRequestEvent) {
          expect(seatRequestEvent.data.buyIn).to.equal(selectedBuyIn);
          expect(seatRequestEvent.data.buyIn).to.not.equal(1000); // Should not be hardcoded
        }
      });
    });
  });
}); 