import Redis from 'ioredis'

import Model from './model'

import { mall
       , mrange
       } from './lua'

export default function(port, host, options) {

  const redis = new Redis(port, host, options)

  redis.defineCommand
    ( 'mall'
    , { numberOfKeys: 1
      , lua: mall
      }
    )

  redis.defineCommand
    ( 'mrange'
    , { numberOfKeys: 1
      , lua: mrange
      }
    )

  const models = {}
  const edges = {}

  const conn =
    { _redis: redis

    // singleton constructor
    , Model: (schema, scripts) => models[schema.title]
        || ( models[schema.title] = Model(redis, schema, scripts) )

    , Edge: schema =>
        null

    }

  return conn

}
