import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TTLCache } from "../src/cache.js";

describe("TTLCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cached data within the TTL without refetching", async () => {
    const cache = new TTLCache<string, { v: number }>(60_000);
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    await cache.getOrFetch("k", fetcher);
    vi.advanceTimersByTime(59_000);
    const hit = await cache.getOrFetch("k", fetcher);
    expect(hit).toEqual({ v: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches after the TTL expires", async () => {
    const cache = new TTLCache<string, { v: number }>(60_000);
    const fetcher = vi.fn().mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({ v: 2 });
    await cache.getOrFetch("k", fetcher);
    vi.advanceTimersByTime(60_001);
    const fresh = await cache.getOrFetch("k", fetcher);
    expect(fresh).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("falls back to stale data with stale:true when a refetch fails", async () => {
    const cache = new TTLCache<string, { v: number }>(60_000);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockRejectedValueOnce(new Error("boom"));
    await cache.getOrFetch("k", fetcher);
    vi.advanceTimersByTime(60_001);
    const stale = await cache.getOrFetch("k", fetcher);
    expect(stale).toEqual({ v: 1, stale: true });
  });

  it("does not mark fresh cache hits as stale", async () => {
    const cache = new TTLCache<string, { v: number }>(60_000);
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    const hit = await cache.getOrFetch("k", fetcher);
    expect("stale" in hit).toBe(false);
  });

  it("treats a TTL of 0 as always-expired (caching disabled)", async () => {
    const cache = new TTLCache<string, { v: number }>(0);
    const fetcher = vi.fn().mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({ v: 2 });
    await cache.getOrFetch("k", fetcher);
    vi.advanceTimersByTime(1);
    expect(await cache.getOrFetch("k", fetcher)).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("propagates the fetch error when there is no cached data", async () => {
    const cache = new TTLCache<string, { v: number }>(60_000);
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(cache.getOrFetch("k", fetcher)).rejects.toThrow("network down");
  });
});
