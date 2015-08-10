import assert from 'assert';
import Redis from '../src/redis';

describe('Redis', () => {
  describe(".namespace()", () => {
    it("ends in a colon", () => {
      assert(Redis.namespace.endsWith(":"));
      Redis.namespace = "radredistest";
      assert(Redis.namespace.endsWith(":"));
    });
  });
});
