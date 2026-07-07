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

// First listed date on or after `now` (UTC calendar days), or null if the
// page only lists past dates.
export function nextMeeting(dates: string[], now: Date): NextMeeting | null {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (const date of dates) {
    const meetingUtc = Date.parse(`${date}T00:00:00Z`);
    if (meetingUtc >= todayUtc) {
      return { date, daysUntil: Math.round((meetingUtc - todayUtc) / DAY_MS) };
    }
  }
  return null;
}

export async function getNextMpcMeeting(now = new Date()): Promise<NextMeetingResult> {
  const { dates, source, cachedAt, stale } = await getMpcDates();
  const meeting = nextMeeting(dates, now);
  if (meeting === null) {
    throw new Error(
      "The BoE upcoming-MPC-dates page lists no future meetings — the schedule may not have been published yet",
    );
  }
  return { ...meeting, source, cachedAt, ...(stale ? { stale: true } : {}) };
}
