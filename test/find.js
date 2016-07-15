import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'
import Promise   from 'bluebird'

describe('Radredis', function() {
  describe('.find', function(){
    const schema = {
      title: 'Post',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' }
      }
    }
    const Post = radredis(schema, {}, redisOpts)

    before(function(){
      return flush().then(function(){
        return Promise.all([
          Post.create({title: 'test', body: 'hello world'}),
          Post.create({title: 'test', body: 'hello world'}),
          Post.create({title: 'test', body: 'hello world'})
        ])
      })
    })

    it('should return a list of attributes', function(){
      return Post.find(1).then((post)=>{
        expect(post.title).to.eql('test')
      })
    })

    it('should return an id', function(){
      return Post.find(1).then((result)=>{
        expect(result.id).to.be.a('number')
      })
    })

    it('should be able to take a list of properties', function(){
      return Post.find(1, ['title']).then((result)=>{
        expect(result.title).to.eql('test')
        expect(result.body).to.eql(undefined)
      })
    })

    it('should not return a version number', function(){
      return Post.find(1).then((result)=>{
        expect(result._v).to.eql(undefined)
      })
    })

    it('should return a single result with timestamps', function(){
      return Post.find(1).then((post)=>{
        expect(post).to.be.an('object')
        expect(post).to.not.be.empty()
        expect(post.created_at).to.be.an('number')
        expect(post.updated_at).to.be.an('number')
      })
    })

    it('should return multiple results', function(){
      return Post.find([1, 2, 3]).then((results)=>{
        expect(results.length).to.eql(3)
        results.map((result) => expect(result).to.not.be.empty() )
      })
    })
  })

  describe('.find - with versions', function(){
    const schema = {
      title: 'Post',
      properties: {
        title: { type: 'string', version: true }
      }
    }
    const Post = radredis(schema, {}, redisOpts)

    before(function(){
      return flush().then(function(){
        return Post.create({title: 'test'})
      })
    })

    it('should return a version number', function(){
      return Post.find(1).then((result)=>{
        expect(result._v).to.be.a('number')
        expect(result._v).to.eql(1)
      })
    })
  })

  describe('.find - with serialization', function() {
    let post

    const schema = {
      title: 'Post',
      type: 'object',
      properties: {
        primary_media: { type: 'object' },
        title: { type: 'string' },
        bodies: { type: 'array' },
        type: { type: 'integer'},
        float: { type: 'number' },
        trueBool: { type: 'boolean' },
        falseBool: { type: 'boolean' }
      }
    }

    const attributes = {
      title: 'test',
      primary_media: {
        author_id: 5,
        url: 'http://example.com'
      },
      bodies: [
        { version: 2 },
        { version: 3 }
      ],
      type: 1,
      float: 1.2345,
      trueBool: true,
      falseBool: false
    }

    const Post = radredis(schema, {}, redisOpts)

    before(()=>{
      return Post.create(attributes)
      .get('id')
      .then(Post.find)
      .then((result) => post = result )
    })

    it('should return a parsed array', function(){
      expect(post.bodies).to.be.an('array')
    })

    it('should return a parsed object', function(){
      expect(post.primary_media).to.be.an('object')
    })

    it('should return a parsed integer', function(){
      expect(post.type).to.be.a('number')
    })

    it('should return a parsed float', function(){
      expect(post.float).to.be.a('number')
    })

    it('should return a parsed boolean', function(){
      expect(post.trueBool).to.be(true)
      expect(post.falseBool).to.be(false)
    })
  });
});
