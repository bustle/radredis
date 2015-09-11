import BaseTransform from './base';

//taken from jquery
//https://github.com/jquery/jquery/blob/bf48c21d225c31f0f9b5441d95f73615ca3dcfdb/src/core.js#L206
function isNumeric(n) {
  return !Array.isArray(n) && (n - parseFloat(n) + 1) >= 0;
}

class NumberTransform extends BaseTransform {
  deserialize(serialized) {
    return isNumeric(serialized) ? Number(serialized) : null;
  }
  serialize(deserialized) {
    return isNumeric(deserialized) ? Number(deserialized) : null;
  }
}

export default NumberTransform;
