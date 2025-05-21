describe('Basic Poker Game Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForGameState()
  })

  it('should load the home page', () => {
    cy.get('[data-testid="app-title"]').should('contain', 'Texas Hold\'em Poker')
    cy.get('[data-testid="username-input"]').should('be.visible')
    cy.get('[data-testid="login-button"]').should('be.visible')
  })

  it('should handle invalid login attempts', () => {
    cy.get('[data-testid="login-button"]').click()
    cy.get('[data-testid="error-message"]').should('contain', 'Username is required')
    
    cy.get('[data-testid="username-input"]').type(' ')
    cy.get('[data-testid="login-button"]').click()
    cy.get('[data-testid="error-message"]').should('contain', 'Username cannot be empty')
  })

  it('should allow user to login and join a game', () => {
    cy.login('testuser')
    cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome, testuser')
    cy.get('[data-testid="game-lobby"]').should('be.visible')
    
    cy.joinGame()
    cy.get('[data-testid="game-table"]').should('be.visible')
    cy.get('[data-testid="player-info"]').should('contain', 'testuser')
  })

  it('should handle game actions correctly', () => {
    cy.login('testuser')
    cy.joinGame()
    
    // Test betting
    cy.placeBet(100)
    cy.get('[data-testid="bet-confirmation"]').should('be.visible')
    cy.get('[data-testid="player-chips"]').should('contain', '900')
    
    // Test folding
    cy.fold()
    cy.get('[data-testid="fold-confirmation"]').should('be.visible')
    cy.get('[data-testid="player-status"]').should('contain', 'Folded')
    
    // Test checking hand
    cy.checkHand()
    cy.get('[data-testid="hand-result"]').should('be.visible')
  })

  it('should handle game state updates', () => {
    cy.login('testuser')
    cy.joinGame()
    
    // Wait for game state to be ready
    cy.waitForGameState()
    
    // Verify initial game state
    cy.get('[data-testid="game-phase"]').should('contain', 'Waiting')
    cy.get('[data-testid="pot-amount"]').should('contain', '0')
    
    // Place bet and verify state update
    cy.placeBet(100)
    cy.get('[data-testid="pot-amount"]').should('contain', '100')
  })

  it('should handle player disconnection', () => {
    cy.login('testuser')
    cy.joinGame()
    
    // Simulate disconnection
    cy.window().then((win) => {
      win.dispatchEvent(new Event('offline'))
    })
    
    // Verify reconnection handling
    cy.get('[data-testid="reconnect-message"]').should('be.visible')
    
    // Simulate reconnection
    cy.window().then((win) => {
      win.dispatchEvent(new Event('online'))
    })
    
    // Verify game state is restored
    cy.get('[data-testid="game-table"]').should('be.visible')
  })
}) 