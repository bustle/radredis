import radredis  from '../src'
import expect    from 'expect.js'

describe('Radredis', function() {

  it('should be a function', function(){
    expect(radredis).to.be.a('function')
  })

  it('should have a RecordNotFound error constructor', function(){
    expect(new radredis.RecordNotFound()).to.be.a(Error)
  })

});
