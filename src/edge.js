import _       from 'lodash'
import Promise from 'bluebird'

import { chunkScores
       , BuildEdge
       } from './utils'

export default function Edge(redis, schema) {

  const type     = schema.name
  const keyspace = schema.name.toLowerCase()

  const edge =

    { _redis    : redis

    , _keyspace : keyspace
    , _type     : schema.name
    , _from     : schema.from
    , _to       : schema.to

    // will be populated after edge object is constructed
    , inv       : null

    // ACCESSORS

    , from: (from, { properties, limit = 30, offset = 0 } = {}) =>
        redis.zrevrange(`${keyspace}:${from}`, offset, offset + limit - 1, 'WITHSCORES')
          .then(chunkScores)
          .map(BuildEdge(type, from))

    , of: from =>
        redis.zrevrange(`${keyspace}:${from}`, 0, 1, 'WITHSCORES')
          .then(BuildEdge(type, from))

    , pos: (from, to) =>
        redis.zscore(`${keyspace}:${from}`, to)

    // MUTATORS

    , set: (from, to, pos) =>
        null

    , move: (from, oldPos, newPos) =>
        null

    , delete: (from, to) =>
        null

    , deleteAll: from =>
        null

    }

  return edge

}
