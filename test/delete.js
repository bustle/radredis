const radredis = require('../src')
const flush = require('./flushdb')
const redisOpts = require('./redis-opts')
const expect = require('expect.js')
const sinon = require('sinon')
const spy = sinon.spy()

const schema = {
  title: 'Post',
  properties: {
    title: { type: 'string' },
    author_id: { type: 'integer', index: true }
  }
}
const Post = radredis(schema, { beforeSave: spy }, redisOpts)

const expectModelNotFound = [
  (result) => expect(result).to.be(undefined),
  (err) => {
    expect(err).to.not.be(undefined)
    expect(err.message).to.contain('Model not found')
  }]

describe('Radredis', () => {
  before(flush)

  describe('.delete', () => {

    describe('id does not exist', () => {

      it('should throw an error', () => {
        return Post.delete(56)
          .then(...expectModelNotFound)
      })
    })

    describe('id exists', () => {
      const attrs = { title: 'A Post Title', author_id: 6 }
      let post

      before(() => {
        return Post.create(attrs)
          .then((result) => Post.delete(result.id))
          .then((result) => post = result)
      })

      it('should delete an attributes key', () => {
        return Post.find(post.id)
          .then(...expectModelNotFound)
      })

      it('should delete from indexed attribute indexes', () => {
        return Post._redis.zrangebyscore('indexes:author_id', 6, 6)
          .then((result) => expect(result.length).to.eql(0))
      })

      it('should return deleted attributes', () => {
        for(let attr in attrs) {
          expect(post).to.have.property(attr, attrs[attr])
        }
      })
    })
  })
})
