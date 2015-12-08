const Redis = require('ioredis')
const Promise = require('bluebird')
const _ = require('lodash')
const through2 = require('through2')
// const validator = require('is-my-json-valid')

module.exports = function(schema, hooks, port, host, options){
  const modelKeyspace = schema.title.toLowerCase()
  // const validate = validator(schema)
  const indexedAttributes = _.reduce(schema.properties, (res, val, key) => {
    if (schema.properties[key].index === true){ res.push(key) }
    return res
  }, ['id', 'created_at', 'updated_at'])

  const redis = new Redis(port, host, options)

  return {
    _redis: redis,

    all: (params = {}) => {
      const limit = params.limit || 30
      const offset = params.offset || 0
      return redis.zrevrange(`${modelKeyspace}:indexes:id`, offset, offset + limit - 1)
      .then(findByIds)
    },

    find: (...ids) => findByIds(ids),

    create: attributes => {
      return redis.incr(`${modelKeyspace}:id`)
      .then(function(id){
        const now = Date.now()
        attributes.id = id
        attributes.created_at = now
        attributes.updated_at = now
        if (hooks && hooks.beforeSave) { hooks.beforeSave(attributes) }
        return save(attributes)
      })
    },

    update: (id, attributes) => {
      return findByIds([id]).get(0).then((oldAttributes)=>{
        attributes.id = oldAttributes.id
        attributes.created_at = oldAttributes.created_at
        attributes.updated_at = Date.now()
        if (hooks && hooks.beforeSave) { hooks.beforeSave(attributes, oldAttributes) }
        return save(attributes)
      })
    },

    delete: id => {
      return findByIds([id]).get(0).then(destroy)
    },

    scan: () => {
      return redis.zscanStream(`${modelKeyspace}:indexes:id`)
      .pipe(through2.obj(function (keys, enc, callback) {
        findByIds(_.pluck(_.chunk(keys, 2),0))
        .map((objs) => { this.push(objs) })
        .then(() => callback() )
      }))
    }
  }

  function getAttributes(id, transaction){
    transaction = transaction || redis
    return transaction.hgetall(`${modelKeyspace}:${id}:attributes`)
  }

  function save(attributes){
    const transaction = redis.multi()
    return serialize(attributes)
    .then( serializedAttrs => transaction.hmset(`${modelKeyspace}:${attributes.id}:attributes`, serializedAttrs ))
    .then( () => updateIndexes(attributes, indexedAttributes, transaction) )
    .then( () => transaction.exec() )
    .return(attributes)
    .then(deserialize)
  }

  function destroy(attributes) {
    const transaction = redis.multi()
    const id = attributes.id

    return Promise.map(indexedAttributes, (index) => removeFromIndex(id, index, transaction))
      .then( () => transaction.del(`${modelKeyspace}:${id}:attributes`) )
      .then( () => transaction.exec() )
      .return(attributes)
  }

  function updateIndexes(attributes, indexedAttributes, transaction){
    return Promise.resolve(indexedAttributes).map(key => {
      if ( attributes[key] === null || typeof attributes[key] === 'undefined'){
        return removeFromIndex(attributes.id, key, transaction)
      } else {
        return transaction.zadd(`${modelKeyspace}:indexes:${key}`, attributes[key], attributes.id)
      }
    })
  }

  function removeFromIndex(id, index, transaction) {
    return transaction.zrem(`${modelKeyspace}:indexes:${index}`, id);
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
          if(attributes[key]){
            attributes[key] = JSON.parse(attributes[key])
          } else {
            attributes[key] = null
          }
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
