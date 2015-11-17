const Redis = require('ioredis')
const Promise = require('bluebird')
const _ = require('lodash')
// const validator = require('is-my-json-valid')

module.exports = function(schema, hooks = {}, redisOpts = {}){
  const modelKeyspace = schema.title.toLowerCase()
  // const validate = validator(schema)
  const indexedAttributes = _.reduce(schema.properties, (res, val, key) => {
    if (schema.properties[key].index === true){ res.push(key) }
    return res
  }, ['id', 'created_at', 'updated_at'])

  if (redisOpts.keyPrefix){
    redisOpts.keyPrefix = redisOpts.keyPrefix + modelKeyspace + ':'
  } else {
    redisOpts.keyPrefix = modelKeyspace
  }

  const redis = new Redis(redisOpts)

  return {
    _redis: redis,

    all: (params = {}) => {
      const limit = params.limit || 30
      const offset = params.offset || 0
      return redis.zrevrange('indexes:id', offset, offset + limit - 1)
      .then(findByIds)
      .tap(() => redis.disconnect({ reconnect: true }) )
    },

    find: (...ids) => findByIds(ids).tap( () => redis.disconnect({ reconnect: true }) ),

    create: attributes => {
      return redis.incr('id')
      .then(function(id){
        const now = Date.now()
        attributes.created_at = now
        attributes.updated_at = now
        if (hooks.beforeSave) { hooks.beforeSave(attributes) }
        return save(id, attributes)
      })
    },

    update: (id, attributes) => {
      return findByIds([id]).get(0).then((oldAttributes)=>{
        attributes.created_at = oldAttributes.created_at
        attributes.updated_at = Date.now()
        if (hooks.beforeSave) { hooks.beforeSave(attributes) }
        return save(id, attributes)
      })
    }
  }

  function getAttributes(id, transaction){
    transaction = transaction || redis
    return transaction.hgetall(`${id}:attributes`)
  }

  function save(id, attributes){
    const transaction = redis.multi()
    attributes.id = id
    return serialize(attributes)
    .then( serializedAttrs => transaction.hmset(`${id}:attributes`, serializedAttrs ))
    .then( () => updateIndexes(id, attributes, indexedAttributes, transaction) )
    .then( () => transaction.exec() )
    .return(attributes)
    .then(deserialize)
  }

  function updateIndexes(id, attributes, indexedAttributes, transaction){
    return Promise.resolve(indexedAttributes).map(key => {
      if ( attributes[key] === null || typeof attributes[key] === 'undefined'){
        return transaction.zrem('indexes:' + key, id)
      } else {
        return transaction.zadd('indexes:' + key, attributes[key], id)
      }
    })
  }



  function findByIds(ids){
    const transaction = redis.multi()

    return Promise.resolve(ids)
    .map(id => getAttributes(id, transaction))
    .then(() => transaction.exec() )
    .map(resultToObject)
    .map((attributes, index) => {
      attributes.id = ids[index]
      return attributes
    })
    .map(deserialize)
  }

  function deserialize(attributes){
    attributes.id = parseInt(attributes.id, 10)
    attributes.created_at = parseInt(attributes.created_at, 10)
    attributes.updated_at = parseInt(attributes.updated_at, 10)
    _.forEach(schema.properties, (value, key) => {
      if (attributes[key] !== undefined){
        if (value.type === 'array' || value.type === 'object'){
          attributes[key] = JSON.parse(attributes[key])
        }
        if (value.type === 'integer'){
          attributes[key] = parseInt(attributes[key], 10)
        }
      }
    })
    return attributes
  }

}

function serialize(attributes){
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
