import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'
import sinon     from 'sinon'

const schema = { title: 'Post' }
const beforeSave = sinon.spy()
const afterSave = sinon.spy()
const Post = radredis(schema, { beforeSave, afterSave }, redisOpts)

describe('Radredis', function() {
  before(flush)

  describe('.create', function(){
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

    it('should have equal created_at and updated_at', ()=>{
      expect(post.updated_at).to.eql(post.created_at)
    })

    it('should set a generated an id', ()=>{
      expect(post.id).to.be.a('number')
    })

    it('should call the beforeSave hook', function(){
      expect(beforeSave.calledOnce).to.be.ok()
    })

    it('should call the afterSave hook', function(){
      expect(afterSave.calledOnce).to.be.ok()
    })
  })
});
