import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'
import Promise   from 'bluebird'

const postSchema = {
  title: 'Post',
  properties: {
    title: { type: 'string' }
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
        Post.create({title: 'test' }),
        Post.create({title: 'test' }),
        Post.create({title: 'test' }),
        Post.create({title: 'test' }),
        User.create({name: 'Larry David'})
      ])
    })
  })

  describe('.count', function(){

    it('should be the count of all Posts', function(){
      return Post.count().then((count)=>{
        expect(count).to.eql(4)
        expect(Number.isInteger(count)).to.eql(true)
      })
    })

  })
})
