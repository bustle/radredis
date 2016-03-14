import _       from 'lodash'
import Promise from 'bluebird'

// pass redis errors as rejected promises
export function extractVals([ err, val ]) {
  return err
    ? Promise.reject(err)
    : Promise.resolve(val)
}

export function AttachProps(props) {
  return function attachProps(vals) {
    return Promise.resolve([vals, props])
  }
}

// TODO: optimize
// [ 0, 1, 2, 3, 4, 5 ] => [ [ 1, 3, 5 ], [ 0, 2, 4 ] ]
export function splitPairs(vals) {
  return [ _.filter(vals, (v, i) => i % 2 === 1)
         , _.filter(vals, (v, i) => i % 2 === 0)
         ]
}

export const systemProps =
  { id:         { type: 'integer', index: true }
  , created_at: { type: 'integer', index: true }
  , updated_at: { type: 'integer', index: true }
  }

export function includeSystem(props) {
  return _.union(props, ['id', 'created_at', 'updated_at'])
}

// normalize and allow shorthands for non-index props
export function normalizeProps(props) {
  return _.mapValues
    ( props
    , prop => ( typeof prop === "string" )
        ? { type: prop }
        : prop
    )
}

export function serializeAttrs(attrs) {
  return _(attrs)
    .mapValues(val => _.isObject(val) ? JSON.stringify(val) : val)
    .toPairs()
    .flatten()
    .value()
}

export function DeserializeAttrs(props) {
  return function deserializeAttrs([ values, ps ]) {
    // check for undefined models
    if (!_.reduce(values, (r, v) => r || v, false))
      return Promise.reject(new Error('Model not found'))
    // zip and deserialize
    return _(ps)
      .zipObject(values)
      .omitBy(_.isNull)
      .mapValues
        ( (v, k) => {
            const type = props[k].type
            if (type === 'array' || type === 'object') {
              return JSON.parse(v)
            }
            if (type === 'integer') {
              return parseInt(v, 10)
            }
            if (type === 'number') {
              return parseFloat(v, 10)
            }
            if (type === 'boolean') {
              if (v === 'false') return false
              if (v === 'true' ) return true
            }
            return v
          }
        )
      .value()
  }
}
