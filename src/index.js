import Redis    from 'ioredis'
import Promise  from 'bluebird'
import _        from 'lodash'
import through2 from 'through2'

const systemProps = ['id', 'created_at', 'updated_at']

export default function(schema, transforms, port, host, options){
  const keyspace = schema.title.toLowerCase()

  const indexedAttributes = _.reduce(schema.properties, (res, val, key) => {
    if (schema.properties[key].index === true){ res.push(key) }
    return res
  }, systemProps)

  const redis = new Redis(port, host, options)

  return {
    _redis: redis,

    all: ({ properties, limit = 30, offset = 0, index = 'id' } = {}) => {
      return redis.zrevrange(`${keyspace}:indexes:${index}`, offset, offset + limit - 1)
      .then((ids) => findByIds(ids, properties) )
    },

    find: find,

    range: ({ min, max, properties, limit = 30, offset = 0, index = 'id' }) => {
      return redis.zrevrangebyscore(`${keyspace}:indexes:${index}`, max, min, 'LIMIT', offset, offset + limit - 1)
      .then((ids)=> findByIds(ids, properties) )
    },

    create: attributes => {
      return generateRecord()
      .then((emptyRecord)=>{
        const newRecord = _.assign(emptyRecord, sanitize(attributes))
        return [newRecord, null]
      })
      .spread(save)
    },

    update: (id, attributes) => {
      return find(id)
      .then((oldRecord)=>{
        const newRecord = _.assign({}, oldRecord, sanitize(attributes))
        return [newRecord, oldRecord]
      })
      .spread(save)
    },

    replace: (id, attributes) => {
      return find(id)
      .then((oldRecord)=>{
        const newRecord = replaceAttributes(oldRecord, sanitize(attributes))
        return [newRecord, oldRecord]
      })
      .spread(save)
    },

    delete: id => {
      return find(id).then(destroy)
    },

    scan: (index, props) => {
      index = index || 'id'
      return redis.zscanStream(`${keyspace}:indexes:${index}`)
      .pipe(through2.obj(function (keys, enc, callback) {
        findByIds(_.map(_.chunk(keys, 2), '0'), props)
        .map((objs) => { this.push(objs) })
        .then(() => callback() )
      }))
    }
  }

  function run(name) {
    return function(newRecord, oldRecord){
      if (transforms && transforms[name]) {
        return Promise.resolve(transforms[name](newRecord, oldRecord)).return(newRecord)
      } else {
        return Promise.resolve(newRecord)
      }
    }
  }

  function replaceAttributes(record, attributes){
    return _.assign({}, _.pick(record, 'id', 'created_at', 'updated_at'), attributes)
  }

  function getAttributes(id, transaction, props){
    transaction = transaction || redis
    if (props){
      return transaction.hmget(`${keyspace}:${id}:attributes`, props)
    } else {
      return transaction.hgetall(`${keyspace}:${id}:attributes`)
    }
  }

  function save(newRecord, oldRecord){
    const transaction = redis.multi()
    const removedKeys = _.difference(_.keys(oldRecord), _.keys(newRecord))

    return run('beforeSave')(newRecord, oldRecord)
    .then(updateTimestamps)
    .then(serialize)
    .then( serializedAttrs => transaction.hmset(`${keyspace}:${newRecord.id}:attributes`, serializedAttrs ))
    .then( () => updateIndexes(newRecord, transaction) )
    .then( () => removeKeys(newRecord, removedKeys, transaction) )
    .then( () => transaction.exec() )
    .return(newRecord)
    .then(run('afterSave'))
  }

  function destroy(record) {
    const transaction = redis.multi()
    const id = record.id

    return Promise.map(indexedAttributes, (index) => removeFromIndex(id, index, transaction))
      .then( () => transaction.del(`${keyspace}:${id}:attributes`) )
      .then( () => transaction.exec() )
      .return(record)
  }

  function removeKeys(newRecord, keys, transaction){
    return Promise.resolve(keys).map( key => transaction.hdel(`${keyspace}:${newRecord.id}:attributes`, key ))
  }

  function updateIndexes(record, transaction){
    return Promise.resolve(indexedAttributes).map(key => {
      if ( record[key] === null || typeof record[key] === 'undefined'){
        return removeFromIndex(record.id, key, transaction)
      } else {
        return transaction.zadd(`${keyspace}:indexes:${key}`, record[key], record.id)
      }
    })
  }

  function removeFromIndex(id, index, transaction) {
    return transaction.zrem(`${keyspace}:indexes:${index}`, id)
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

  function generateRecord(){
    return redis.incr(`${keyspace}:id`).then((id) => { return { id } })
  }
}

function sanitize(attributes){
  return _.omit(attributes, 'id', 'updated_at', 'created_at')
}

function updateTimestamps(record){
  const now = Date.now()
  if (!record.created_at) { record.created_at = now }
  record.updated_at = now
  return Promise.resolve(record)
}

function serialize(record){
  const serializedRecord = _.mapValues(record, (val) => {
    if (_.isObject(val)){
      return JSON.stringify(val)
    } else  {
      return val
    }
  })
  return Promise.resolve(_.omit(serializedRecord, 'id'))
}
