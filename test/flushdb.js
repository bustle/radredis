const Redis = require('ioredis')
const redis = new Redis({db: 1});

module.exports = function(){
  return redis.flushdb()
}
