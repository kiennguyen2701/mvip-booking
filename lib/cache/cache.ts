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

/**
 * Cache-aside helper: trả về cached value nếu có,
 * ngược lại gọi fetcher(), cache kết quả rồi trả về.
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();
  await setCache(key, value, ttlSeconds);
  return value;
}

export async function deleteCache(key: string) {
  if (!redis || !key) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error("REDIS_DELETE_ERROR:", error);
  }
}

/**
 * Xóa cache theo pattern dùng SCAN thay vì KEYS.
 * KEYS là blocking O(N) - nguy hiểm trên production Redis.
 * SCAN là non-blocking, xử lý từng batch 100 keys.
 */
export async function deleteCacheByPattern(pattern: string) {
  if (!redis || !pattern) return;

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await (redis as any).scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...(keys as string[]));
      }
    } while (cursor !== 0);
  } catch (error) {
    console.error("REDIS_DELETE_PATTERN_ERROR:", error);
  }
}