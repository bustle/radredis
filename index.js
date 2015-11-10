const Redis = require('ioredis')
const Promise = require('bluebird')
const _ = require('lodash')
// const validator = require('is-my-json-valid')

// Shares the same redis connection everywhere. May need to alter later
let redis

module.exports = function(schema, transforms = {}, redisOpts = {}){
  const modelKeyspace = schema.title.toLowerCase()
  // const validate = validator(schema)

  if (redisOpts.keyPrefix){
    redisOpts.keyPrefix = redisOpts.keyPrefix + modelKeyspace + ':'
  } else {
    redisOpts.keyPrefix = modelKeyspace
  }

  redis = redis || new Redis(redisOpts)

  return {
    all: function(params = {}){
      const limit = params.limit || 30
      const offset = params.offset || 0
      return redis.zrevrange('indexes:id', offset, offset + limit - 1)
      .then(findByIds)
    },

    find: function(...ids){
      return findByIds(ids)
    },

    create: function(attributes){
      return redis.incr('id')
      .then(function(id){
        const transaction = redis.multi()
        const now = Date.now()
        attributes.created_at = now
        attributes.updated_at = now
        return Promise.all([
          saveAttributes(id, attributes, transaction),
          updatePrimaryKeyIndex(id, transaction),
        ])
        .then(() => transaction.exec() )
        .return(_.assign({ id }, attributes))
        .then(coerceFromRedis)
      })
    },

    update: function(id, attributes){
      return findByIds([id]).then((oldAttributes)=>{
        attributes.created_at = oldAttributes.created_at
        attributes.updated_at = Date.now()
        return saveAttributes(id, attributes)
        .return(_.assign({ id }, attributes))
        .then(coerceFromRedis)
      })
    }
  }

  function getAttributes(id, transaction){
    transaction = transaction || redis
    return transaction.hgetall(`${id}:attributes`)
  }

  function saveAttributes(id, attributes, transaction){
    transaction = transaction || redis
    return coerceToRedis(attributes)
    .then((transformedAttributes) => transaction.hmset(`${id}:attributes`, transformedAttributes ))
  }

  function updatePrimaryKeyIndex(id, transaction){
    transaction = transaction || redis
    return transaction.zadd('indexes:id', id, id);
  }

  function findByIds(ids){
    const transaction = redis.multi()

    return Promise.resolve(ids)
    .map((id) => getAttributes(id, transaction))
    .then(() => transaction.exec() )
    .map(resultToObject)
    .map((attributes, index) => {
      attributes.id = ids[index]
      return attributes
    })
    .map(coerceFromRedis)
  }

  function coerceFromRedis(attributes){
    attributes.id = parseInt(attributes.id, 10)
    attributes.created_at = parseInt(attributes.created_at, 10)
    attributes.updated_at = parseInt(attributes.updated_at, 10)
    _.forEach(schema.properties, (value, key) => {
      if (value.type === 'array' || value.type === 'object'){
        attributes[key] = JSON.parse(attributes[key])
      }
    })
    return attributes
  }

}

function coerceToRedis(attributes){
  _.forOwn(attributes, (val, key)=>{
    if (_.isObject(val)){
      attributes[key] = JSON.stringify(val)
    }
  })
  return Promise.resolve(attributes)
}



function resultToObject(result){
  if (result[0]){
    throw result[0]
  }
  if (result[1].length === 0 ){
    throw new Error('Model not found')
  }
  return _.zipObject(_.chunk(result[1],2))
}
