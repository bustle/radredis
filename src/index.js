const Redis = require('ioredis')
const Promise = require('bluebird')
const _ = require('lodash')
const through2 = require('through2')
// const validator = require('is-my-json-valid')

const systemProps = ['id', 'created_at', 'updated_at']

module.exports = function(schema, hooks, port, host, options){
  const modelKeyspace = schema.title.toLowerCase()
  // const validate = validator(schema)
  const indexedAttributes = _.reduce(schema.properties, (res, val, key) => {
    if (schema.properties[key].index === true){ res.push(key) }
    return res
  }, systemProps)

  const redis = new Redis(port, host, options)

  return {
    _redis: redis,

    all: ({ properties, limit = 30, offset = 0, index = 'id' } = {}) => {
      return redis.zrevrange(`${modelKeyspace}:indexes:${index}`, offset, offset + limit - 1)
      .then((ids)=>{
        return findByIds(ids, properties)
      })
    },

    find: (...ids) => findByIds(ids),

    range: ({ min, max, properties, limit = 30, offset = 0, index = 'id' }) => {
      return redis.zrevrangebyscore(`${modelKeyspace}:indexes:${index}`, max, min, 'LIMIT', offset, offset + limit - 1)
      .then((ids)=>{
        return findByIds(ids, properties)
      })
    },

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
      .then(runAfterSave)
    },

    update: (id, attributes) => {
      return findByIds([id]).get(0).then((oldAttributes)=>{
        attributes.id = oldAttributes.id
        attributes.created_at = oldAttributes.created_at
        attributes.updated_at = Date.now()
        if (hooks && hooks.beforeSave) { hooks.beforeSave(attributes, oldAttributes) }
        return save(attributes)
      })
      .then(runAfterSave)
    },

    delete: id => {
      return findByIds([id]).get(0).then(destroy)
    },

    scan: (index, props) => {
      index = index || 'id'
      return redis.zscanStream(`${modelKeyspace}:indexes:${index}`)
      .pipe(through2.obj(function (keys, enc, callback) {
        findByIds(_.pluck(_.chunk(keys, 2),0), props)
        .map((objs) => { this.push(objs) })
        .then(() => callback() )
      }))
    }
  }

  function runAfterSave(attributes) {
    if (hooks && hooks.afterSave) {
      return Promise.resolve(hooks.afterSave(attributes)).return(attributes)
    } else {
      return Promise.resolve(attributes)
    }
  }

  function getAttributes(id, transaction, props){
    transaction = transaction || redis
    if (props){
      return transaction.hmget(`${modelKeyspace}:${id}:attributes`, props)
    } else {
      return transaction.hgetall(`${modelKeyspace}:${id}:attributes`)
    }
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

  function findByIds(ids, props){
    const transaction = redis.multi()

    if (props) { props = systemProps.concat(props) }

    return Promise.resolve(ids)
    .map(id => getAttributes(id, transaction, props))
    .then(() => transaction.exec() )
    .then(resultsToObjects)
    .map((attributes, index) => {
      attributes.id = ids[index]
      return attributes
    })
    .map(deserialize)

    function resultsToObjects(results){
      if (props){
        return hmgetToObjects(results, props)
      } else {
        return hgetallToObjects(results)
      }
    }
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

function hmgetToObjects(results, props){
  return results.map(([err, values])=>{
    if (err){ throw err }
    if (values.length === 0 ){ throw new Error('Model not found') }
    return _.zipObject(props, values)
  })
}

function hgetallToObjects(results){
  return results.map(([err, values])=>{
    if (err){ throw err }
    if (values.length === 0 ){ throw new Error('Model not found') }
    return _.zipObject(_.chunk(values,2))
  })
}
