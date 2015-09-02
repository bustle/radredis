export default {
  define(definition) {
    return {
      configurable: false,

      get() { 
        let defaultValue = definition.defaultValue || null;
        let value = this.attributes[definition.key];
        if(value !== undefined) {
          return value;
        }
        return defaultValue;
      },

      set(value) { 
        this.attributes[definition.key] = value; 
      }
    };
  }
}
