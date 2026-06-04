import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({
  url: redisUrl,
  disableOfflineQueue: true
});

redisClient.on("error", (err) => console.error("🔴 Redis Client Error:", err));
redisClient.on("connect", () => console.log("🟢 Redis client connecting..."));
redisClient.on("ready", () => console.log("🟢 Redis connected successfully and ready"));

export default redisClient;
export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
