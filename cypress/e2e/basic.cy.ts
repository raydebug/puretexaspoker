describe('Basic App Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load the application', () => {
    cy.get('body').should('be.visible')
  })

  it('should have the correct title', () => {
    cy.title().should('include', 'Texas Hold\'em Poker')
  })

  it('should have the main game container', () => {
    cy.get('[data-testid="game-container"]').should('be.visible')
  })
}) 