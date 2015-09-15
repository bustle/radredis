export default {
  define(object, params) {
    Object.defineProperty(object, params.key, {
      configurable: false,

      get() {
        let defaultValue = params.defaultValue || null;
        let value = this.attributes[params.key];
        if(value !== undefined) {
          return value;
        }
        return defaultValue;
      },

      set(value) {
        this.isDirty = true;
        this.attributes[params.key] = value;
      }
    });
  }
}
