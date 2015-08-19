import Redis from 'ioredis';

export default {
  get redisKeyPrefix() {
    return this._namespace ? `${this._namespace}:` : 'radredis:';
  },

  set redisNamespace(namespace) {
    return this._namespace = namespace;
  },

  get redis() {
    return this._redis || new Redis('redis://127.0.0.1:6379');
  },

  set redis(connection) {
    this._redis = connection;
  }
};
