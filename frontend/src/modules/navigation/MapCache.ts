interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MapCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs = 300000; // 5 minutes

  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}
export default MapCache;
