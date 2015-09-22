import assert from 'assert';
import Redis  from 'ioredis';
import Model  from '../src/model';

// SET UP FOR TESTS
Model.redis = new Redis('redis://127.0.0.1:6379/15');
class Person extends Model {};
Person.redisKey = 'person';
Person.schema = [
  { key: 'name' },
  { key: 'birthday' },
  { key: 'fingers', defaultValue: 10 },
  { key: 'url' }
];

// TESTS
describe('Model', () => {
  let person, attributes;

  beforeEach(() => {
    attributes = {
      name: 'John Smith',
      birthday: Date.now()
    };
    person = new Person(attributes);
  });

  afterEach(()=>{
    Person.redis.flushdb();
  });

  describe('.constructor()', () => {

    it('assigns attributes from the constructor', () => {
      assert.equal(person.name, attributes.name);
      assert.equal(person.birthday, attributes.birthday);
    });

    it('sets attributes', () => {
      person.name = 'Daddy D-Don';
      assert.equal(person.name, 'Daddy D-Don');
    });

    it('sets default attributes', () => {
      assert.equal(person.fingers, 10);
    });

    it('unsets attributes default to null', () => {
      assert.equal(person.url, null);
    });

  });

  describe('state', () => {
    it("updating an attribute dirties the model's private state", () => {
      person.name = 'tristan';
      assert.equal(person._isDirty, true);
    });
  });

  describe('#create()', () => {

    it('persists new model', () => {
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

  describe('#update()', () => {

    it('persists attributes', () => {
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

  describe('#destroy()', () => {

    it('destroys record', () => {
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

  describe('::find()', () => {

    it('finds and loads record', () => {
      return person.create()
      .then((p) => { return Person.find(p.id); })
      .then((p) => {
        assert.equal(person.name, p.name);
      }).catch((err) => {
        assert.ifError(err);
      });
    });

  });

  describe('::findAll()', () => {
    beforeEach((done)=>{
      person.save().then(()=>{
        new Person().save().then(()=>{
          new Person().save().then(()=>{done();});
        });
      });
    });

    it('finds and loads records', () => {
      return Person.findAll([1,2,3])
      .then((persons) => {
        assert.equal(persons[0].id, 1);
        assert.equal(persons[1].id, 2);
        assert.equal(persons[2].id, 3);
      }).catch((err) => {
        assert.ifError(err);
      });
    });

  });

  describe('::saveAll()', () => {

    it('saves array of records', () => {
      return Person.saveAll([
        new Person(),
        new Person({name: 'bob'})
      ]).then((persons) => {
        persons.sort((m1, m2)=>{ return m1.id - m2.id });
        assert.equal(persons[0].id, 1);
        assert.equal(persons[1].id, 2);
      }).catch((err) => {
        assert.ifError(err);
      });
    });

  });

  describe('::all()', () => {

    beforeEach((done)=>{
      person.save().then(()=>{
        new Person().save().then(()=>{
          new Person().save().then(()=>{done();});
        });
      });
    });

    it('returns a valid iterator', () => {
      let iterator = Person.all();
      return iterator.page({
          offset: 0,
          size: 25
        }).then((persons) => {
          assert.equal(Object.keys(persons).length, 3);
        }).catch((err) => {
          assert.ifError(err);
      });
    });
  });

});
