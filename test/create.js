const radredis = require('../index')
const flush = require('./flushdb')
const redisOpts = require('./redis-opts')
const expect = require('expect.js')
const schema = { title: 'Post' }
const Post = radredis(schema, {}, redisOpts)

describe('Radredis', function() {
  before(flush)

  describe('#create', function(){
    const title = 'A Post Title'
    let post

    before(function(){
      return Post.create({ title })
            .then((result) => post = result)
    })

    it('should set a supplied attribute', function(){
      expect(post.title).to.eql(title)
    });

    it('should set a created_at timestamp', ()=>{
      expect(post.created_at).to.be.a('number')
    })

    it('should set an updated_at timestamp', ()=>{
      expect(post.updated_at).to.be.a('number')
    })

    it('should set a generated an id', ()=>{
      expect(post.id).to.be.a('number')
    })
  })
});
