import Redis    from 'ioredis'
import Promise  from 'bluebird'
import _        from 'lodash'
import through2 from 'through2'

const systemProps = ['id', 'created_at', 'updated_at']

export class RecordNotFound extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'RecordNotFound';
  }
}

radredis.RecordNotFound = RecordNotFound

export default radredis

function radredis(schema, transforms, port, host, options){
  const keyspace = schema.title.toLowerCase()

  const indexedAttributes = _.reduce(schema.properties, (res, val, key) => {
    if (schema.properties[key].index === true){ res.push(key) }
    return res
  }, systemProps)

  const versionedAttributes = _.reduce(schema.properties, (res, val, key) => {
    if (schema.properties[key].version === true){ res.push(key) }
    return res
  }, [])

  const versioned = versionedAttributes.length > 0

  const redis = new Redis(port, host, options)

  return {
    _redis: redis,

    all: ({ properties, limit = 30, offset = 0, index = 'id' } = {}) => {
      return redis.zrevrange(`${keyspace}:indexes:${index}`, offset, offset + limit - 1)
      .then((ids) => findByIds(ids, properties) )
    },

    find: find,

    versions: (id) => {
      return find(id).then(getVersions)
    },

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

  function getVersionAttributes(id, version, transaction){
    transaction = transaction || redis
    return transaction.hgetall(`${keyspace}:${id}:versions:${version}`)
  }

  function getVersions(record){
    const transaction = redis.pipeline()

    if (versioned){
      return Promise.resolve(_.range(record._v - 1, 0))
      .map(version => getVersionAttributes(record.id, version, transaction) )
      .then(() => transaction.exec() )
      .then(resultsToObjects)
      .map((attributes) => {
        attributes.id = record.id
        return attributes
      })
      .map(deserialize)
      .then((versions) => [record].concat(versions) )
    } else {
      return [ record ]
    }
  }

  function save(newRecord, oldRecord){
    const transaction = redis.multi()
    const removedKeys = _.difference(_.keys(oldRecord), _.keys(newRecord))

    let newVersion
    if (versioned) {
      newVersion = oldRecord ? _.some(versionedAttributes, (attr) => !_.isEqual(newRecord[attr], oldRecord[attr]) ) : true
    }

    return run('beforeSave')(newRecord, oldRecord)
    .then(updateTimestamps)
    .then(updateVersion)
    .then(writeVersion)
    .then(writeAttributes)
    .then( () => updateIndexes(newRecord, transaction) )
    .then( () => removeKeys(newRecord, removedKeys, transaction) )
    .then( () => transaction.exec() )
    .return(newRecord)
    .then(run('afterSave'))

    function writeVersion(){
      if (versioned && oldRecord){
        return transaction.hmset(`${keyspace}:${oldRecord.id}:versions:${oldRecord._v}`, serialize(oldRecord))
      }
    }

    function writeAttributes(){
      return transaction.hmset(`${keyspace}:${newRecord.id}:attributes`, serialize(newRecord))
    }

    function updateVersion() {
      if (versioned && newVersion === true){
        if (!oldRecord){
          newRecord._v = 1
        } else {
          if (oldRecord._v){
            newRecord._v = oldRecord._v + 1
          } else {
            newRecord._v = 2
            oldRecord._v = 1
          }
        }
      }
    }

    function updateTimestamps(){
      const now = Date.now()
      if (!newRecord.created_at) { newRecord.created_at = now }
      newRecord.updated_at = now
    }
  }

  function destroy(record) {
    const transaction = redis.multi()
    const id = record.id

    return Promise.map(indexedAttributes, (index) => removeFromIndex(id, index, transaction))
      .then( () => transaction.del(`${keyspace}:${id}:attributes`) )
      .then( () => {
          if (record._v){
            return Promise.all(_.range(1,record._v).map((version) => transaction.del(`${keyspace}:${id}:versions:${version}`)))
          }
      })
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

  function find(obj, props){
    return Array.isArray(obj) ? findByIds(obj, props) : findByIds([obj], props).get(0)
  }

  function findByIds(ids, props){
    const transaction = redis.pipeline()

    if (props) { props = systemProps.concat(props) }

    return Promise.resolve(ids)
    .map(id => getAttributes(id, transaction, props))
    .then(() => transaction.exec() )
    .then((results) => resultsToObjects(results, props) )
    .map((attributes, index) => {
      attributes.id = ids[index]
      return attributes
    })
    .map(deserialize)
  }

  function deserialize(attributes){
    ['id', '_v', 'created_at', 'updated_at'].map((key) => {
      if( attributes[key] ){ attributes[key] = parseInt(attributes[key], 10) }
    })

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

function resultsToObjects(results, props){
  return results.map(([err, values]) => {
    if (err) { throw err }
    if (_.isEmpty(values)) { throw new RecordNotFound() }
    return props ? _.zipObject(props, values) : values
  })
}

function sanitize(attributes){
  return _.omit(attributes, 'id', 'updated_at', 'created_at')
}

function serialize(record){
  return _.omit(_.mapValues( record, (val) => _.isObject(val) ? JSON.stringify(val) : val ), 'id')
}
