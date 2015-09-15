class CoreObject {
  static includeMixin(mixin){
    let props = Object.keys(mixin);
    for (let prop of props) {
      if (prop === 'accessors') {
        let accessors = Object.keys(mixin[prop]);
        for (let accessor of accessors) {
          Object.defineProperty(this.prototype, accessor, {
            get: mixin[prop][accessor]['get'],
            set: mixin[prop][accessor]['set']
          });
        }
      } else {
        Object.defineProperty(this.prototype, prop, { value: mixin[prop] });
      }
    }
  }
  static extendMixin(mixin){
    let props = Object.keys(mixin);
    for (let prop of props) {
      if (prop === 'accessors') {
        let accessors = Object.keys(mixin[prop]);
        for (let accessor of accessors) {
          Object.defineProperty(this, accessor, {
            get: mixin[prop][accessor]['get'],
            set: mixin[prop][accessor]['set']
          });
        }
      } else {
        Object.defineProperty(this, prop, { value: mixin[prop] });
      }
    }
  }
}

export default CoreObject;
