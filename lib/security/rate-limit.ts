import { redis } from "@/lib/cache/redis";

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

// Fallback in-memory khi Redis không có (dev local không setup Upstash)
type Bucket = { count: number; resetAt: number };
const localBuckets = new Map<string, Bucket>();

function localRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = localBuckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    localBuckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (current.count >= limit) {
    return { success: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  localBuckets.set(key, current);
  return { success: true, remaining: limit - current.count, resetAt: current.resetAt };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return realIp || "unknown";
}

/**
 * Redis-backed rate limiter — shared across tất cả server instances.
 * Dùng INCR + EXPIRE pattern: atomic, không race condition.
 * Tự fallback về in-memory nếu Redis unavailable.
 */
export async function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  // Fallback nếu Redis chưa được config (local dev)
  if (!redis) {
    return localRateLimit(key, limit, windowMs);
  }

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const redisKey = `rl:${key}`;

    // INCR trả về giá trị sau khi tăng — atomic, an toàn với nhiều instances
    const count = await redis.incr(redisKey);

    // Chỉ set TTL lần đầu (khi count = 1) để không reset window
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }

    // Lấy TTL còn lại để tính resetAt chính xác
    const ttl = await redis.ttl(redisKey);
    const resetAt = Date.now() + Math.max(0, ttl) * 1000;

    if (count > limit) {
      return { success: false, remaining: 0, resetAt };
    }

    return {
      success: true,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (error) {
    // Redis error → fallback về in-memory, không để hệ thống down
    console.error("RATE_LIMIT_REDIS_ERROR:", error);
    return localRateLimit(key, limit, windowMs);
  }
}