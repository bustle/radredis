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
const Post = radredis(redisOpts).Model(schema)

describe('Radredis', function() {

  before(function(){
    return flush().then(function(){
      return Promise.all([
        Post.create({title: 'test', author_id: 1 }),
        Post.create({title: 'test', author_id: 2 }),
        Post.create({title: 'test', author_id: 3 }),
        Post.create({title: 'test', author_id: null })
      ])
    })
  })

  describe('.scan', function(){

    it('should return all results', function(done){
      const stream = Post.scan()
      let count = 0
      stream.on('data', (data) => {
        expect(data).to.be.an(Object)
        count++
      })
      stream.on('end', ()=>{
        expect(count).to.eql(4)
        done()
      })
    })

    it('should return only results in the index', function(done){
      const stream = Post.scan('author_id')
      let count = 0
      stream.on('data', (data) => {
        expect(data).to.be.an(Object)
        count++
      })
      stream.on('end', ()=>{
        expect(count).to.eql(3)
        done()
      })
    })

    it('should return only specified properties', function(done){
      const stream = Post.scan('author_id', ['author_id'])
      let count = 0
      stream.on('data', (data) => {
        expect(data).to.be.an(Object)
        expect(data).to.only.have.keys('id', 'author_id', 'updated_at', 'created_at');
        count++
      })
      stream.on('end', ()=>{
        expect(count).to.eql(3)
        done()
      })
    })
  })
});
