// BOE_CACHE_TTL_MINUTES=0 is a valid setting (disable caching), so don't use
// `||`; only fall back to 60 when the value is unset or not a number.
function defaultTtlMs(): number {
  const minutes = Number(process.env.BOE_CACHE_TTL_MINUTES);
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : 60) * 60 * 1000;
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

export class TTLCache<K, V extends object> {
  private store = new Map<K, CacheEntry<V>>();
  private ttlMs: number;

  constructor(ttlMs = defaultTtlMs()) {
    this.ttlMs = ttlMs;
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.fetchedAt > this.ttlMs;
  }

  set(key: K, data: V): void {
    this.store.set(key, { data, fetchedAt: Date.now() });
  }

  async getOrFetch(
    key: K,
    fetcher: () => Promise<V>
  ): Promise<V & { stale?: true }> {
    const entry = this.store.get(key);

    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }

    try {
      const fresh = await fetcher();
      this.set(key, fresh);
      return fresh;
    } catch (err) {
      if (entry) {
        return { ...entry.data, stale: true as const };
      }
      throw err;
    }
  }
}
