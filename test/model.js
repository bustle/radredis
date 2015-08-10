import assert from 'assert';
import Model from '../src/model';

class Person extends Model {};
Person.schema = [ 
  { name: 'name' },
  { name: 'birthday' },
  { name: 'fingers', default: 10 },
  { name: 'url' }
];

describe('Model', () => {
  describe("#new()", () => {
    let person, attributes;

    beforeEach(() => {
      attributes = { 
        name: "Tyler Love",
        birthdate: Date.now()
      };
      person = new Person(attributes);
    });

    it("assigns attributes from the constructor", () => {
      assert.equal(person.name, attributes.name);
      assert.equal(person.birthdate, attributes.birthdate);
    });

    it("sets attributes", () => {
      person.name = "Daddy DDon";
      assert.equal(person.name, "Daddy DDon");
    });

    it("sets default attributes", () => {
      assert.equal(person.fingers, 10);
    });

    it("unsets attributes default to null", () => {
      assert.equal(person.url, null);
    });

  });
});
