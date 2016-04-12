import radredis  from '../src'
import flush     from './flushdb'
import redisOpts from './redis-opts'
import expect    from 'expect.js'

const schema = { title: 'Post', properties: { title: 'string' } }
const Post = radredis(redisOpts).Model(schema)

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

    it('should set a generated an id', ()=>{
      expect(post.id).to.be.a('number')
    })
/*  TODO: fix these tests, before and after save are scripts not hooks now
    it('should call the beforeSave hook', function(){
      expect(beforeSave.calledOnce).to.be.ok()
    })

    it('should call the afterSave hook', function(){
      expect(afterSave.calledOnce).to.be.ok()
    })*/
  })
});
