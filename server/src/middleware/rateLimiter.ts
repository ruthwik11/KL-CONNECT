import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../config/redis";

// Define a proxy store that lazily initializes RedisStore when redisClient is ready,
// and falls back to default MemoryStore if Redis is offline.
class AdaptiveStore {
  private redisStore: RedisStore | null = null;
  private memoryStore: any;

  constructor() {
    this.memoryStore = new Map();
  }

  private getStore() {
    if (redisClient.isOpen && redisClient.isReady) {
      if (!this.redisStore) {
        try {
          console.log("🟢 Initializing RedisStore for rate limiting...");
          this.redisStore = new RedisStore({
            // @ts-ignore
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
          });
        } catch (err) {
          console.error("⚠️ Failed to initialize RedisStore, using memory fallback:", err);
          return null;
        }
      }
      return this.redisStore;
    }
    return null;
  }

  // Implement the Store interface methods required by express-rate-limit
  async increment(key: string) {
    const store = this.getStore();
    if (store) {
      return store.increment(key);
    }
    
    // In-memory fallback logic:
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // Match globalLimiter windowMs
    let record = this.memoryStore.get(key);
    
    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }
    
    record.count++;
    this.memoryStore.set(key, record);
    
    return {
      totalHits: record.count,
      resetTime: new Date(record.resetTime),
    };
  }

  async decrement(key: string) {
    const store = this.getStore();
    if (store) {
      return store.decrement(key);
    }
    
    const record = this.memoryStore.get(key);
    if (record && record.count > 0) {
      record.count--;
      this.memoryStore.set(key, record);
    }
  }

  async resetKey(key: string) {
    const store = this.getStore();
    if (store) {
      return store.resetKey(key);
    }
    this.memoryStore.delete(key);
  }
}

export const globalLimiter = rateLimit({
  store: new AdaptiveStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
});
