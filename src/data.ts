// Shared cached access to BoE data, used by the tool handlers.
// Cache semantics: hit -> return; miss/expired -> fetch; fetch failure with
// stale cache -> stale data flagged stale:true; failure with no cache -> throw.

import { fetchMpcDates, fetchSeriesPoints, type SeriesPoint } from "./boe-client.js";
import { TTLCache } from "./cache.js";

export const BANK_RATE_SERIES = "IUDBEDR";

interface CachedSeries {
  points: SeriesPoint[];
  source: string;
  cachedAt: string;
}

interface CachedMpcDates {
  dates: string[];
  source: string;
  cachedAt: string;
}

const seriesCache = new TTLCache<string, CachedSeries>();
const mpcCache = new TTLCache<string, CachedMpcDates>();

export function getSeries(seriesCode: string): Promise<CachedSeries & { stale?: true }> {
  return seriesCache.getOrFetch(`series:${seriesCode}`, async () => {
    const { points, source } = await fetchSeriesPoints(seriesCode);
    return { points, source, cachedAt: new Date().toISOString() };
  });
}

export function getMpcDates(): Promise<CachedMpcDates & { stale?: true }> {
  return mpcCache.getOrFetch("mpc-dates", async () => {
    const { dates, source } = await fetchMpcDates();
    return { dates, source, cachedAt: new Date().toISOString() };
  });
}
