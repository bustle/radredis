import Promise    from 'bluebird';
import Config     from './config';
import CoreObject from './core-object';
import Attribute  from './model/attribute';
import State      from './model/state';

class Model extends CoreObject {

  //class methods
  static get redis() {
    return this._redis || Config.redis;
  }

  //NOTE THIS IS TEMPORARY UNTIL WE DECIDE HOW TO PROCEED WITH AN ADAPTER
  static set redis(redis) {
    this._redis = redis;
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

  static set afterCreate(func) {
    this._afterCreate = func;
  }

  static set beforeCreate(func) {
    this._beforeCreate = func;
  }

  static set afterUpdate(func) {
    this._afterUpdate = func;
  }

  static set beforeUpdate(func) {
    this._beforeUpdate = func;
  }

  static find(id) {
    if(typeof(id) == 'object'){
      this.findAll(id)
    }else{
      return new Promise((resolve, reject) => {
        let model = new this;
        model.attributes.id = id;
        model.load().then((model) => {
          resolve(model);
        }).catch(reject);
      });
    }
  }

  static findAll(ids) {
    return new Promise((resolve, reject) => {
      let pipeline = this.redis.pipeline();
      for(let id of ids) {
        pipeline.hgetall(this.redisKey + ':' + id + ':_attributes');
      }
      pipeline.exec((err, results) => {
        let models = [];
        for(let data of results){
          if(data[0] == null && Object.keys(data[1]).length > 0){
            let model = new this(data[1]);
            models.push(model);
          }
        }
        resolve(models);
      }).catch(reject);
    });
  }

  static saveAll(models) {
    return Promise.map(models, (m)=>{ return m.save();});
  }

  //instance methods

  constructor(attributes={}) {
    super();
    this._attributes = attributes;
  }

  _generateId() {
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
      let beforeCreate = this.constructor._beforeCreate || ()=>{};
      let afterCreate = this.constructor._afterCreate || ()=>{};
      this._generateId().then((id) => {
        this._attributes.id = id;
        Promise.resolve(beforeCreate(this)).then(() => {
          this.redis.hmset(this.redisKey + ':_attributes', this.attributes).then(()=>{
            Promise.resolve(afterCreate(this)).then(resolve(this));
          });
        });
      }).catch(reject);
    });
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
      let beforeUpdate = this.constructor._beforeUpdate || ()=>{};
      let afterUpdate = this.constructor._afterUpdate || ()=>{};
      Promise.resolve(beforeUpdate(this)).then(() => {
        this.redis.hmset(this.redisKey + ':_attributes', this.attributes).then(()=>{
          Promise.resolve(afterUpdate(this)).then(resolve(this));
        });
      }).catch(reject);
    });
  }

  destroy() {
    return new Promise((resolve, reject) => {
      this.redis.del(this.redisKey + ':_attributes').then(resolve(this)).catch(reject);
    })
  }

}

Model.includeMixin(State);

export default Model;
