import Config from './config';
import Attribute from './model/attribute';

class Model {

  //class methods

  static get redis() {
    return Config.redis;
  }

  static get redisKey() {
    return Config.redisKeyPrefix + this._redisKey;
  }

  static get schema() {
    return this._schema;
  }

  static set redisKey(key) {
    this._redisKey = key;
  }

  static set schema(schema) {
    for(let param of schema) {
      Attribute.define(this.prototype, param);
    }   
    this._schema = schema;
  }

  static find(id) {
    return new Promise((resolve, reject) => {
      let model = new this;
      model.attributes.id = id;
      model.load().then((model) => {
        resolve(model);
      }).catch(reject);
    });
  }

  //instance methods

  constructor(attributes={}) {
    this._attributes = attributes;
  }

  generateId() {
    return this.redis.incr(this.constructor.redisKey + ':id');
  }

  get attributes() {
    return this._attributes;
  }

  get id() {
    return this.attributes.id;
  }

  get redis() {
    return this.constructor.redis;
  }

  get redisKey() {
    let key = this.constructor.redisKey + ':' + this.id;
    return key;
  }

  create() {
    return new Promise((resolve, reject) => {
      this.generateId().then((id) => {
        this.attributes.id = id;
        this.update().then(resolve(this)).catch(reject);
      }).catch(reject);
    })
  }

  load() {
    return new Promise((resolve, reject) => {
      this.redis.hgetall(this.redisKey + ':_attributes').then((data) => {
        this._attributes = data;
        resolve(this);
      }).catch(reject);
    })
  }

  save() {
    if(this.id) {
      return this.update();
    } else {
      return this.create();
    }
  }

  update() {
    return new Promise((resolve, reject) => {
      this.redis.hmset(this.redisKey + ':_attributes', this.attributes).then(resolve(this)).catch(reject);
    })
  }

  destroy() {
    return new Promise((resolve, reject) => {
      this.redis.del(this.redisKey + ':_attributes').then(resolve(this)).catch(reject);
    })
  }

}

export default Model;
