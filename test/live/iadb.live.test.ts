// Integration smoke test against the real BoE endpoints.
// Excluded from the default `npm test` / CI run — run with `npm run test:live`.
import { describe, expect, it } from "vitest";
import { fetchMpcDates, fetchSeriesPoints } from "../../src/boe-client.js";
import { SERIES_CATALOG } from "../../src/series-catalog.js";

describe("live BoE endpoints", () => {
  it("fetches and parses the real IUDBEDR series", async () => {
    const { points } = await fetchSeriesPoints("IUDBEDR");
    expect(points.length).toBeGreaterThan(5);
    const latest = points.at(-1)!;
    expect(latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(latest.value).toBeGreaterThan(0);
    expect(latest.value).toBeLessThan(20);
  });

  it("fetches and parses the real IUDSOIA (SONIA) series", async () => {
    const { points } = await fetchSeriesPoints("IUDSOIA");
    expect(points.length).toBeGreaterThan(5);
    const latest = points.at(-1)!;
    expect(latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // SONIA tracks Bank Rate closely — a plausible (wide) sanity band
    expect(latest.value).toBeGreaterThanOrEqual(0);
    expect(latest.value).toBeLessThan(20);
  });

  // Verifies every catalogued code still returns parseable rows, so list_series
  // can never advertise a code that get_series then fails on.
  it.each(SERIES_CATALOG.map((s) => s.code))(
    "resolves catalogued series %s to parseable data",
    async (code) => {
      const { points } = await fetchSeriesPoints(code);
      expect(points.length).toBeGreaterThan(0);
      expect(points.at(-1)!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(points.at(-1)!.value)).toBe(true);
    },
  );

  it("fetches and parses the real upcoming MPC dates page", async () => {
    const { dates } = await fetchMpcDates();
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
