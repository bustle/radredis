import assert     from 'assert';
import CoreObject from '../src/core-object';

describe('Config', () => {
  describe('#includeMixin()', () => {
    before(()=>{
      let instanceMixin = {
        accessors: {
          name: {
            get(){ return this._name; },
            set(name){ this._name = name; }
          }
        },
        isAnInstanceMethod() { return true; }
      };
      CoreObject.includeMixin(instanceMixin);
    });
    it('it correctly defines new methods to the prototype', () => {
      assert.equal(CoreObject.prototype.isAnInstanceMethod instanceof Function, true);
    });
    it('it can add getters and setters', () => {
      let obj = new CoreObject();
      obj.name = 'sue';
      assert.equal(obj._name, 'sue');
    });
  });
  describe('#extendMixin()', () => {
    before(()=>{
      let classMixin = {
        accessors: {
          count: {
            get(){ return this._count; },
            set(count){ this._count = count; }
          }
        },
        isAClassMethod() { return true; }
      };
      CoreObject.extendMixin(classMixin);
    });
    it('it correctly defines new methods to the class', () => {
      assert.equal(CoreObject.isAClassMethod instanceof Function, true);
    });
    it('it can add getters and setters', () => {
      CoreObject.count = 10;
      assert.equal(CoreObject._count, 10);
    });
  });
});
