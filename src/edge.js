import _       from 'lodash'
import Promise from 'bluebird'

export default function Edge(redis, schema) {

  const edge =

    { _redis : redis

    , _type  : schema.name
    , _from  : schema.from
    , _to    : schema.to

    // will be populated after edge object is constructed
    , inv    : null

    // ACCESSORS

    , from: (from, { properties, limit = 30, offset = 0 } = {}) =>
        null

    , of: from =>
        null

    // MUTATORS

    , set: (from, to, weight) =>
        null

    , move: (from, oldIndex, newIndex) =>
        null

    , delete: (from, to) =>
        null

    , deleteAll: from =>
        null

    }

}
