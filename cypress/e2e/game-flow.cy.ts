/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    joinGame(nickname: string): void;
    setPlayerStatus(status: 'away' | 'back'): void;
    openSeatMenu(): void;
    placeBet(amount: number): void;
    verifyPlayerState(nickname: string, chips: number): void;
    waitForGameStart(): void;
    verifyGamePhase(phase: string): void;
    loginPlayer(nickname: string, chips: number): void;
    joinTable(tableName: string): void;
    checkHand(): void;
    foldHand(): void;
    openNewWindow(): Cypress.Chainable;
    switchToWindow(window: Window): void;
  }
}

describe('Game Flow Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForGameState()
  })

  it('should handle complete game flow with multiple players', () => {
    // Login first player
    cy.login('player1')
    cy.joinGame()
    
    // Login second player in new window
    cy.openNewWindow().then((win) => {
      cy.switchToWindow(win)
      cy.login('player2')
      cy.joinGame()
    })

    // Verify initial game state
    cy.get('[data-testid="game-phase"]').should('contain', 'Waiting')
    cy.get('[data-testid="dealer-button"]').should('be.visible')
    cy.get('[data-testid="small-blind"]').should('be.visible')
    cy.get('[data-testid="big-blind"]').should('be.visible')

    // Start game
    cy.get('[data-testid="start-game-button"]').click()
    
    // Verify blinds are posted
    cy.get('[data-testid="player-chips"]').first().should('contain', '950') // Small blind
    cy.get('[data-testid="player-chips"]').last().should('contain', '900')  // Big blind
    cy.get('[data-testid="pot-amount"]').should('contain', '150')

    // Verify dealer button movement
    cy.get('[data-testid="dealer-button"]').should('have.attr', 'data-position', '0')
    cy.get('[data-testid="small-blind"]').should('have.attr', 'data-position', '1')
    cy.get('[data-testid="big-blind"]').should('have.attr', 'data-position', '2')

    // Complete betting round
    cy.get('[data-testid="current-player"]').should('be.visible')
    cy.placeBet(100)
    cy.get('[data-testid="bet-confirmation"]').should('be.visible')
    
    // Verify flop
    cy.get('[data-testid="community-cards"]').children().should('have.length', 3)
    
    // Verify turn
    cy.get('[data-testid="community-cards"]').children().should('have.length', 4)
    
    // Verify river
    cy.get('[data-testid="community-cards"]').children().should('have.length', 5)
    
    // Verify hand evaluation
    cy.get('[data-testid="hand-result"]').should('be.visible')
    cy.get('[data-testid="winner-announcement"]').should('be.visible')
  })

  it('should handle game phase transitions correctly', () => {
    cy.login('player1')
    cy.joinGame()
    
    // Verify initial phase
    cy.get('[data-testid="game-phase"]').should('contain', 'Waiting')
    
    // Start game
    cy.get('[data-testid="start-game-button"]').click()
    
    // Verify preflop phase
    cy.get('[data-testid="game-phase"]').should('contain', 'Preflop')
    cy.get('[data-testid="community-cards"]').should('not.exist')
    
    // Complete preflop betting
    cy.placeBet(100)
    
    // Verify flop phase
    cy.get('[data-testid="game-phase"]').should('contain', 'Flop')
    cy.get('[data-testid="community-cards"]').children().should('have.length', 3)
    
    // Complete flop betting
    cy.placeBet(50)
    
    // Verify turn phase
    cy.get('[data-testid="game-phase"]').should('contain', 'Turn')
    cy.get('[data-testid="community-cards"]').children().should('have.length', 4)
    
    // Complete turn betting
    cy.placeBet(50)
    
    // Verify river phase
    cy.get('[data-testid="game-phase"]').should('contain', 'River')
    cy.get('[data-testid="community-cards"]').children().should('have.length', 5)
    
    // Complete river betting
    cy.placeBet(50)
    
    // Verify showdown phase
    cy.get('[data-testid="game-phase"]').should('contain', 'Showdown')
    cy.get('[data-testid="hand-result"]').should('be.visible')
  })

  it('should handle dealer button movement between hands', () => {
    // Login two players
    cy.login('player1')
    cy.joinGame()
    
    cy.openNewWindow().then((win) => {
      cy.switchToWindow(win)
      cy.login('player2')
      cy.joinGame()
    })

    // Start first hand
    cy.get('[data-testid="start-game-button"]').click()
    
    // Verify initial dealer position
    cy.get('[data-testid="dealer-button"]').should('have.attr', 'data-position', '0')
    
    // Complete first hand
    cy.placeBet(100)
    cy.get('[data-testid="hand-result"]').should('be.visible')
    
    // Start second hand
    cy.get('[data-testid="start-game-button"]').click()
    
    // Verify dealer button moved
    cy.get('[data-testid="dealer-button"]').should('have.attr', 'data-position', '1')
    
    // Complete second hand
    cy.placeBet(100)
    cy.get('[data-testid="hand-result"]').should('be.visible')
    
    // Start third hand
    cy.get('[data-testid="start-game-button"]').click()
    
    // Verify dealer button moved back
    cy.get('[data-testid="dealer-button"]').should('have.attr', 'data-position', '0')
  })
}) 