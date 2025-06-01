/// <reference types="cypress" />
/// <reference types="mocha" />
/// <reference types="chai" />
/// <reference types="chai-jquery" />
/// <reference types="jquery" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />
/// <reference path="./chai.d.ts" />
/// <reference path="./jest.d.ts" />

declare namespace Cypress {
  interface Chainable<Subject = any> {
    // Game-related commands
    joinGame(nickname?: string): Chainable<void>;
    joinTable(tableId: number, buyIn?: number): Chainable<void>;
    verifyChips(playerName: string, minChips: number, maxChips?: number): Chainable<void>;
    waitForGameAction(action?: string): Chainable<void>;
    openNewWindow(): Chainable<Window>;
    
    // Network simulation commands
    simulateSlowNetwork(delay: number): Chainable<void>;
    
    // File-related commands
    attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>;
    
    // jQuery and DOM commands
    get<E extends Node = HTMLElement>(selector: string): Chainable<JQuery<E>> & {
      attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>;
    };
    stub<T extends object>(obj: T, method: keyof T): Chainable<sinon.SinonStub>;
    click(): Chainable<void>;
    type(text: string): Chainable<void>;
    should(chainer: string, value?: any): Chainable<Subject>;
    and(chainer: string, value?: any): Chainable<Subject>;
    then<S = Subject>(fn: (this: Object, currentSubject: Subject) => S | Promise<S> | void): Chainable<S>;
  }

  interface Window {
    open(url: string, target?: string, features?: string): Window | null;
  }

  interface SinonStub {
    as(alias: string): SinonStub;
    returns(value: any): SinonStub;
    callsFake(fn: Function): SinonStub;
  }
}

declare global {
  namespace Chai {
    interface Assertion {
      eq(value: any): void;
      equal(value: any): void;
      property(name: string, value?: any): void;
      greaterThan(value: number): void;
      lessThan(value: number): void;
      be: {
        an(type: string): void;
        visible: void;
        greaterThan(value: number): void;
      };
      have: {
        property(name: string, value?: any): void;
      };
      to: Assertion;
      that: Assertion;
      is: Assertion;
      a(type: string): void;
      at: {
        least(value: number): void;
        most(value: number): void;
      };
    }
  }

  namespace jest {
    interface Matchers<R> {
      to: Chai.Assertion;
      be: Chai.Assertion;
      have: Chai.Assertion;
      and: Chai.Assertion;
      not: Chai.Assertion;
      deep: Chai.Assertion;
    }
  }
}

declare global {
  namespace Cypress {
    interface Chainable {
      expect<T = any>(actual: T): jest.Matchers<T> & Chai.Assertion;
    }
  }

  const expect: <T = any>(actual: T) => jest.Matchers<T> & Chai.Assertion;
  const cy: Cypress.Chainable;
} 