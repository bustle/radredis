const radredis = require('../index')
const flush = require('./flushdb')
const expect = require('expect.js')
const schema = { title: 'Post' }
const Post = radredis(schema)

describe('Radredis', function() {
  before(flush)

  describe('#create', function(){
    it('should be a function', function(){
      expect(Post.create).to.be.a('function')
    });

    it('should return a newly created object with an id', function(){
      const title = 'A Post Title'
      return Post.create({ title }).then((post)=>{
        expect(post.title).to.eql(title)
        expect(post.id).to.be.a('number')
      })
    });

  })
});
