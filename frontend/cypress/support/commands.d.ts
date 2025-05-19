/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Join the game with the specified nickname
     * @param nickname The player's nickname
     */
    joinGame(nickname: string): Chainable<void>;

    /**
     * Open the seat menu for the current player
     */
    openSeatMenu(): Chainable<void>;

    /**
     * Set the player's status to away or back
     * @param status The desired status ('away' or 'back')
     */
    setPlayerStatus(status: 'away' | 'back'): Chainable<void>;

    /**
     * Place a bet of the specified amount
     * @param amount The bet amount
     */
    placeBet(amount: number): Chainable<void>;

    /**
     * Check action (renamed from 'check' to avoid collision with built-in command)
     */
    checkAction(): Chainable<void>;
    
    /**
     * Wait for a specific number of players to be seated
     * @param count Expected number of players
     */
    waitForPlayers(count: number): Chainable<void>;
    
    /**
     * Wait for a hand to complete
     */
    waitForHandCompletion(): Chainable<void>;
    
    /**
     * Wait for the game phase to reach a specific value
     * @param phase Expected game phase
     */
    waitForPhase(phase: string): Chainable<void>;
    
    /**
     * Enter a nickname
     * @param nickname The player's nickname
     */
    enterNickname(nickname: string): Chainable<void>;
    
    /**
     * Join a specific table
     * @param tableId The ID of the table to join
     * @param buyIn The buy-in amount
     */
    joinTable(tableId: string, buyIn: number): Chainable<void>;
    
    /**
     * Take a seat at the table
     * @param seatNumber The seat number to take
     */
    takeSeat(seatNumber: number): Chainable<void>;
    
    /**
     * Get an element by its data-testid attribute
     * @param testId The data-testid value
     */
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
  }
} 