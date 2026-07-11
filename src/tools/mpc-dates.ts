import { getMpcDates } from "../data.js";
import { type NextMeeting, upcomingMeetings } from "./next-meeting.js";

export interface UpcomingMpcDates {
  dates: NextMeeting[]; // ascending; the first entry is the next announcement
  source: string;
  cachedAt: string;
  stale?: boolean;
}

// All upcoming MPC announcement dates. The BoE page can still list dates that
// have already passed (it covers whole calendar years), so upcomingMeetings
// filters to dates on or after today — same rule as get_next_mpc_meeting.
export async function getUpcomingMpcDates(now = new Date()): Promise<UpcomingMpcDates> {
  const { dates, source, cachedAt, stale } = await getMpcDates();
  const upcoming = upcomingMeetings(dates, now);
  if (upcoming.length === 0) {
    throw new Error(
      stale
        ? "The BoE is currently unreachable and the cached MPC schedule only contains past dates — try again later"
        : "The BoE upcoming-MPC-dates page lists no future meetings — the schedule may not have been published yet",
    );
  }
  return { dates: upcoming, source, cachedAt, ...(stale ? { stale: true } : {}) };
}
