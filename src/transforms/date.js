import BaseTransform from './base';

class DateTransform extends BaseTransform {
  deserialize(serialized) {
    var type = typeof serialized;
    console.log(serialized)
    if (type === 'string') {
      return new Date(Date.parse(serialized));
    } else if (type === 'number') {
      return new Date(serialized);
    } else if (serialized === null || serialized === undefined) {
      return serialized;
    } else {
      return null;
    }
  }

  serialize(date) {
    if (date instanceof Date) {
      return date.getTime();
    } else {
      return null;
    }
  }
}

export default DateTransform;
