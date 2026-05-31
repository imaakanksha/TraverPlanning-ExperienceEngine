/**
 * Local Caching Layer with TTL (Time-To-Live) support.
 * Utilizes LocalStorage with an in-memory fallback cache.
 */

interface CachePayload<T> {
  value: T;
  expiresAt: number; // unix timestamp in milliseconds
}

class CacheService {
  private memoryCache: Record<string, CachePayload<any>> = {};

  /**
   * Retrieves a value from the cache. Returns null if missing or expired.
   */
  get<T>(key: string): T | null {
    const now = Date.now();

    // 1. Check in-memory cache first
    const memItem = this.memoryCache[key];
    if (memItem) {
      if (memItem.expiresAt > now) {
        return memItem.value as T;
      }
      // Expired: delete from memory
      delete this.memoryCache[key];
    }

    // 2. Check localStorage
    try {
      const storeItem = localStorage.getItem(`traverse_cache_${key}`);
      if (storeItem) {
        const payload = JSON.parse(storeItem) as CachePayload<T>;
        if (payload.expiresAt > now) {
          // Sync to memory cache for fast reads
          this.memoryCache[key] = payload;
          return payload.value;
        }
        // Expired: delete from store
        localStorage.removeItem(`traverse_cache_${key}`);
      }
    } catch (e) {
      // LocalStorage access might be blocked in private browsing
    }

    return null;
  }

  /**
   * Sets a value in the cache with a specified TTL in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const payload: CachePayload<T> = { value, expiresAt };

    // 1. Write to memory cache
    this.memoryCache[key] = payload;

    // 2. Write to localStorage
    try {
      localStorage.setItem(`traverse_cache_${key}`, JSON.stringify(payload));
    } catch (e) {
      // LocalStorage access might be blocked or full
    }
  }

  /**
   * Clears a specific key from the cache.
   */
  clear(key: string): void {
    delete this.memoryCache[key];
    try {
      localStorage.removeItem(`traverse_cache_${key}`);
    } catch (e) {}
  }

  /**
   * Clears all items managed by this cache service.
   */
  clearAll(): void {
    this.memoryCache = {};
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('traverse_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }
}

export const cacheService = new CacheService();
export default cacheService;
