import assert from 'assert';
import Model from '../src/model';

class User extends Model {};
User.schema = [ 
  { key: 'name' },
  { key: 'email', required: true },
  { key: 'birthday' },
  { key: 'fingers', defaultValue: 10 },
  { key: 'url' }
];

describe('Model', () => {
  describe(".constructor()", () => {
    let person, attributes;

    beforeEach(() => {
      attributes = { 
        name: "Tyler Love",
        birthday: Date.now()
      };
      person = new Person(attributes);
    });

    it("assigns attributes from the constructor", () => {
      assert.equal(person.name, attributes.name);
      assert.equal(person.birthdate, attributes.birthdate);
    });

    it("sets attributes", () => {
      person.name = "Daddy D-Don";
      assert.equal(person.name, "Daddy D-Don");
    });

    it("sets default attributes", () => {
      assert.equal(person.fingers, 10);
    });

    it("unsets attributes default to null", () => {
      assert.equal(person.url, null);
    });

  });
});
