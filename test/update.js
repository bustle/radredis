const radredis = require('../index')
const flush = require('./flushdb')
const redisOpts = require('./redis-opts')
const expect = require('expect.js')
const schema = { title: 'Post' }
const Post = radredis(schema, {}, redisOpts)

describe('Radredis', function() {
  describe('#update', function(){

    describe('id does not exist', function(){
      before(flush)

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
      let post

      before(function(){
        return Post.create({ title: 'Old title' })
        .then((result) => Post.update(result.id, {title: 'New title'}))
        .then((result) => post = result )
      })


      it('should update an attribute', function(){
        expect(post).to.be.an('object')
        expect(post.title).to.eql('New title')
      })

      it('should change the updated_at timestamp', function(){
        expect(post.created_at).to.be.a('number')
        expect(post.updated_at).to.be.a('number')
        expect(post.updated_at).to.not.eql(post.created_at)
      })
    })
  })
});
