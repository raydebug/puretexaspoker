/// <reference types="chai" />
/// <reference types="jquery" />

declare namespace Chai {
  interface Assertion {
    // jQuery element assertions
    attr(name: string, value?: string): Assertion;
    prop(name: string, value?: any): Assertion;
    css(name: string, value?: string): Assertion;
    data(name: string, value?: any): Assertion;
    class(className: string): Assertion;
    id(id: string): Assertion;
    html(html: string): Assertion;
    text(text: string): Assertion;
    value(value: string | number | string[]): Assertion;
    visible: Assertion;
    hidden: Assertion;
    selected: Assertion;
    checked: Assertion;
    disabled: Assertion;
    empty: Assertion;
    exist: Assertion;
    match(selector: string): Assertion;
    contain(text: string): Assertion;
    descendants(selector: string): Assertion;

    // Length assertions
    length(n: number): Assertion;
    lengthOf(n: number): Assertion;

    // Event assertions
    handle(eventName: string): Assertion;
    handleWith(eventName: string, handler: Function): Assertion;

    // Additional jQuery-specific assertions
    be: {
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
    };

    have: {
      attr(name: string, value?: string): Assertion;
      prop(name: string, value?: any): Assertion;
      css(name: string, value?: string): Assertion;
      data(name: string, value?: any): Assertion;
      class(className: string): Assertion;
      id(id: string): Assertion;
      html(html: string): Assertion;
      text(text: string): Assertion;
      value(value: string | number | string[]): Assertion;
      descendants(selector: string): Assertion;
      length(n: number): Assertion;
    };
  }
}

declare module "chai-jquery" {
  const chaiJquery: Chai.ChaiPlugin;
  export = chaiJquery;
} 