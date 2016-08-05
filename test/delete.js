import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'
import sinon     from 'sinon'

const spy = sinon.spy()

const schema = {
  title: 'Post',
  properties: {
    title: { type: 'string', version: true },
    author_id: { type: 'integer', index: true }
  }
}
const Post = radredis(schema, { beforeSave: spy }, redisOpts)

describe('Radredis', () => {
  before(flush)

  describe('.delete', () => {

    describe('id does not exist', () => {

      it('should throw an error', () => {
        return Post.delete(56).catch(err => expect(err).to.be.a(radredis.RecordNotFound) )
      })
    })

    describe('id exists', () => {
      let post

      before(() => {
        return Post.create({ title: 'A Post Title', author_id: 6 })
          .then((result) => Post.update(result.id, {title: 'new title'}))
          .then((result) => Post.delete(result.id))
          .then((result) => post = result)
      })

      it('should not find a deleted id', () => {
        return Post.find(post.id).catch(err => console.log(Object.getPrototypeOf(err)) )
      })

      it('should delete from indexed attribute indexes', () => {
        return Post._redis.exists('post:1:versions:1')
          .then((result) => expect(result).to.eql(0))
      })

      it('should delete the old version', () => {
        return Post._redis.zrangebyscore('indexes:author_id', 6, 6)
          .then((result) => expect(result.length).to.eql(0))
      })

      it('should return deleted attributes', () => {
        expect(post).to.have.property('title', 'new title')
        expect(post).to.have.property('author_id', 6)
      })
    })
  })
})
