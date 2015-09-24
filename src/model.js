import Promise      from 'bluebird';
import EventEmitter from 'events';
import Config       from './config';
import Attribute    from './model/attribute';
import Iterator     from './model/iterator';

function noop(){return Promise.resolve(this);};

function isFunction(func) {
  return func && {}.toString.call(func) === '[object Function]';
}

function tryInvoke(obj, func, data){
  if ( isFunction(obj[func]) ) { return obj[func](...data); }
}

class Model extends EventEmitter {
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

  static all() {
    let iterator = new Iterator(this);
    return iterator;
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
    // instance variable defaults
    this._isDirty    = false;
    this._isLoaded   = false;
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
      Promise.resolve(this.willBeSaved()).then(()=>{
        this._generateId().then((id) => {
          this._attributes.id = id;
          this.redis.hmset(this.redisKey + ':_attributes', this.attributes).then(()=>{
            this.redis.zadd(this.constructor.redisKey + ':_ids', id, id).then(() => {
              Promise.resolve(this.onSaved(true)).then(resolve(this));
            });
          });
        }).catch(reject);
      });
    });
  }

  load() {
    return new Promise((resolve, reject) => {
      this.redis.hgetall(this.redisKey + ':_attributes').then((data) => {
        this._attributes = data;
        Promise.resolve(this.onLoaded()).then(resolve(this));
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
      Promise.resolve(this.willBeSaved()).then(()=>{
        this.redis.hmset(this.redisKey + ':_attributes', this.attributes).then(()=>{
          Promise.resolve(this.onSaved(false)).then(resolve(this));
        }).catch(reject);
      });
    });
  }

  destroy() {
    return new Promise((resolve, reject) => {
      Promise.resolve(this.willDestroy()).then(()=>{
        this.redis.del(this.redisKey + ':_attributes').then(()=>{
          this.redis.zrem(this.constructor.redisKey + ':_ids', this.id).then(() => {
            Promise.resolve(this.onDestroyed()).then(resolve(this));
          });
        });
      });
    });
  }

  //STATE
  get isNew() { return this.id === undefined; }
  get isDirty() { return this._isDirty; }
  set isDirty(bool) { this._isDirty = bool; }
  get isLoaded() { return this._isLoaded; }
  set isLoaded(bool) { this._isLoaded = bool; }

  // instance method hook defaults
  willCreate:  noop
  willUpdate:  noop
  willDestroy: noop
  didCreate:   noop
  didUpdate:   noop
  didDestroy:  noop
  didLoad:     noop

  willBeSaved() {
    this._emitEvent(this.isNew ? 'willCreate' : 'willUpdate', this);
  }

  onSaved(wasNew) {
    this.onLoaded();
    this._emitEvent(wasNew ? 'didCreate' : 'didUpdate', this);
  }

  onLoaded(){
    this.isDirty = false;
    this.isLoaded = true;
    this._emitEvent('didLoad', this);
  }

  willBeDestroyed() {
    this._emitEvent('willDestroy', this);
  }

  onDestroyed() {
    this._emitEvent('didDestroy', this);
  }

  _emitEvent(event, data) {
    tryInvoke(this, event, [data]);
    this.emit(event, data);
  }

}

export default Model;
