import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'
import Promise   from 'bluebird'

const postSchema = {
  title: 'Post',
  properties: {
    title: { type: 'string' },
    author_id: { type: 'integer', index: true }
  }
}
const userSchema = {
  title: 'User',
  properties: {
    name: { type: 'string' }
  }
}
const Post = radredis(postSchema, {}, redisOpts)
const User = radredis(userSchema, {}, redisOpts)

describe('Radredis', function() {

  before(function(){
    return flush().then(function(){
      return Promise.all([
        Post.create({title: 'test', author_id: 1 }),
        Post.create({title: 'test', author_id: null }),
        Post.create({title: 'test', author_id: 1 }),
        Post.create({title: 'test', author_id: 1 }),
        User.create({name: 'Larry David'})
      ]).then(() => Post.delete(1))
    })
  })

  describe('.count', function(){

    it('should be the count of all Posts', function(){
      return Post.count().then((count)=>{
        expect(count).to.eql(3)
        expect(Number.isInteger(count)).to.eql(true)
      })
    })

    it('should be the count of all Posts with authors', function(){
      return Post.count({index: 'author_id'}).then((count)=>{
        expect(count).to.eql(2)
        expect(Number.isInteger(count)).to.eql(true)
      })
    })

  })
})
