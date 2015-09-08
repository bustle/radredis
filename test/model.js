import assert from 'assert';
import Model from '../src/model';

class Person extends Model {};
Person.redisKey = 'person';
Person.schema = [ 
  { key: 'name' },
  { key: 'birthday' },
  { key: 'fingers', defaultValue: 10 },
  { key: 'url' }
];
Person.afterCreate = (person) => {
  console.log("afterCreate");
};
Person.beforeCreate = (person) => {
  console.log("beforeCreate");
};
Person.afterUpdate = (person) => {
  console.log("afterUpdate");
};
Person.beforeUpdate = (person) => {
  console.log("beforeUpdate");
};

describe('Model', () => {
  let person, attributes;

  beforeEach(() => {
    attributes = {
      name: "John Smith",
      birthday: Date.now()
    };
    person = new Person(attributes);
  });

  describe(".constructor()", () => {

    it("assigns attributes from the constructor", () => {
      assert.equal(person.name, attributes.name);
      assert.equal(person.birthday, attributes.birthday);
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

  describe("#create()", () => {

    it("persists new model", () => {
      let attributes = person.attributes;
      return person.create()
        .then((p) => { return p.load(); })
        .then((p) => {
          assert.equal(p.name, attributes.name);
        }).catch((err)=> {
          assert.ifError(err);
        });
    });

  });

  describe("#update()", () => {

    it("persists attributes", () => {
      return person.create()
      .then((p) => { p.name = 'Jane Doe'; return p.update(); })
      .then((p) => { return p.load(); })
      .then((p) => {
        assert.equal(p.name, 'Jane Doe');
      }).catch((err) => {
        assert.ifError(err);
      });        
    });

  });

  describe("#destroy()", () => {

    it("destroys record", () => {
      return person.create()
      .then((p) => { return p.destroy(); })
      .then((p) => { return p.load(); })
      .then((p) => {
        assert.equal(p.name, null);
      }).catch((err) => {
        assert.ifError(err);
      });        
    });

  });

  describe("::find()", () => {

    it("finds and loads record", () => {
      return person.create()
      .then((p) => { return Person.find(p.id); })
      .then((p) => {
        assert.equal(person.name, p.name);
      }).catch((err) => {
        assert.ifError(err);
      });        
    });

  });

  describe("::findAll()", () => {

    it("finds and loads records", () => {
      return Person.findAll([1,2,3])
      .then((persons) => {
      }).catch((err) => {
        assert.ifError(err);
      });        
    });

  });

  describe("::saveAll()", () => {

    it("saves array of records", () => {
      return Person.findAll([457,458,459])
      .then((persons) => {
        for(let p of persons) {
          p.name = 'Albert Einstain';
        }
        return Person.saveAll(persons); 
      })
      .then((persons) => {
      }).catch((err) => {
        assert.ifError(err);
      });        
    });

  });

});
