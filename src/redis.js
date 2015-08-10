import Redis from 'ioredis';

export default {
  get namespace() {
    return this._namespace ? `${this._namespace}:` : 'radredis:';
  },

  set namespace(namespace) {
    return this._namespace = namespace;
  },

  get connection() {
    return this._redis || new Redis('redis://127.0.0.1:6379');
  },

  set connection(connection) {
    this._redis = connection;
  }
};
