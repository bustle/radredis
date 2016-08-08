import { default as radredis, RecordNotFound } from '../src'
import expect    from 'expect.js'

describe('Radredis', function() {

  it('should be a function', function(){
    expect(radredis).to.be.a('function')
  })

  it('should have a RecordNotFound error constructor', function(){
    expect(new radredis.RecordNotFound()).to.be.a(Error)
  })

  it('should export the error class and also set it as a property', function(){
    expect(radredis.RecordNotFound).to.be(RecordNotFound)
  })

});
