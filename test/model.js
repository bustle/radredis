import assert from 'assert';
import Model from '../src/model';

let schema = [ 
  { key: 'name' },
  { key: 'email' },
  { key: 'birthday' },
  { key: 'fingers', defaultValue: 10 },
  { key: 'url' }
];

let attributes = {
  name: "Tyler Love",
  birthday: Date.now(),
  url: 'http://www.bustle.com'
};

class User extends Model {};

describe('Model', () => {

  describe("#schema=", () => {
    before(() => {
      User.schema = schema;
    });

    it("defines attributes", () => {
      for(let definition of schema) {
        let descriptor = Object.getOwnPropertyDescriptor(User.prototype, definition.key);
        assert.equal(typeof descriptor, 'object');
      }
    });
  });

  describe(".constructor()", () => {
    it("assigns attributes from the constructor", () => {
      let attributes = { 
        name: "Tyler Love",
        birthday: Date.now()
      };
      let user = new User(attributes);
      assert.equal(user.name, attributes.name);
      assert.equal(user.birthday, attributes.birthday);
    });

    it("throws error when constructed with attributes not in the schema definition", () => {
      let attributes = { 
        name: "Tyler Love",
        birthday: Date.now(),
        color: 'blue'
      };
      let user = new User(attributes);
      assert.throws(() => {
        
      });
    })
  });

});
