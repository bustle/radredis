const radredis = require('../src')
const flush = require('./flushdb')
const redisOpts = require('./redis-opts')
const expect = require('expect.js')
const Promise = require('bluebird')
const schema = {
  title: 'Post',
  properties: {
    title: { type: 'string' },
    author_id: { type: 'integer', index: true }
  }
}
const Post = radredis(schema, {}, redisOpts)

describe('Radredis', function() {

  before(function(){
    return flush().then(function(){
      return Promise.all([
        Post.create({title: 'test', author_id: 1 }),
        Post.create({title: 'test', author_id: 2 }),
        Post.create({title: 'test', author_id: 3 }),
        Post.create({title: 'test', author_id: 3 })
      ])
    })
  })

  describe('.all', function(){

    it('should return all results', function(){
      return Post.all().then((posts)=>{
        expect(posts.length).to.eql(4)
        posts.map((post) => {
          expect(post).to.be.an('object')
          expect(post.id).to.be.a('number')
          expect(post.created_at).to.be.a('number')
          expect(post.updated_at).to.be.a('number')
        })
      })
    })

    it('should accept parameters', function(){
      return Post.all({limit: 2, offset: 1}).then((posts)=>{
        expect(posts.length).to.eql(2)
        posts.map((post) => {
          expect(post.id).to.not.eql(1)
        })
      })
    })

    // Talking to redis is pretty hacky, but this checks existing behavior since no public API exists
    it('should add/update indexed attribtues', function(){
      return Post._redis.zrangebyscore('indexes:author_id', 3, 3)
      .then(res => expect(res.length).to.eql(2))
    })

    it('should remove indexed attribtues set to null', function(){
      return Post.update(4, { author_id: null })
      .then(()=>{
        return Post._redis.zrangebyscore('indexes:author_id', 3, 3)
      })
      .then((res)=>{
        expect(res.length).to.eql(1)
      })
    })
  })
});
