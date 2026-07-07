import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMpcDates } from "../src/boe-client.js";
import { nextMeeting } from "../src/tools/next-meeting.js";

const fixture = readFileSync(new URL("./fixtures/mpc-dates.html", import.meta.url), "utf8");

describe("parseMpcDates", () => {
  it("extracts every announcement date from the page as ISO 8601, sorted", () => {
    expect(parseMpcDates(fixture)).toEqual([
      "2026-02-05",
      "2026-03-19",
      "2026-04-30",
      "2026-06-18",
      "2026-07-30",
      "2026-09-17",
      "2026-11-05",
      "2026-12-17",
      "2027-02-04",
      "2027-03-18",
    ]);
  });

  it("ignores date-like text inside script and style tags", () => {
    const dates = parseMpcDates(fixture);
    expect(dates).not.toContain("2020-01-01");
  });

  it("deduplicates repeated dates", () => {
    const html = "<p>Thursday 5 February 2026</p><p>5 February 2026</p>";
    expect(parseMpcDates(html)).toEqual(["2026-02-05"]);
  });

  it("throws a clean error when the page contains no dates", () => {
    expect(() => parseMpcDates("<html><body>maintenance</body></html>")).toThrow(/no mpc dates/i);
  });
});

describe("nextMeeting / daysUntil", () => {
  const dates = parseMpcDates(fixture);

  it("picks the first date on or after today and counts days until it", () => {
    const meeting = nextMeeting(dates, new Date(Date.UTC(2026, 6, 6)));
    expect(meeting).toEqual({ date: "2026-07-30", daysUntil: 24 });
  });

  it("returns daysUntil 0 on the day of the meeting", () => {
    const meeting = nextMeeting(dates, new Date(Date.UTC(2026, 6, 30, 11, 59)));
    expect(meeting).toEqual({ date: "2026-07-30", daysUntil: 0 });
  });

  it("skips past meetings", () => {
    const meeting = nextMeeting(dates, new Date(Date.UTC(2026, 11, 18)));
    expect(meeting).toEqual({ date: "2027-02-04", daysUntil: 48 });
  });

  it("returns null when all listed dates are in the past", () => {
    expect(nextMeeting(dates, new Date(Date.UTC(2030, 0, 1)))).toBeNull();
  });
});
