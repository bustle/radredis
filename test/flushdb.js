import Redis     from 'ioredis'
import redisOpts from './redis-opts'

const redis = new Redis(redisOpts)

export default function() {
  return redis.flushdb()
}
