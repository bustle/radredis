import Redis from './redis';

class Model {

  static get schema() {
    return this._schema;
  }

  static set schema(schema) {
    for(let attribute of schema) {
      Object.defineProperty(this.prototype, attribute.name, {
        configurable: false,
        get() { 
          return this._attributes[attribute.name] || attribute.default || null;
        },
        set(value) { 
          return this._attributes[attribute.name] = value; 
        }
      });
    }   
    return this._schema = schema;
  }

  constructor(attributes={}) {
    this._attributes = attributes;
    for(let key of Object.keys(attributes)) {
      this[key] = attributes[key];
    }
  }

  save() {
    console.log(this.constructor.name);
  }

  redis() {
    return Redis.connection;
  }

}

export default Model;
