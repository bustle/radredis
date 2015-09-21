import assert from 'assert';
import Attribute from '../../src/model/attribute';

describe('Attribute', () => {
  describe("#define()", () => {
    let FakeModel;
    let attribute = { key: 'name' };
    let attributeWithDefault = { key: 'color', defaultValue: '#FFFFFF' };

    beforeEach(() => {
      FakeModel = {
        attributes: {}
      };
      Attribute.define(FakeModel, attribute);
      Attribute.define(FakeModel, attributeWithDefault);
    });

    it("defines getter and setter", () => {
      let descriptor = Object.getOwnPropertyDescriptor(FakeModel, attribute.key);
      assert.equal(typeof descriptor, 'object');
      assert.equal(typeof descriptor.get, 'function');
      assert.equal(typeof descriptor.set, 'function');
    });

    it("returns null when not set", () => {
      assert.equal(FakeModel[attribute.key], null);
    });

    it("returns the defaultValue value when supplied", () => {
      assert.equal(FakeModel[attributeWithDefault.key], attributeWithDefault.defaultValue);
    });
  });
});
