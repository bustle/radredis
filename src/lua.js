import _ from 'lodash'

// Model scripts

const idToKey = 'KEYS[1]..":"..id..":attributes"'

const idsToResults = `
local results = {}
for i,id in ipairs(ids) do
  table.insert(results, redis.call("HMGET", ${idToKey}, unpack(ARGV)))
end
`
// props is always the first param, as tables are implemented as vectors so shifting is expensive

export const mall = `
local start = table.remove(ARGV)
local stop  = table.remove(ARGV) + start - 1
local index = table.remove(ARGV)

local ids = redis.call("ZREVRANGE", KEYS[1]..":indexes:"..index, start, stop)
${idsToResults}

return results
`

export const mrange = `
local max   = table.remove(ARGV)
local min   = table.remove(ARGV)
local start = table.remove(ARGV)
local stop  = table.remove(ARGV) + start - 1
local index = table.remove(ARGV)

local ids = redis.call("ZREVRANGEBYSCORE", KEYS[1]..":indexes:"..index, max, min, "LIMIT", start, stop)
${idsToResults}

return results
`

// create a local keys table
const getAttrKeys = `
local keys = {}
for i,v in ipairs(ARGV) do
  if i % 2 == 1 then
    keys[v] = i + 1
  end
end
`

// set an index of local id
const setIndex = (keyspace, index) =>
  `redis.call("ZADD", "${keyspace}:indexes:${index}", ARGV[keys["${index}"]], id)`

// remove index of local id
const remIndex = (keyspace, index) =>
  `redis.call("ZREM", "${keyspace}:indexes:${index}", id)`

// conditionally set index of a local id
const updateIndex = (keyspace, index) =>
  `if (ARGV[keys["${index}"]] ~= '') then ${setIndex(keyspace, index)} else ${remIndex(keyspace, index)} end `

export const MCreate = (keyspace, indices, before = '', after = '') => `
local time = table.remove(ARGV)
local id = redis.call("INCR", KEYS[1]..":id")
table.insert(ARGV, "id")
table.insert(ARGV, id)
table.insert(ARGV, "created_at")
table.insert(ARGV, time)
table.insert(ARGV, "updated_at")
table.insert(ARGV, time)
${getAttrKeys}
${before}
local result = redis.call("HMSET", ${idToKey}, unpack(ARGV))
${_.reduce(indices, (r, index) => r + updateIndex(keyspace, index), '')}
${after}
return ARGV
`

const maybeAppendAttr = (r, p, i) => r
  + `if not keys["${p}"] and attrs[${i+1}] then `
  + `table.insert(ARGV, "${p}") `
  + `table.insert(ARGV, attrs[${i+1}]) `
  + `end
`

export const MUpdate = (keyspace, indices, props, before = '', after = '') => `
local time = table.remove(ARGV)
local id = table.remove(ARGV)
table.insert(ARGV, "id")
table.insert(ARGV, id)
table.insert(ARGV, "updated_at")
table.insert(ARGV, time)
${getAttrKeys}
local attrs = redis.call("HMGET", ${idToKey}, "${_.join(props, '","')}")
if not attrs[1] then
  return { err = 'Model not found' }
end
${_.reduce(props, maybeAppendAttr, '')}
${before}
local result = redis.call("HMSET", ${idToKey}, unpack(ARGV))
${_.reduce(indices, (r, index) => r + updateIndex(keyspace, index), '')}
${after}
return ARGV
`

const appendAttr = (r, p, i) => r
  + `table.insert(model, "${p}") `
  + `table.insert(model, attrs[${i+1}]) `

export const MDelete = (keyspace, indices, props) => `
local id = table.remove(ARGV)
local attrs = redis.call("HMGET", ${idToKey}, "${_.join(props, '","')}")
if not attrs[1] then
  return { err = 'Model not found' }
end
redis.call("DEL", ${idToKey})
${_.reduce(indices, (r, index) => r + remIndex(keyspace, index), '')}
local model = {}
${_.reduce(props, appendAttr, '')}
return model
`

// Edge scripts
