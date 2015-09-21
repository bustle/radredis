import Promise from 'bluebird';

class Iterator {

  constructor(model) {
    this._model = model;
  }

  page(opts={offset: 0, size: 25}) {
    return new Promise((resolve, reject) => {
      let key = this._model.redisKey + ':_ids';
      this._model.redis.zrange(key, opts.offset, opts.size).then((ids) => {
        resolve(ids);
      }).catch(reject);
    });
  }

}

export default Iterator;
