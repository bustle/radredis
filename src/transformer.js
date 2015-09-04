import DateTransform    from './transforms/date';
import StringTransform  from './transforms/string';
import NumberTransform  from './transforms/number';
import BooleanTransform from './transforms/boolean';

class Transformer {
  // Class Methods
  static get instance(){
    if (!this._instance) { this._instance = new this(); }
    return this._instance;
  }

  static get registry(){ return this.instance.registry; }

  static register(name, transform){
    return this.instance.register(name, transform);
  }

  static serialize(model){
    return this.instance.serialize(model);
  }

  static deserialize(rawData, constructor){
    return this.instance.deserialize(rawData, constructor);
  }
  // Instance Methods
  constructor(){
    this.register('date',    DateTransform);
    this.register('string',  StringTransform);
    this.register('number',  NumberTransform);
    this.register('boolean', BooleanTransform);
  }

  get registry(){
    if (!this._registry) { this._registry = {}; }
    return this._registry;
  }

  register(name, transform){
    this.registry[name] = new transform();
  }

  serialize(model){
    let data = {};
    model.constructor.schema.forEach((attr)=>{
      data[attr.key] = this.registry[attr.type].serialize(model[attr.key]);
    });
    return data;
  }

  deserialize(rawData, constructor){
    let data = Object.assign({}, rawData);
    constructor.schema.forEach((attr)=>{
      data[attr.key] = this.registry[attr.type].deserialize(data[attr.key]);
    });
    return data;
  }

}

export default Transformer;
