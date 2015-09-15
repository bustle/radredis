import assert        from 'assert';
import Model         from '../src/model';
import Transformer   from '../src/transformer';
import BaseTransform from '../src/transforms/base';

class WackyTransform extends BaseTransform {
  serialize(deserialized){
    return '~~~' + deserialized + '~~~';
  }
  deserialize(serialized){
    return /~{3}(.+)~{3}/.exec(serialized)[1];
  }
}

class User extends Model {}
User.schema = [
  { key: 'name',     type: 'string'  },
  { key: 'userName', type: 'wacky'   },
  { key: 'birthday', type: 'date'    },
  { key: 'age',      type: 'number'  },
  { key: 'isAdmin',  type: 'boolean' },
  { key: 'data',     type: 'json'    }
];

describe('Transformer', () => {
  let user, userInfo, rawUserInfo;
  beforeEach(() => {
    Transformer.register('wacky', WackyTransform);
    userInfo = {
      name: 'tristan',
      userName: 'tristan',
      birthday: new Date(),
      age: 24,
      isAdmin: true,
      data: {arr: [1,2,3]}
    };
    rawUserInfo = Object.assign({}, userInfo);
    rawUserInfo.birthday = new Date(rawUserInfo.birthday).getTime();
    rawUserInfo.userName = '~~~tristan~~~';
    rawUserInfo.data = JSON.stringify(rawUserInfo.data);
    user = new User(userInfo);
  });

  describe('#register()', () => {
    it('adds a new transformer to the registry', () => {
      assert.equal(Transformer.registry.wacky instanceof WackyTransform, true);
    });
  });

  describe('#serialize()', ()=>{
    it('can transform instances with registered transforms', ()=>{
      let data = Transformer.serialize(user);
      assert.deepEqual(data, rawUserInfo);
    });
  });

  describe('#deserialize()', ()=>{
    it('can deserialize raw data', ()=>{
      let data = Transformer.deserialize(rawUserInfo, User);
      assert.deepEqual(data, userInfo);
    });
  });

});
