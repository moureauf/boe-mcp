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

  it("decodes non-breaking-space entities inside dates", () => {
    const html = "<li>Thursday 5&nbsp;February&#160;2026</li>";
    expect(parseMpcDates(html)).toEqual(["2026-02-05"]);
  });

  it("prefers dates inside <main> over unrelated dates elsewhere on the page", () => {
    const html = `
      <nav>News: rate decision of 7 August 2025</nav>
      <main><li>Thursday 30 July 2026</li></main>
      <footer>Page updated 1 July 2026</footer>`;
    expect(parseMpcDates(html)).toEqual(["2026-07-30"]);
  });

  it("falls back to the whole page when <main> contains no dates", () => {
    const html = "<main><h1>MPC dates</h1></main><div>Thursday 30 July 2026</div>";
    expect(parseMpcDates(html)).toEqual(["2026-07-30"]);
  });

  it("rejects calendar-impossible dates like 31 September", () => {
    const html = "<li>31 September 2026</li><li>17 September 2026</li>";
    expect(parseMpcDates(html)).toEqual(["2026-09-17"]);
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
