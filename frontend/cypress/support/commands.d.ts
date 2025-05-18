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
     * Get an element by its data-testid attribute
     * @param testId The data-testid value
     */
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
  }
} 