import type { SeriesPoint } from "../boe-client.js";
import { getSeries } from "../data.js";
import { lookupSeries } from "../series-catalog.js";

export interface SeriesResult {
  seriesCode: string;
  name?: string; // from the catalog when the code is known
  unit?: string; // from the catalog when the code is known
  frequency?: string; // from the catalog when the code is known
  points: { date: string; value: number }[]; // most recent N after date filtering
  source: string;
  cachedAt: string;
  stale?: boolean;
}

export const DEFAULT_SERIES_LIMIT = 50;
export const MAX_SERIES_LIMIT = 500;

const SERIES_CODE_PATTERN = /^[A-Z0-9]{4,12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Validate and canonicalise a user-supplied series code. IADB codes are
// alphanumeric (e.g. IUDBEDR, XUDLUSS, IUMBV34); we uppercase so the cache key
// and catalog lookup are consistent regardless of how the caller typed it.
export function normaliseSeriesCode(code: string): string {
  if (!SERIES_CODE_PATTERN.test(code)) {
    throw new Error(
      `Invalid series code "${code}" — expected 4–12 letters or digits (e.g. IUDBEDR). Use list_series for known codes.`,
    );
  }
  return code.toUpperCase();
}

export function assertIsoDate(label: string, value: string): void {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`Invalid ${label} date "${value}" — must be an ISO 8601 date (YYYY-MM-DD)`);
  }
}

// Filter points to the [from, to] inclusive window (either bound optional) and
// return the most recent `limit` of them. Points are already sorted ascending,
// so slicing the tail gives the latest observations; ISO dates compare
// lexicographically so plain string comparison is correct.
export function filterPoints(
  points: SeriesPoint[],
  from?: string,
  to?: string,
  limit: number = DEFAULT_SERIES_LIMIT,
): SeriesPoint[] {
  let filtered = points;
  if (from) filtered = filtered.filter((p) => p.date >= from);
  if (to) filtered = filtered.filter((p) => p.date <= to);
  return filtered.slice(-limit);
}

export async function getSeriesData(
  seriesCode: string,
  from?: string,
  to?: string,
  limit: number = DEFAULT_SERIES_LIMIT,
): Promise<SeriesResult> {
  const code = normaliseSeriesCode(seriesCode);
  if (from !== undefined) assertIsoDate("from", from);
  if (to !== undefined) assertIsoDate("to", to);
  if (from !== undefined && to !== undefined && from > to) {
    throw new Error(`Invalid date range — from (${from}) is after to (${to})`);
  }

  let cached: Awaited<ReturnType<typeof getSeries>>;
  try {
    // Fetch (and cache) the full history for this code once, then filter in
    // memory — see the note on iadbCsvUrl for why we don't range-fetch.
    cached = await getSeries(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // An unknown/empty code makes the IADB return a page with no data rows.
    // Turn the generic parser error into a code-specific, actionable message.
    if (/no data rows/i.test(message)) {
      throw new Error(`Unknown or empty IADB series "${code}" — use list_series for known codes`);
    }
    throw err;
  }

  const { points, source, cachedAt, stale } = cached;
  const meta = lookupSeries(code);
  return {
    seriesCode: code,
    ...(meta ? { name: meta.name, unit: meta.unit, frequency: meta.frequency } : {}),
    points: filterPoints(points, from, to, limit),
    source,
    cachedAt,
    ...(stale ? { stale: true } : {}),
  };
}
