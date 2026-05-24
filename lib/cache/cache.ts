import { redis } from "@/lib/cache/redis";

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis || !key) return null;

  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error("REDIS_GET_ERROR:", error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
) {
  if (!redis || !key || ttlSeconds <= 0) return;

  try {
    await redis.set(key, value, {
      ex: ttlSeconds,
    });
  } catch (error) {
    console.error("REDIS_SET_ERROR:", error);
  }
}

export async function deleteCache(key: string) {
  if (!redis || !key) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error("REDIS_DELETE_ERROR:", error);
  }
}

export async function deleteCacheByPattern(pattern: string) {
  if (!redis || !pattern) return;

  try {
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("REDIS_DELETE_PATTERN_ERROR:", error);
  }
}