import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Returns null if env vars are not configured (e.g. local dev)
function createRatelimit() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "meeting-intelligence",
  });
}

export const ratelimit = createRatelimit();
