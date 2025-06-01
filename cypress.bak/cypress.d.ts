/// <reference types="cypress" />
/// <reference types="@types/chai" />
/// <reference types="@types/mocha" />

declare namespace Cypress {
  interface Response<T = any> {
    body: T;
    headers: { [key: string]: string };
    status: number;
    statusText: string;
    duration: number;
    requestHeaders: { [key: string]: string };
    requestBody: any;
    isOkStatusCode: boolean;
  }

  interface Chainable {
    request(url: string): Chainable<Response>;
    request(method: string, url: string, body?: any): Chainable<Response>;
  }
} 