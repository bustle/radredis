import _        from 'lodash'
import Promise  from 'bluebird'
import through2 from 'through2'

import { extractVals
       , AttachProps
       , splitPairs
       , systemProps
       , includeSystem
       , normalizeProps
       , serializeAttrs
       , DeserializeAttrs
       } from './utils'

import { MCreate
       , MUpdate
       , MDelete
       } from './lua'

export default function Model(redis, schema, { beforeSave, afterSave } = {}) {

  const keyspace = schema.title.toLowerCase()

  // normalize properties
  const props = _.assign
    ( {}
    , systemProps
    , normalizeProps(schema.properties)
    )

  const propNames = _.keys(props)
  const indices   = _.filter(propNames, k => props[k].index)

  const deserialize = DeserializeAttrs(props)

  // custom mutation commands

  const prefix = (redis.options.keyPrefix || '') + keyspace

  const create = `mcreate${keyspace}`
  redis.defineCommand
    ( create
    , { numberOfKeys: 1
      , lua: MCreate(prefix, indices, beforeSave, afterSave)
      }
    )

  const update = `mupdate${keyspace}`
  redis.defineCommand
    ( update
    , { numberOfKeys: 1
      , lua: MUpdate(prefix, indices, propNames, beforeSave, afterSave)
      }
    )

  const destroy = `mdelete${keyspace}`
  redis.defineCommand
    ( destroy
    , { numberOfKeys: 1
      , lua: MDelete(prefix, indices, propNames)
      }
    )

  const model =

    { _redis:    redis
    , _keyspace: keyspace

    // ACCESSORS

    , find: (ids, properties = propNames) =>
        ( properties = includeSystem(properties)
        , Array.isArray(ids)

            // ============== BEGIN CODE SMELL
            // TODO: refactor this int a general transaction builder
            // ideally the client should just write a promise map
            // and never have to worry about this optimization
            ? _.reduce
                ( ids
                , (p, id) =>
                    p.hmget(`${keyspace}:${id}:attributes`, properties)
                , redis.pipeline()
                ).exec()
                .map(extractVals)
                .map(AttachProps(properties))
                .map(deserialize)
            // ============== END CODE SMELL
                //
            : redis.hmget(`${keyspace}:${ids}:attributes`, properties)
                .then(AttachProps(properties))
                .then(deserialize)

        )

    , all: ( { properties = propNames
             , limit = 30
             , offset = 0
             , index = 'id'
             } = {}
           ) =>
        ( properties = includeSystem(properties)
        , redis.mall(keyspace, properties, index, limit, offset)
            .map(AttachProps(properties))
            .map(deserialize)
        )

    , range: ( { index = 'id'
               , min
               , max
               , properties = propNames
               , limit = 30
               , offset = 0
               }
             ) =>
        ( properties = includeSystem(properties)
        , redis.mrange(keyspace, properties, index, limit, offset, min, max)
            .map(AttachProps(properties))
            .map(deserialize)
        )

    // MUTATORS

    , create: attrs =>
        redis[create](keyspace, serializeAttrs(attrs), +Date.now())
          .then(splitPairs)
          .then(deserialize)

    , update: (id, attrs) =>
        redis[update](keyspace, serializeAttrs(attrs), id, +Date.now())
          .then(splitPairs)
          .then(deserialize)

    , delete: id =>
        redis[destroy](keyspace, id)
          .then(splitPairs)
          .then(deserialize)

    // SCAN

    , scan: (index = 'id', props = propNames) =>
        redis.zscanStream(`${keyspace}:indexes:${index}`)
          .pipe(through2.obj(function (keys, enc, callback) {
            model.find(_.map(_.chunk(keys, 2), '0'), props)
              .map(objs => { this.push(objs) })
              .then(() => callback() )
          }))

    }

  return model

}
