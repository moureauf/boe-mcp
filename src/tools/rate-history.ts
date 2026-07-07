import type { SeriesPoint } from "../boe-client.js";
import { BANK_RATE_SERIES, getSeries } from "../data.js";

export interface RateEntry {
  date: string; // ISO 8601
  rate: number;
  changeBps: number | null; // basis points vs previous change; null for the first entry
}

export interface RateHistory {
  entries: RateEntry[];
  source: string;
  cachedAt: string;
  stale?: boolean;
}

// Turn raw series points into rate *changes*: consecutive duplicate values are
// collapsed, and each entry carries its move in basis points vs the previous
// level (null when there is no previous level in the series).
export function toRateEntries(points: SeriesPoint[]): RateEntry[] {
  const entries: RateEntry[] = [];
  let previous: number | null = null;
  for (const { date, value } of points) {
    if (previous !== null && value === previous) continue;
    entries.push({
      date,
      rate: value,
      changeBps: previous === null ? null : Math.round((value - previous) * 100),
    });
    previous = value;
  }
  return entries;
}

export const DEFAULT_HISTORY_LIMIT = 10;

export async function getRateHistory(limit = DEFAULT_HISTORY_LIMIT): Promise<RateHistory> {
  const { points, source, cachedAt, stale } = await getSeries(BANK_RATE_SERIES);
  const entries = toRateEntries(points).slice(-limit);
  return { entries, source, cachedAt, ...(stale ? { stale: true } : {}) };
}
