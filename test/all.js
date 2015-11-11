const radredis = require('../index')
const flush = require('./flushdb')
const redisOpts = require('./redis-opts')
const expect = require('expect.js')
const Promise = require('bluebird')
const schema = { title: 'Post' }
const Post = radredis(schema, {}, redisOpts)

describe('Radredis', function() {

  before(function(){
    return flush().then(function(){
      return Promise.all([
        Post.create({title: 'test'}),
        Post.create({title: 'test'}),
        Post.create({title: 'test'}),
        Post.create({title: 'test'})
      ])
    })
  })

  describe('.all', function(){

    it('should return all results', function(){
      Post.all().then((posts)=>{
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
      Post.all({limit: 2, offset: 1}).then((posts)=>{
        expect(posts.length).to.eql(2)
        posts.map((post) => {
          expect(post.id).to.not.eql(1)
        })
      })
    })
  })
});
