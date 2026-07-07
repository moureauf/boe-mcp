import { BANK_RATE_SERIES, getSeries } from "../data.js";
import { toRateEntries, type RateEntry } from "./rate-history.js";

export interface RateAt {
  date: string; // the queried ISO 8601 date
  rate: number;
  effectiveDate: string; // when that rate level took effect
  source: string;
  cachedAt: string;
  stale?: boolean;
}

// The rate in force on `date`: the latest change on or before it, or null if
// the date precedes the series. `entries` must be sorted by date ascending.
export function rateAt(
  entries: RateEntry[],
  date: string,
): { rate: number; effectiveDate: string } | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].date <= date) {
      return { rate: entries[i].rate, effectiveDate: entries[i].date };
    }
  }
  return null;
}

export async function getRateAt(date: string, now = new Date()): Promise<RateAt> {
  if (date > now.toISOString().slice(0, 10)) {
    throw new Error(`${date} is in the future — the base rate for it is not known yet`);
  }
  const { points, source, cachedAt, stale } = await getSeries(BANK_RATE_SERIES);
  const entries = toRateEntries(points);
  const found = rateAt(entries, date);
  if (found === null) {
    throw new Error(
      `No base rate data for ${date} — the series starts on ${entries[0]?.date ?? "an unknown date"}`,
    );
  }
  return { date, ...found, source, cachedAt, ...(stale ? { stale: true } : {}) };
}
