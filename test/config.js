import assert from 'assert';
import Config from '../src/config';

describe('Config', () => {
  describe(".redisKeyPrefix()", () => {
    it("ends in a colon", () => {
      assert(Config.redisKeyPrefix.endsWith(":"));
      Config.redisNamespace = "radredistest";
      assert(Config.redisKeyPrefix.endsWith(":"));
    });
  });
});
