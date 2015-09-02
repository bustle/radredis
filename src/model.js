import Config from './config';
import Attribute from './model/attribute';

class Model {

  static get schema() {
    return this._schema;
  }

  static set schema(schema) {
    for(let definition of schema) {
      let attribute = Attribute.define(this.prototype, definition);
      Object.defineProperty(this.prototype, definition.key, attribute);
    }   
    this._schema = schema;
  }


  constructor(attributes={}) {
    let id = attributes.id || null;
    if(id) { delete attributes.id; }
    this._attributes = attributes;
  }


  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  get attributes() {
    return this._attributes;
  }


  /* State & Flags */
  get isDirty() {
    return this._isDirty || false;
  }

  set isDirty(val) {
    this._isDirty = val;
  }

  get isNew() {
    return this.id || true;
  }


  /* Lifecycle */
  save() {
    return Promise.reject('implement');
  }

  updateAttributes(attributes) {
    return Promise.reject('implement');
  }

  destroy() {
    return Promise.reject('implement');
  }


  /* Helpers, getters, setters */
  get redis() {
    return this._redis || Config.redis;
  }

  set redis(connection) {
    this._redis = connection;
  }

}

export default Model;
