import assert from 'assert';
import Attribute from '../../src/model/attribute';

describe('Attribute', () => {
  describe("#define()", () => {
    let Model;
    let attributes;
    let definition = { key: 'name' };
    let definitionWithDefault = { key: 'breed', defaultValue: 'cat' };
    let definitionWithRequired = { key: 'color' };

    beforeEach(() => {
      // Attribute#define expects an attributes property of object passed
      Model = {
        attributes: {}
      };
      Attribute.define(Model, definition);
      Attribute.define(Model, definitionWithDefault);
      Attribute.define(Model, definitionWithRequired);
    });

    it("defines getter and setter", () => {
      let descriptor = Object.getOwnPropertyDescriptor(Model, definition.key);
      assert.equal(typeof descriptor, 'object');
    });

    it("returns null when not set", () => {
      assert.equal(Model[definition.key], null);
    });

    it("returns the defaultValue when set and no attribute value supplied", () => {
      assert.equal(Model[definitionWithDefault.key], definitionWithDefault.defaultValue);
    });

  });
});

