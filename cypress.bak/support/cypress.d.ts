/// <reference types="cypress" />
/// <reference types="chai" />
/// <reference types="chai-jquery" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />
/// <reference path="./chai.d.ts" />
/// <reference path="./jest.d.ts" />

declare namespace Cypress {
  interface RequestOptions {
    method: string;
    url: string;
    body?: any;
    failOnStatusCode?: boolean;
  }

  interface Response<T = any> {
    status: number;
    body: T;
    headers: { [key: string]: string };
  }

  interface Chainable<Subject = any> {
    // Game-related commands
    joinGame(nickname: string): Chainable<void>;
    joinTable(tableId: number, buyIn: number): Chainable<void>;
    verifyChips(playerName: string, minChips: number, maxChips: number): Chainable<void>;
    waitForGameAction(action: string): Chainable<void>;
    openNewWindow(): Chainable<Window>;
    
    // Network simulation commands
    simulateSlowNetwork(delay: number): Chainable<void>;
    
    // File-related commands
    attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>;
    
    // Cypress commands
    get<E extends Node = HTMLElement>(selector: string): Chainable<JQuery<E>> & {
      attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>;
    };
    stub<T extends object>(obj: T, method: keyof T): Chainable<sinon.SinonStub> & {
      returns(value: any): Chainable<sinon.SinonStub>;
      as(alias: string): Chainable<sinon.SinonStub>;
    };
    click(): Chainable<void>;
    type(text: string): Chainable<void>;
    should: Chai.Assertion;
    and: Chai.Assertion;
    then<S = Subject>(fn: (this: Object, currentSubject: Subject) => S | Promise<S> | void): Chainable<S>;
    wrap<T>(value: T): Chainable<T>;
    window(): Chainable<Window>;
    request(method: string, url: string, body?: any): Chainable<Response>;
    request(options: RequestOptions): Chainable<Response>;
    visit(url: string): Chainable<Window>;
    
    // Assertion commands
    expect<T = any>(actual: T): jest.Matchers<T> & Chai.Assertion;
  }

  interface Window {
    open(url?: string, target?: string, features?: string): Window | null;
    close(): void;
    postMessage(message: any, targetOrigin: string, transfer?: Transferable[]): void;
  }

  interface SinonStub {
    as(alias: string): SinonStub;
    returns(value: any): SinonStub;
    callsFake(fn: Function): SinonStub;
    withArgs(...args: any[]): SinonStub;
  }

  interface Cypress {
    env(): { [key: string]: string };
    env(key: string): string;
    env(key: string, value: string): void;
    Commands: {
      add(name: string, fn: (...args: any[]) => any): void;
    };
  }

  // Extend Window interface
  interface AUTWindow extends Window {
    [key: string]: any;
  }
} 