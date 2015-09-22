import assert from 'assert';
import Model  from '../../src/model';
import State  from '../../src/model/state';

describe('State', ()=>{
  class FakeModel extends Model {
    willCreate(){ this.wasWillCreateCalled = true; }
    willUpdate(){ this.wasWillUpdateCalled = true; }
    willDestroy(){ this.wasWillDestroyCalled = true; }
    didCreate(){ this.wasDidCreateCalled = true; }
    didUpdate(){ this.wasDidUpdateCalled = true; }
    didDestroy(){ this.wasDidDestroyCalled = true; }
    didLoad(){ this.wasDidLoadCalled = true; }
  };
  let fake;

  beforeEach(()=>{
    fake = new FakeModel();
  });

  describe('Accessors', ()=>{
    it('new unsaved models are clean, not loaded, and new', ()=>{
      assert.equal(fake.isNew, true);
      assert.equal(fake.isDirty, false);
      assert.equal(fake.isLoaded, false);
    });

    it('saved models are clean, loaded, and not new', ()=>{
      return fake.save().then((fake)=>{
        assert.equal(fake.isNew, false);
        assert.equal(fake.isDirty, false);
        assert.equal(fake.isLoaded, true);
      }).catch((err) => {
        assert.ifError(err);
      });
    });
  });

  describe('Lifecycle Events', ()=>{
    it('creating a record triggers willCreate and didCreate events', ()=>{
      return fake.save().then(()=>{
        assert.equal(fake.wasWillCreateCalled, true);
        assert.equal(fake.wasDidCreateCalled, true);
      }).catch((err) => {
        assert.ifError(err);
      });
    });

    it('updating a record triggers willUpdate and didUpdate events', ()=>{
      return fake.save().then(()=>{
        return fake.save().then(()=>{
          assert.equal(fake.wasWillUpdateCalled, true);
          assert.equal(fake.wasDidUpdateCalled, true);
        }).catch((err) => {
          assert.ifError(err);
        });
      }).catch((err) => {
        assert.ifError(err);
      });
    });

    it('loading a record triggers the didLoad event', ()=>{
      return fake.save().then(()=>{
        assert.equal(fake.wasDidLoadCalled, true);
      }).catch((err) => {
        assert.ifError(err);
      });
    });

    it('destroying a record triggers willDestroy and didDestroy events', ()=>{
      return fake.save().then(()=>{
        return fake.destroy().then(()=>{
          assert.equal(fake.wasWillDestroyCalled, true);
          assert.equal(fake.wasDidDestroyCalled, true);
        }).catch((err) => {
          assert.ifError(err);
        });
      }).catch((err) => {
        assert.ifError(err);
      });
    });
  });
});
