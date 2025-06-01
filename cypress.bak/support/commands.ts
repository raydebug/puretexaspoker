/// <reference types="cypress" />
/// <reference types="chai" />
/// <reference types="chai-jquery" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />
/// <reference path="./chai.d.ts" />
/// <reference path="./jest.d.ts" />
/// <reference path="./cypress.d.ts" />

export {};

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      enterNickname(nickname: string): Chainable<Subject>
      joinGame(nickname?: string): Chainable<void>
      joinTable(tableId: number, buyIn?: number): Chainable<void>
      setPlayerStatus(status: 'away' | 'back'): Chainable<Subject>
      openSeatMenu(): Chainable<Subject>
      placeBet(amount: number): Chainable<Subject>
      verifyPlayerState(nickname: string, chips: number): Chainable<Subject>
      verifyChips(playerName: string, minChips: number, maxChips?: number): Chainable<void>
      waitForGameStart(): Chainable<Subject>
      waitForPhase(phase: string): Chainable<Subject>
      verifyGamePhase(phase: string): Chainable<Subject>
      loginPlayer(nickname: string, chips: number): Chainable<Subject>
      waitForGameAction(action?: string): Chainable<void>
      openNewWindow(): Chainable<Window>
      simulateSlowNetwork(delay: number): Chainable<void>
      attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>
      get<E extends Node = HTMLElement>(selector: string): Chainable<JQuery<E>> & {
        attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>
      }
      stub<T extends object>(obj: T, method: keyof T): Chainable<sinon.SinonStub>
    }
  }
}

declare const cy: Cypress.Chainable;
declare const Cypress: any;
declare const expect: Chai.ExpectStatic;

Cypress.Commands.add('joinGame', (nickname?: string) => {
  if (nickname) {
    cy.get('[data-testid="nickname-input"]').type(nickname);
    cy.get('[data-testid="join-button"]').click();
  } else {
    cy.get('[data-testid="join-button"]').click();
  }
});

Cypress.Commands.add('verifyChips', (playerName: string, minChips: number, maxChips?: number) => {
  cy.get(`[data-testid="player-${playerName}-chips"]`).then($chips => {
    const chips = parseInt($chips.text().replace(/[^0-9]/g, ''));
    expect(chips).to.be.at.least(minChips);
    if (maxChips !== undefined) {
      expect(chips).to.be.at.most(maxChips);
    }
  });
});

Cypress.Commands.add('waitForGameAction', (action?: string) => {
  if (action) {
    cy.get(`[data-testid="game-action-${action}"]`, { timeout: 10000 }).should('be.visible');
  } else {
    cy.get('[data-testid="game-action"]', { timeout: 10000 }).should('be.visible');
  }
});

Cypress.Commands.add('simulateSlowNetwork', (delay: number) => {
  cy.intercept('**/*', (req) => {
    req.on('response', (res) => {
      res.setDelay(delay);
    });
  });
});

Cypress.Commands.add('openNewWindow', () => {
  return cy.window().then((win: Window) => {
    const stub = cy.stub(win, 'open' as keyof Window).returns(null);
    return stub.as('windowOpen');
  });
});

Cypress.Commands.add('attachFile', (fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }) => {
  if (typeof fileOrOptions === 'string') {
    cy.fixture(fileOrOptions).then((fileContent) => {
      cy.get('[data-testid="file-input"]').then($input => {
        const dataTransfer = new DataTransfer();
        const file = new File([fileContent], fileOrOptions, { type: 'application/octet-stream' });
        dataTransfer.items.add(file);
        const inputElement = $input[0] as HTMLInputElement;
        inputElement.files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
    });
  } else {
    cy.get('[data-testid="file-input"]').then($input => {
      const dataTransfer = new DataTransfer();
      const file = new File([fileOrOptions.fileContent], fileOrOptions.fileName, { type: fileOrOptions.mimeType });
      dataTransfer.items.add(file);
      const inputElement = $input[0] as HTMLInputElement;
      inputElement.files = dataTransfer.files;
      cy.wrap($input).trigger('change', { force: true });
    });
  }
});

// ... rest of the file ... 