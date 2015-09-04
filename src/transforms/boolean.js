import BaseTransform from './base';

class BooleanTransform extends BaseTransform {
  deserialize(serialized) {
    var type = typeof serialized;

    if (type === 'boolean') {
      return serialized;
    } else if (type === 'string') {
      return serialized.match(/^true$|^t$|^1$/i) !== null;
    } else if (type === 'number') {
      return serialized === 1;
    } else {
      return false;
    }
  }

  serialize(deserialized) {
    return Boolean(deserialized);
  }
}

export default BooleanTransform;
