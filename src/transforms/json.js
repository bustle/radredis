import BaseTransform from './base';

class JSONTransform extends BaseTransform {
  serialize(data){
    return JSON.stringify(data);
  }
  deserialize(data){
    return JSON.parse(data);
  }
}

export default JSONTransform;
