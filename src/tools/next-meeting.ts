import { getMpcDates } from "../data.js";

export interface NextMeeting {
  date: string; // ISO 8601
  daysUntil: number;
}

export interface NextMeetingResult extends NextMeeting {
  source: string;
  cachedAt: string;
  stale?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar days from `now` (UTC calendar date) until `date` (ISO 8601, treated
// as UTC midnight). 0 on the day itself; negative for dates already past.
export function daysUntil(date: string, now: Date): number {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const targetUtc = Date.parse(`${date}T00:00:00Z`);
  return Math.round((targetUtc - todayUtc) / DAY_MS);
}

// Every listed date on or after `now` (UTC calendar days), each paired with
// its daysUntil. `dates` is assumed sorted ascending (parseMpcDates
// guarantees this). Shared by get_next_mpc_meeting (takes the first entry)
// and get_mpc_dates (returns the whole list) so the "on or after today" rule
// — and the exclusion of past dates that still linger on the BoE page —
// lives in exactly one place.
export function upcomingMeetings(dates: string[], now: Date): NextMeeting[] {
  return dates
    .map((date) => ({ date, daysUntil: daysUntil(date, now) }))
    .filter((meeting) => meeting.daysUntil >= 0);
}

// First listed date on or after `now` (UTC calendar days), or null if the
// page only lists past dates.
export function nextMeeting(dates: string[], now: Date): NextMeeting | null {
  return upcomingMeetings(dates, now)[0] ?? null;
}

export async function getNextMpcMeeting(now = new Date()): Promise<NextMeetingResult> {
  const { dates, source, cachedAt, stale } = await getMpcDates();
  const meeting = nextMeeting(dates, now);
  if (meeting === null) {
    throw new Error(
      stale
        ? "The BoE is currently unreachable and the cached MPC schedule only contains past dates — try again later"
        : "The BoE upcoming-MPC-dates page lists no future meetings — the schedule may not have been published yet",
    );
  }
  return { ...meeting, source, cachedAt, ...(stale ? { stale: true } : {}) };
}
