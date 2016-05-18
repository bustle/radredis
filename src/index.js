import Redis    from 'ioredis'
import Promise  from 'bluebird'
import _        from 'lodash'
import through2 from 'through2'

const systemProps = ['id', 'created_at', 'updated_at']

export default function(schema, transforms, port, host, options){
  const modelKeyspace = schema.title.toLowerCase()
  const indexedAttributes = _.reduce(schema.properties, (res, val, key) => {
    if (schema.properties[key].index === true){ res.push(key) }
    return res
  }, systemProps)

  const redis = new Redis(port, host, options)

  return {
    _redis: redis,

    all: ({ properties, limit = 30, offset = 0, index = 'id' } = {}) => {
      return redis.zrevrange(`${modelKeyspace}:indexes:${index}`, offset, offset + limit - 1)
      .then((ids) => findByIds(ids, properties) )
    },

    find: find,

    range: ({ min, max, properties, limit = 30, offset = 0, index = 'id' }) => {
      return redis.zrevrangebyscore(`${modelKeyspace}:indexes:${index}`, max, min, 'LIMIT', offset, offset + limit - 1)
      .then((ids)=>{
        return findByIds(ids, properties)
      })
    },

    create: attributes => {
      return generateId()
      .then((oldModel)=>{
        const model = Object.assign({}, oldModel, sanitize(attributes))
        return [model, null]
      })
      .spread(run('beforeSave'))
      .then(save)
    },

    update: (id, attributes) => {
      return find(id)
      .then((foundModel)=>{
        const model = Object.assign({}, foundModel, sanitize(attributes))
        return [model, foundModel]
      })
      .spread(run('beforeSave'))
      .then(save)
    },

    replace: (id, attributes) => {
      return find(id)
      .then((foundModel)=>{
        const model = replaceAttributes(foundModel, sanitize(attributes))
        return [model, foundModel]
      })
      .spread(run('beforeSave'))
      .then(save)
    },

    delete: id => {
      return find(id).then(destroy)
    },

    scan: (index, props) => {
      index = index || 'id'
      return redis.zscanStream(`${modelKeyspace}:indexes:${index}`)
      .pipe(through2.obj(function (keys, enc, callback) {
        findByIds(_.map(_.chunk(keys, 2), '0'), props)
        .map((objs) => { this.push(objs) })
        .then(() => callback() )
      }))
    }
  }

  function run(name) {
    return function(model, oldModel){
      if (transforms && transforms[name]) {
        return Promise.resolve(transforms[name](model, oldModel)).return(model)
      } else {
        return Promise.resolve(model)
      }
    }
  }

  function replaceAttributes(model, attributes){
    return Object.assign({}, _.pick(model, 'id', 'created_at', 'updated_at'), attributes)
  }

  function getAttributes(id, transaction, props){
    transaction = transaction || redis
    if (props){
      return transaction.hmget(`${modelKeyspace}:${id}:attributes`, props)
    } else {
      return transaction.hgetall(`${modelKeyspace}:${id}:attributes`)
    }
  }

  function save(model){
    const transaction = redis.multi()

    return updateTimestamps(model)
    .then(serialize)
    .then( serializedAttrs => transaction.hmset(`${modelKeyspace}:${model.id}:attributes`, serializedAttrs ))
    .then( () => updateIndexes(model, indexedAttributes, transaction) )
    .then( () => transaction.exec() )
    .return(model)
    .then(run('afterSave'))
  }

  function destroy(model) {
    const transaction = redis.multi()
    const id = model.id

    return Promise.map(indexedAttributes, (index) => removeFromIndex(id, index, transaction))
      .then( () => transaction.del(`${modelKeyspace}:${id}:attributes`) )
      .then( () => transaction.exec() )
      .return(model)
  }

  function updateIndexes(model, indexedAttributes, transaction){
    return Promise.resolve(indexedAttributes).map(key => {
      if ( model[key] === null || typeof model[key] === 'undefined'){
        return removeFromIndex(model.id, key, transaction)
      } else {
        return transaction.zadd(`${modelKeyspace}:indexes:${key}`, model[key], model.id)
      }
    })
  }

  function removeFromIndex(id, index, transaction) {
    return transaction.zrem(`${modelKeyspace}:indexes:${index}`, id)
  }

  function find(obj){
    return Array.isArray(obj) ? findByIds(obj) : findByIds([obj]).get(0)
  }

  function findByIds(ids, props){
    const transaction = redis.pipeline()

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
      return results.map(([err, values]) => {
        if (err) { throw err }
        if (_.isEmpty(values)) { throw new Error ('Model not found') }
        return props ? _.zipObject(props, values) : values
      })
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
        if (value.type === 'boolean'){
          if (attributes[key] === 'false'){ attributes[key] = false }
          if (attributes[key] === 'true'){ attributes[key] = true }
        }
        if (value.type === 'number'){
          attributes[key] = parseFloat(attributes[key], 10)
        }
      }
    })
    return attributes
  }

  function generateId(){
    return redis.incr(`${modelKeyspace}:id`).then((id) => { return { id } })
  }
}

function sanitize(attributes){
  return _.omit(attributes, 'id', 'updated_at', 'created_at')
}

function updateTimestamps(model){
  const now = Date.now()
  if (!model.created_at) { model.created_at = now }
  model.updated_at = now
  return Promise.resolve(model)
}

function serialize(model){
  _.forOwn(model, (val, key)=>{
    if (_.isObject(val)){
      model[key] = JSON.stringify(val)
    }
  })
  return Promise.resolve(_.omit(model, 'id'))
}
