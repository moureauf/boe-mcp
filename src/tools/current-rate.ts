import { BANK_RATE_SERIES, getSeries } from "../data.js";
import { toRateEntries } from "./rate-history.js";

export interface CurrentRate {
  rate: number;
  effectiveDate: string; // ISO 8601 date the current level took effect
  monthsHeld: number; // whole months the rate has been at this level
  source: string;
  cachedAt: string;
  stale?: boolean;
}

// Whole calendar months elapsed between an ISO date and `now` (a month counts
// once its day-of-month is reached, clamped to the length of the current month
// so e.g. Jan 31 -> Feb 28 counts as one month). Never negative.
export function monthsBetween(fromIso: string, now: Date): number {
  const [y, m, d] = fromIso.split("-").map(Number);
  let months =
    (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
  const daysInCurrentMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  if (now.getUTCDate() < Math.min(d, daysInCurrentMonth)) months -= 1;
  return Math.max(0, months);
}

export async function getCurrentRate(now = new Date()): Promise<CurrentRate> {
  const { points, source, cachedAt, stale } = await getSeries(BANK_RATE_SERIES);
  const latest = toRateEntries(points).at(-1);
  if (!latest) {
    throw new Error("BoE bank rate series returned no entries");
  }
  return {
    rate: latest.rate,
    effectiveDate: latest.date,
    monthsHeld: monthsBetween(latest.date, now),
    source,
    cachedAt,
    ...(stale ? { stale: true } : {}),
  };
}
