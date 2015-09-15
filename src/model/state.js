import EventEmmiter from 'events';
var noop = function(){};

export default {
  accessors: {
    isNew: {
      get: function() {
        return this._isNew || true;
      },
      set: function(bool) {
        this._isNew = bool;
      }
    },
    isLoaded: {
      get: function(){
        return this._isLoaded || false;
      },
      set: function(bool) {
        this._isLoaded = bool;
      }
    },
    isDirty: {
      get: function() {
        return this._isDirty || false;
      },
      set: function(bool) {
        this._isDirty = bool;
      }
    },
    isSaving: {
      get: function() {
          return this._isSaving || false;
      },
      set: function(bool) {
        this._isSaving = bool;
      }
    },
    isError: {
      get: function() {
        return this._isError || false;
      },
      set: function(bool) {
        this._isError = bool;
      }
    },
    errors: {
      get: function() {
        return this._errors;
      },
      set: function(errors) {
        this._errors = errors;
      }
    }
  },

  didCreate: noop,
  didUpdate: noop,
  didLoad: noop,
  didDelete: noop,
  becameError: noop,

  onSaved() {
    this.isDirty = false;
    this.isSaving = false;
    this.isLoaded = true;
    this.isError = false;
    this._triggerEvent(wasNew ? 'didCreate' : 'didUpdate', this);
    this._triggerEvent('didLoad', this);
  },

  onDeleted() {
    this._triggerEvent('didDelete', this);
    Ember.run.next(this, function() {
      this.destroy();
    });
  },

  onLoaded() {
    this.isDirty = false;
    this.isSaving = false;
    this.isLoaded = true;
    this.isError = false;
    this._triggerEvent('didLoad', this);
  },

  clearErrors() {
    this.setProperties({ isError: false, errors: null });
    return this;
  },

  copyState(clone) {
    var mixins = State.mixins;
    var props = mixins[mixins.length-1].properties, p;

    Ember.beginPropertyChanges(clone);
    for(p in props) {
      if(props.hasOwnProperty(p) && typeof props[p] !== 'function') {
        clone.set(p, this.get(p));
      }
    }
    Ember.endPropertyChanges(clone);
    return clone;
  },

  _isReady: false,

  _triggerEvent(event, data) {
    Ember.run(this, function() {
      Ember.tryInvoke(this, event, [data]);
      this.trigger(event, data);
    });
  }
};
