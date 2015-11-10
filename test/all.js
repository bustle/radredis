const radredis = require('../index')
const flush = require('./flushdb')
const expect = require('expect.js')
const Promise = require('bluebird')
const schema = { title: 'Post' }
const Post = radredis(schema)

describe('Radredis', function() {

  before(function(){
    return flush().then(function(){
      return Promise.all([
        Post.create({title: 'test'}),
        Post.create({title: 'test'}),
        Post.create({title: 'test'})
      ])
    })
  })

  describe('#all', function(){
    it('should be a function', function(){
      expect(Post.all).to.be.a('function')
    });

    // it('should return all results', function(){
    //   return Post.all().then((results)=>{
    //     expect(results.length).to.eql(3)
    //     results.map((result) => expect(result).to.not.be.empty() )
    //   })
    // })
  })
});
