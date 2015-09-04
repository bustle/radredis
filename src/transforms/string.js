import BaseTransform from './base';

function isNone(obj) {
  return obj === null || obj === undefined;
}

class StringTransform extends BaseTransform {
  deserialize(serialized) {
    return isNone(serialized) ? null : String(serialized);
  }
  serialize(deserialized) {
    return isNone(deserialized) ? null : String(deserialized);
  }
}

export default StringTransform;
