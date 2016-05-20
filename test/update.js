import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'
import sinon     from 'sinon'

const schema = {
  title: 'Post',
  properties: {
    title: { type: 'string'},
    bodies: { type: 'array'}
  }
}

describe('Radredis', function() {
  describe('.update', function(){

    describe('id does not exist', function(){
      before(flush)

      const Post = radredis(schema, {}, redisOpts)

      it('should throw an error', ()=>{
        return Post.update(27, {})
        .then((result)=>{
          expect(result).to.be(undefined)
        },
        (err) =>{
          expect(err).to.not.be(undefined)
          expect(err.message).to.contain('Model not found')
        })
      })
    })

    describe('id exists', function(){
      const Post = radredis(schema, {}, redisOpts)
      let post

      before(function(){
        return Post.create({ title: 'Old title', author: "steve" })
        .delay(1000) // Ensures that updated_at !== created_at
        .then((result) => Post.update(result.id, { title: 'New title', state: "published", bodies: [ 'foo', 'bar'] }))
        .then((result) => post = result )
      })


      it('should update an attribute', function(){
        expect(post).to.be.an('object')
        expect(post.title).to.eql('New title')
      })

      it('should not remove old attributes', function(){
        expect(post.author).to.eql("steve")
      })

      it('should add new attributes', function(){
        expect(post.state).to.eql("published")
      })

      it('should return a parsed array', function(){
        expect(post.bodies).to.be.a('array')
      })

      it('should change the updated_at timestamp', function(){
        expect(post.created_at).to.be.a('number')
        expect(post.updated_at).to.be.a('number')
        expect(post.updated_at).to.not.eql(post.created_at)
      })
    })

    describe('hooks', function(){
      it('should call the beforeSave and afterSave hooks', function(){
        const beforeSave = sinon.spy()
        const afterSave = sinon.spy()
        const Post = radredis(schema, { }, redisOpts)
        const PostWithHook = radredis(schema, { beforeSave, afterSave }, redisOpts)
        return Post.create({ title: 'Title'})
        .then((post) => PostWithHook.update(post.id, { title: 'New Title'}))
        .then(()=> {
          expect(beforeSave.calledOnce).to.be.ok()
          expect(beforeSave.calledWithMatch({ title: 'New Title'}, { title: 'Title'})).to.be.ok()
          expect(afterSave.calledOnce).to.be.ok()
          expect(afterSave.calledWithMatch({ title: 'New Title'})).to.be.ok()
        })
      })
    })
  })
});
