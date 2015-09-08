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
    return new Promise((resolve, reject) => {
      let pipeline = this.redis.pipeline();
      for(let m of models) {
        pipeline.hmset(this.redisKey + ':' + m.id + ':_attributes', m.attributes);
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


  //instance methods

  constructor(attributes={}) {
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

export default Model;
