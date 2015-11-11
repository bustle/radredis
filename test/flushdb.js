const Redis = require('ioredis')
const redisOpts = require('./redis-opts')
const redis = new Redis(redisOpts)

module.exports = function(){
  return redis.flushdb()
}
