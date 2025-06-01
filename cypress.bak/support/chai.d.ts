/// <reference types="chai" />
/// <reference types="chai-jquery" />
/// <reference types="sinon-chai" />

declare namespace Chai {
  interface ExpectStatic {
    (target: any): Assertion;
    <T>(target: T): Assertion;
  }

  interface Assertion {
    // Chai BDD style
    to: Assertion;
    be: Assertion;
    been: Assertion;
    is: Assertion;
    that: Assertion;
    which: Assertion;
    and: Assertion;
    has: Assertion;
    have: Assertion;
    with: Assertion;
    at: {
      least(n: number): Assertion;
      most(n: number): Assertion;
    };
    of: Assertion;
    same: Assertion;
    not: Assertion;
    deep: Assertion;

    // Type checking
    a(type: string): Assertion;
    an(type: string): Assertion;
    instanceOf(constructor: Function): Assertion;

    // Property checking
    property(name: string, value?: any): Assertion;
    ownProperty(name: string): Assertion;
    haveOwnProperty(name: string): Assertion;

    // Length checking
    length(n: number): Assertion;
    lengthOf(n: number): Assertion;

    // Type assertions
    equal(value: any): Assertion;
    equals(value: any): Assertion;
    eq(value: any): Assertion;
    eql(value: any): Assertion;
    eqls(value: any): Assertion;

    // Numeric comparisons
    above(n: number): Assertion;
    gt(n: number): Assertion;
    greaterThan(n: number): Assertion;
    least(n: number): Assertion;
    gte(n: number): Assertion;
    below(n: number): Assertion;
    lt(n: number): Assertion;
    lessThan(n: number): Assertion;
    most(n: number): Assertion;
    lte(n: number): Assertion;
    within(start: number, finish: number): Assertion;

    // Existence and truthiness
    exist: Assertion;
    defined: Assertion;
    undefined: Assertion;
    null: Assertion;
    true: Assertion;
    false: Assertion;
    ok: Assertion;

    // Inclusion and membership
    include(value: any): Assertion;
    includes(value: any): Assertion;
    contain(value: any): Assertion;
    contains(value: any): Assertion;
    members(set: any[]): Assertion;

    // String matching
    match(regexp: RegExp | string): Assertion;
    matches(regexp: RegExp | string): Assertion;
    string(str: string): Assertion;

    // Object checking
    key(key: string): Assertion;
    keys(key: string[]): Assertion;
    
    // Promises
    fulfilled: Assertion;
    rejected: Assertion;
    rejectedWith(errorLike?: Error | string, errMsgMatcher?: RegExp | string): Assertion;

    // Numeric ordering
    increase: Assertion;
    decrease: Assertion;
    by(delta: number): Assertion;

    // Additional assertions
    visible: Assertion;
    hidden: Assertion;
    selected: Assertion;
    checked: Assertion;
    enabled: Assertion;
    disabled: Assertion;
    empty: Assertion;
    exist: Assertion;
    attached: Assertion;
    matchSelector(selector: string): Assertion;

    // jQuery assertions
    trigger(eventName: string, options?: any): Assertion;
    intercept(url: string | RegExp, response?: any): Assertion;
    fixture(path: string): Assertion;
    returns(value: any): Assertion;
  }

  interface Assert {
    (expression: any, message?: string): void;
    fail(actual?: any, expected?: any, msg?: string, operator?: string): void;
    ok(val: any, msg?: string): void;
    notOk(val: any, msg?: string): void;
    equal(act: any, exp: any, msg?: string): void;
    notEqual(act: any, exp: any, msg?: string): void;
    strictEqual(act: any, exp: any, msg?: string): void;
    notStrictEqual(act: any, exp: any, msg?: string): void;
    deepEqual(act: any, exp: any, msg?: string): void;
    notDeepEqual(act: any, exp: any, msg?: string): void;
  }
}

declare module "chai" {
  export const expect: Chai.ExpectStatic;
  export const should: () => void;
  export const assert: Chai.Assert;
}

declare global {
  const expect: Chai.ExpectStatic;
  const cy: Cypress.Chainable;
} 