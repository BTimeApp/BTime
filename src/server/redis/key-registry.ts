/**
 * Basic dev infrastructure so we make sure we don't have keyspace collision.
 * When making a new room store, make sure to import the registry and declare keys to use through it.
 */
class RedisKeyRegistry {
  private keys: Set<string> = new Set();

  registerKey(key: string): void {
    if (this.keys.has(key)) {
      throw new Error(
        `Redis Key "${key}" is already registered. Please use a different key name. This is intended to catch issues during development.`
      );
    }
    this.keys.add(key);
  }

  registerKeys(keys: string[]): void {
    for (const key of keys) {
      this.registerKey(key);
    }
  }
}

export const REDIS_KEY_REGISTRY = new RedisKeyRegistry();
