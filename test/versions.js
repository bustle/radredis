import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'

const schema = {
  title: 'Post',
  properties: {
    title: { type: 'string'},
    bodies: { type: 'array'}
  }
}

const versionedSchema = {
  title: 'Post',
  properties: {
    title: { type: 'string', version: true },
    bodies: { type: 'array'}
  }
}

describe('Radredis', function() {
  describe('.versions', function(){

    describe('not versioned', function(){
      const Post = radredis(schema, {}, redisOpts)

      before(function(){
        return flush()
        .then(() => Post.create({ title: 'foo' }) )
        .then((result) => Post.update(result.id, { title: 'bar' }))
      })

      it('should return an array of versions', function(){
        return Post.versions(1).then((versions) =>{
          expect(versions).to.be.an('array')
          expect(versions.length).to.eql(1)
        })
      })
    })

    describe('versioned', function(){
      const Post = radredis(versionedSchema, {}, redisOpts)

      before(function(){
        return flush()
        .then(() => Post.create({ title: 'foo' }) )
        .then((result) => Post.update(result.id, { title: 'bar' }))
      })


      it('should return an array of versions', function(){
        return Post.versions(1).then((versions) =>{
          expect(versions).to.be.an('array')
          expect(versions.length).to.eql(2)
        })
      })
    })

    describe('adding versions to existing schema', function(){
      const Post = radredis(schema, {}, redisOpts)
      const PostwVersions = radredis(versionedSchema, {}, redisOpts)
      
      let versions

      before(function(){
        return Post.create({ title: 'foo' })
        .then((result) => PostwVersions.update(result.id, { title: 'bar' }))
        .then((result) => PostwVersions.versions(result.id) )
        .then((result) => versions = result )
      })


      it('should return an array of versions', function(){
        expect(versions).to.be.an('array')
        expect(versions.length).to.eql(2)
      })
    })
  })
});
