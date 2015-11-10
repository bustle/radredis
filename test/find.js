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

  describe('#find', function(){
    it('should be a function', function(){
      expect(Post.find).to.be.a('function')
    });

    it('should return a list of attributes', function(){
      return Post.find(1).then((results)=>{
        expect(results[0].title).to.eql('test')
      })
    })

    it('should return a single result', function(){
      return Post.find(1).then((result)=>{
        expect(result).to.be.an('object')
        expect(result).to.not.be.empty()
      })
    })

    it('should return multiple results', function(){
      return Post.find(1, 2, 3).then((results)=>{
        expect(results.length).to.eql(3)
        results.map((result) => expect(result).to.not.be.empty() )
      })
    })
  })
});
