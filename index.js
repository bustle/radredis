const Redis = require('ioredis')
const Promise = require('bluebird')
const _ = require('lodash');

// Shares the same redis connection for all functions created by Radredis
let redis

module.exports = function(schema, transforms = {}, redisOpts = {}){
  redis = redis || new Redis(redisOpts)
  const modelKeyspace = schema.title.toLowerCase()

  function getAttributes(id, transaction){
    const key = [modelKeyspace, id, 'attributes'].join(':')
    return transaction.hgetall(key)
  }

  function setAttributes(id, attributes){
    const key = [modelKeyspace, id, 'attributes'].join(':')
    return redis.hmset(key, attributes).return([id, attributes])
  }

  function generateId(){
    return redis.incr([modelKeyspace, 'id'].join(':'))
  }

  function addToPrimaryKeyIndex(){
    var key = [modelKeyspace, 'indexes', 'id'].join(':')
    return redis.zadd(key, id, id);
  }

  return {
    _schema: schema,
    redis: redis,

    all: function(){},

    find: function(...ids){
      const transaction = redis.multi()
      return Promise.resolve(ids)
      .map(function(id){
        return getAttributes(id, transaction)
      })
      .then(() => transaction.exec() )
      .map(transformResults)
    },

    create: function(attributes){
      return generateId()
      .then(function(id){
        return setAttributes(id, attributes)
      })
      .then(returnCreatedObject)
    },

    update: function(id, attributes){
      return setAttributes(id, attributes)
    }
  }
}

function returnCreatedObject([id, attributes]){
  return _.assign({ id }, attributes)
}

function transformResults(results){
  return _.zipObject(_.chunk(results[1],2))
}
