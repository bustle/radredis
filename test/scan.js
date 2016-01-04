const radredis = require('../src')
const flush = require('./flushdb')
const redisOpts = require('./redis-opts')
const expect = require('expect.js')
const Promise = require('bluebird')

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
  })
});
