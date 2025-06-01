/// <reference types="cypress" />
/// <reference types="chai" />
/// <reference types="chai-jquery" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />
/// <reference path="./chai.d.ts" />

declare namespace Cypress {
  interface Chainable {
    expect(value: any): jest.Matchers<any> & Chai.Assertion;
    should: Chai.Assertion;
    and: Chai.Assertion;
  }
}

declare namespace jest {
  interface Matchers<R> {
    // Jest-style assertions
    toBe(expected: any): R;
    toEqual(expected: any): R;
    toHaveProperty(property: string, value?: any): R;
    toBeGreaterThan(expected: number): R;
    toBeLessThan(expected: number): R;
    toBeVisible(): R;
    toBeInstanceOf(constructor: any): R;
    toContain(item: any): R;
    toHaveLength(length: number): R;
    toMatch(pattern: RegExp | string): R;
    toMatchObject(object: object): R;
    toHaveBeenCalled(): R;
    toHaveBeenCalledWith(...args: any[]): R;

    // Chai-style assertions
    to: {
      eq(value: any): R;
      equal(value: any): R;
      property(name: string, value?: any): R;
      greaterThan(value: number): R;
      lessThan(value: number): R;
      be: {
        an(type: string): R;
        visible: R;
        greaterThan(value: number): R;
      };
      have: {
        property(name: string, value?: any): R;
      };
      that: {
        is: {
          a(type: string): R;
        };
      };
    } & Chai.Assertion;
    be: {
      an(type: string): R;
      visible: R;
      greaterThan(value: number): R;
    } & Chai.Assertion;
    been: Chai.Assertion;
    is: Chai.Assertion;
    that: {
      is: {
        a(type: string): R;
      };
    } & Chai.Assertion;
    which: Chai.Assertion;
    and: Chai.Assertion;
    has: Chai.Assertion;
    have: {
      property(name: string, value?: any): R;
    } & Chai.Assertion;
    with: Chai.Assertion;
    at: {
      least(n: number): R;
      most(n: number): R;
    } & Chai.Assertion;
    of: Chai.Assertion;
    same: Chai.Assertion;
    not: Chai.Assertion;
    deep: Chai.Assertion;

    // Additional assertions
    visible: Chai.Assertion;
    hidden: Chai.Assertion;
    selected: Chai.Assertion;
    checked: Chai.Assertion;
    enabled: Chai.Assertion;
    disabled: Chai.Assertion;
    empty: Chai.Assertion;
    exist: Chai.Assertion;
    attached: Chai.Assertion;
    matchSelector(selector: string): Chai.Assertion;
  }
}

declare namespace Chai {
  interface TypeComparison {
    // Type checking
    a(type: string): void;
    an(type: string): void;
    instanceOf(constructor: any): void;
  }

  interface NumberComparison {
    // Numeric comparisons
    equal(value: number): void;
    equals(value: number): void;
    eq(value: number): void;
    above(value: number): void;
    below(value: number): void;
    least(value: number): void;
    most(value: number): void;
    within(start: number, finish: number): void;
    greaterThan(value: number): void;
    lessThan(value: number): void;
  }

  interface Assertion extends TypeComparison, NumberComparison {
    // Property assertions
    property(name: string, value?: any): void;
    
    // Chainable getters
    to: Assertion;
    be: Assertion & TypeComparison;
    been: Assertion;
    is: Assertion;
    that: Assertion;
    which: Assertion;
    and: Assertion;
    has: Assertion;
    have: Assertion;
    with: Assertion;
    at: Assertion;
    of: Assertion;
    same: Assertion;
    not: Assertion;
    deep: Assertion;
    
    // Visibility
    visible: void;
    hidden: void;
    exist: void;
    
    // Array assertions
    length(n: number): void;
    lengthOf(n: number): void;
    members(set: any[]): void;
    
    // Boolean assertions
    true: void;
    false: void;
    null: void;
    undefined: void;
    empty: void;
    
    // String assertions
    string(str: string): void;
    match(regexp: RegExp | string): void;
    matches(regexp: RegExp | string): void;
    
    // Numeric assertions
    above: NumberComparison;
    below: NumberComparison;
    most: NumberComparison;
    least: NumberComparison;
    
    // Additional Chai assertions
    ok: void;
    include(value: any): void;
    includes(value: any): void;
    contain(value: any): void;
    contains(value: any): void;
    
    // jQuery assertions
    attr: Assertion;
    css: Assertion;
    data: Assertion;
    class: Assertion;
    id: Assertion;
    html: Assertion;
    text: Assertion;
    value: Assertion;
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