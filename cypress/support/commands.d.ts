/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Join the game with the specified nickname
     * @param nickname The player's nickname
     */
    joinGame(nickname: string): Chainable<Element>;

    /**
     * Open the seat menu for the current player
     */
    openSeatMenu(): Chainable<Element>;

    /**
     * Set the player's status to away or back
     * @param status The desired status ('away' or 'back')
     */
    setPlayerStatus(status: 'away' | 'back'): Chainable<Element>;

    /**
     * Place a bet of the specified amount
     * @param amount The bet amount
     */
    placeBet(amount: number): Chainable<Element>;

    /**
     * Check action (renamed from 'check' to avoid collision with built-in command)
     */
    checkAction(): Chainable<Element>;
    
    /**
     * Wait for a specific number of players to be seated
     * @param count Expected number of players
     */
    waitForPlayers(count: number): Chainable<Element>;
    
    /**
     * Wait for a hand to complete
     */
    waitForHandCompletion(): Chainable<Element>;
    
    /**
     * Wait for the game phase to reach a specific value
     * @param phase Expected game phase
     */
    waitForPhase(phase: string): Chainable<Element>;
    
    /**
     * Enter a nickname
     * @param nickname The player's nickname
     */
    enterNickname(nickname: string): Chainable<Element>;
    
    /**
     * Join a specific table
     * @param tableId The ID of the table to join
     * @param buyIn The buy-in amount
     */
    joinTable(tableId: string, buyIn: number): Chainable<Element>;
    
    /**
     * Take a seat at the table
     * @param seatNumber The seat number to take
     */
    takeSeat(seatNumber: number): Chainable<Element>;
    
    /**
     * Get an element by its data-testid attribute
     * @param testId The data-testid value
     */
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

    // Game Actions
    fold(): Chainable<Element>;
    call(): Chainable<Element>;
    bet(amount: number): Chainable<Element>;
    raise(amount: number): Chainable<Element>;

    // Chat Actions
    sendChatMessage(message: string): Chainable<Element>;

    // Helper Functions
    waitForTurn(): Chainable<Element>;
    leaveTable(): Chainable<Element>;
    waitForGameAction(): Chainable<Element>;
    openNewSession(): Chainable<Element>;
    verifyChips(playerName: string, expectedChipsMin: number, expectedChipsMax: number): Chainable<Element>;
  }
} 