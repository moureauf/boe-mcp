import { BANK_RATE_SERIES, getSeries } from "../data.js";
import { assertIsoDate } from "./get-series.js";
import { rateAt } from "./rate-at.js";
import { type RateEntry, toRateEntries } from "./rate-history.js";

export interface RateExtreme {
  rate: number;
  date: string; // first date this level was in force within the window
}

export interface RateStats {
  from: string; // effective window start used (clamped to the first data point)
  to: string; // effective window end used (today when `to` was omitted)
  min: RateExtreme;
  max: RateExtreme;
  average: number; // time-weighted, rounded to 4 decimal places
  startRate: number; // rate in force on `from`
  endRate: number; // rate in force on `to`
  changeBps: number; // endRate - startRate in integer basis points
  source: string;
  cachedAt: string;
  stale?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Days since the Unix epoch for an ISO date, so day arithmetic is integer math.
function dayNumber(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
}

function validateWindow(from: string | undefined, to: string | undefined, today: string): void {
  if (from !== undefined) assertIsoDate("from", from);
  if (to !== undefined) assertIsoDate("to", to);
  if (from !== undefined && to !== undefined && from > to) {
    throw new Error(`Invalid date range — from (${from}) is after to (${to})`);
  }
  for (const [label, value] of [
    ["from", from],
    ["to", to],
  ] as const) {
    if (value !== undefined && value > today) {
      throw new Error(`${label} (${value}) is in the future — the base rate for it is not known yet`);
    }
  }
}

// The IADB Bank Rate series is sparse: effectively one point per rate *change*
// (toRateEntries collapses any duplicate observations — see rate-history.ts),
// so each entry is a level that stays in force from its date until the day
// before the next entry. Statistics must respect that: a plain mean of the
// change points would over-weight periods with frequent changes, so `average`
// is time-weighted — each level weighted by the number of calendar days it was
// in force within the [from, to] window (both ends inclusive). The level in
// force on `from` counts as part of the window even when it took effect
// earlier (same resolution rule as get_rate_at); for that carried-in level,
// min/max report the window start as their date.
export function computeRateStats(
  entries: RateEntry[],
  from: string | undefined,
  to: string | undefined,
  now: Date,
): Omit<RateStats, "source" | "cachedAt" | "stale"> {
  const today = now.toISOString().slice(0, 10);
  validateWindow(from, to, today);
  const firstDate = entries[0]?.date;
  if (firstDate === undefined) {
    throw new Error("BoE bank rate series returned no entries");
  }
  const end = to ?? today;
  if (end < firstDate) {
    throw new Error(`No base rate data in the requested window — the series starts on ${firstDate}`);
  }
  // Only clamp when the window starts before the series itself does; a `from`
  // between two changes is fine because the earlier level is still in force.
  const start = from === undefined || from < firstDate ? firstDate : from;

  // One segment per level in force during the window. rateAt cannot return
  // null here because start >= firstDate.
  const carriedIn = rateAt(entries, start);
  if (carriedIn === null) {
    throw new Error(`No base rate data for ${start} — the series starts on ${firstDate}`);
  }
  const segments = [
    { rate: carriedIn.rate, date: start },
    ...entries.filter((e) => e.date > start && e.date <= end),
  ];

  let min = segments[0];
  let max = segments[0];
  let weightedSum = 0;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    // in force through the day before the next change, or through `end`
    const endDay = i + 1 < segments.length ? dayNumber(segments[i + 1].date) : dayNumber(end) + 1;
    weightedSum += segment.rate * (endDay - dayNumber(segment.date));
    if (segment.rate < min.rate) min = segment; // strict: first occurrence wins
    if (segment.rate > max.rate) max = segment;
  }
  const totalDays = dayNumber(end) - dayNumber(start) + 1;
  const startRate = segments[0].rate;
  const endRate = segments[segments.length - 1].rate;

  return {
    from: start,
    to: end,
    min: { rate: min.rate, date: min.date },
    max: { rate: max.rate, date: max.date },
    average: Math.round((weightedSum / totalDays) * 10_000) / 10_000,
    startRate,
    endRate,
    changeBps: Math.round((endRate - startRate) * 100),
  };
}

export async function getRateStats(
  from?: string,
  to?: string,
  now = new Date(),
): Promise<RateStats> {
  // Fail fast on bad input before touching the network; computeRateStats
  // re-validates, which is harmless.
  validateWindow(from, to, now.toISOString().slice(0, 10));
  const { points, source, cachedAt, stale } = await getSeries(BANK_RATE_SERIES);
  const stats = computeRateStats(toRateEntries(points), from, to, now);
  return { ...stats, source, cachedAt, ...(stale ? { stale: true } : {}) };
}
