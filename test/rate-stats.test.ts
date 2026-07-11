import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RateEntry } from "../src/tools/rate-history.js";
import { computeRateStats, getRateStats } from "../src/tools/rate-stats.js";

const entries: RateEntry[] = [
  { date: "2024-08-01", rate: 5.0, changeBps: null },
  { date: "2024-11-07", rate: 4.75, changeBps: -25 },
  { date: "2025-12-18", rate: 3.75, changeBps: -100 },
];
const now = new Date(Date.UTC(2026, 0, 31)); // 2026-01-31

describe("computeRateStats", () => {
  it("time-weights the average by the days each level was in force", () => {
    // 5.0% for 6 days (1st-6th) + 4.75% for 4 days (7th-10th) over 10 days = 4.9
    const stats = computeRateStats(entries, "2024-11-01", "2024-11-10", now);
    expect(stats.average).toBe(4.9);
    expect(stats.from).toBe("2024-11-01");
    expect(stats.to).toBe("2024-11-10");
  });

  it("counts the level carried in from before `from` as part of the window", () => {
    const stats = computeRateStats(entries, "2024-11-01", "2024-11-10", now);
    expect(stats.startRate).toBe(5.0); // took effect 2024-08-01, still in force on `from`
    expect(stats.max).toEqual({ rate: 5.0, date: "2024-11-01" }); // dated at the window start
    expect(stats.min).toEqual({ rate: 4.75, date: "2024-11-07" });
    expect(stats.endRate).toBe(4.75);
    expect(stats.changeBps).toBe(-25);
  });

  it("defaults to the full available history through today", () => {
    const stats = computeRateStats(entries, undefined, undefined, now);
    expect(stats.from).toBe("2024-08-01");
    expect(stats.to).toBe("2026-01-31");
    expect(stats.startRate).toBe(5.0);
    expect(stats.endRate).toBe(3.75);
    expect(stats.changeBps).toBe(-125);
    // 5.0 x 98d + 4.75 x 406d + 3.75 x 45d over 549 days, rounded to 4 dp
    expect(stats.average).toBe(4.7127);
  });

  it("handles a single-day window", () => {
    const stats = computeRateStats(entries, "2025-06-15", "2025-06-15", now);
    expect(stats).toMatchObject({
      from: "2025-06-15",
      to: "2025-06-15",
      min: { rate: 4.75, date: "2025-06-15" },
      max: { rate: 4.75, date: "2025-06-15" },
      average: 4.75,
      startRate: 4.75,
      endRate: 4.75,
      changeBps: 0,
    });
  });

  it("dates min/max at the first day the level was in force within the window", () => {
    const wavy: RateEntry[] = [
      { date: "2024-01-01", rate: 1.0, changeBps: null },
      { date: "2024-02-01", rate: 2.0, changeBps: 100 },
      { date: "2024-03-01", rate: 1.0, changeBps: -100 },
    ];
    const stats = computeRateStats(wavy, "2024-01-01", "2024-03-31", now);
    expect(stats.min).toEqual({ rate: 1.0, date: "2024-01-01" }); // first occurrence wins
    expect(stats.max).toEqual({ rate: 2.0, date: "2024-02-01" });
  });

  it("clamps a `from` before the first data point to the series start", () => {
    const stats = computeRateStats(entries, "2024-01-01", "2024-08-31", now);
    expect(stats.from).toBe("2024-08-01");
    expect(stats.average).toBe(5.0);
  });

  it("rejects a window entirely before the first data point", () => {
    expect(() => computeRateStats(entries, "2020-01-01", "2020-12-31", now)).toThrow(
      /starts on 2024-08-01/,
    );
  });

  it("rejects from > to", () => {
    expect(() => computeRateStats(entries, "2025-06-01", "2025-01-01", now)).toThrow(
      /from .* is after to/i,
    );
  });

  it("rejects malformed dates", () => {
    expect(() => computeRateStats(entries, "2025/01/01", undefined, now)).toThrow(
      /invalid from date/i,
    );
    expect(() => computeRateStats(entries, undefined, "01-01-2025", now)).toThrow(
      /invalid to date/i,
    );
  });

  it("rejects windows extending into the future", () => {
    expect(() => computeRateStats(entries, undefined, "2027-01-01", now)).toThrow(/future/i);
    expect(() => computeRateStats(entries, "2026-06-01", undefined, now)).toThrow(/future/i);
  });
});

describe("getRateStats (tool handler)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes stats from the fetched Bank Rate series", async () => {
    const csv = readFileSync(new URL("./fixtures/iudbedr.csv", import.meta.url), "utf8");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(csv, { status: 200 })));
    const result = await getRateStats("2025-01-01", "2025-12-31", new Date(Date.UTC(2026, 6, 11)));
    expect(result.startRate).toBe(4.75);
    expect(result.endRate).toBe(3.75);
    expect(result.changeBps).toBe(-100);
    expect(result.min).toEqual({ rate: 3.75, date: "2025-12-18" });
    expect(result.max).toEqual({ rate: 4.75, date: "2025-01-01" });
    // 4.75 x 36d + 4.5 x 91d + 4.25 x 91d + 4.0 x 133d + 3.75 x 14d over 365 days
    expect(result.average).toBe(4.2514);
    expect(result.source).toContain("bankofengland.co.uk");
    expect(result.cachedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.stale).toBeUndefined();
  });

  it("validates inputs before fetching anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getRateStats("2025-06-01", "2025-01-01")).rejects.toThrow(/is after to/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
