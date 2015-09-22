function noop(){return this;};

function isFunction(func) {
  return func && {}.toString.call(func) === '[object Function]';
}

function tryInvoke(obj, func, data){
  if ( isFunction(obj[func]) ) { return obj[func](...data); }
}

export default {
  accessors: {
    isNew: {
      get() { return this.id === undefined; }
    },
    isDirty: {
      get() { return this._isDirty; },
      set(bool) { this._isDirty = bool; }
    },
    isLoaded: {
      get() { return this._isLoaded; },
      set(bool) { this._isLoaded = bool; }
    }
  },

  // instance variable defaults
  _isDirty:  false,
  _isLoaded: false,

  // instance method hook defaults
  willCreate:  noop,
  willUpdate:  noop,
  willDestroy: noop,
  didCreate:   noop,
  didUpdate:   noop,
  didDestroy:  noop,
  didLoad:     noop,

  willBeSaved() {
    this._emitEvent(this.isNew ? 'willCreate' : 'willUpdate', this);
  },

  onSaved(wasNew) {
    this.onLoaded();
    this._emitEvent(wasNew ? 'didCreate' : 'didUpdate', this);
  },

  onLoaded(){
    this.isDirty = false;
    this.isLoaded = true;
    this._emitEvent('didLoad', this);
  },

  willBeDestroyed() {
    this._emitEvent('willDestroy', this);
  },

  onDestroyed() {
    this._emitEvent('didDestroy', this);
  },

  _emitEvent(event, data) {
    tryInvoke(this, event, [data]);
    this.emit(event, data);
  }
};
