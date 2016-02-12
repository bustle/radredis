import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'
import Promise   from 'bluebird'

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
        Post.create({title: 'test', author_id: 3 }),
        Post.create({title: 'test', author_id: 3 }),
        Post.create({title: 'test', author_id: 3 })
      ])
    })
  })

  describe('.range', function(){

    it('should accept min and max parameters', function(){
      return Post.range({ index: 'author_id', min: 3, max: 3 }).then((posts)=>{
        expect(posts.length).to.eql(3)
        posts.map((post) => {
          expect(post.author_id).to.eql(3)
        })
      })
    })

    it('should accept limit and offset parameters', function(){
      return Post.range({ index: 'author_id', min: 3, max: 3, limit: 2, offset: 1}).then((posts)=>{
        expect(posts.length).to.eql(2)
      })
    })

    it('should accept a properties parameter', function(){
      return Post.range({ index: 'author_id', min: 3, max: 3, properties: ['author_id']}).then((posts)=>{
        expect(posts.length).to.eql(3)
        posts.map((post) => {
          expect(post).to.only.have.keys('id', 'author_id', 'updated_at', 'created_at');
        })
      })
    })

  })
});
