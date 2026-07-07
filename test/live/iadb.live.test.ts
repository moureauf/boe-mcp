// Integration smoke test against the real BoE endpoints.
// Excluded from the default `npm test` / CI run — run with `npm run test:live`.
import { describe, expect, it } from "vitest";
import { fetchMpcDates, fetchSeriesPoints } from "../../src/boe-client.js";

describe("live BoE endpoints", () => {
  it("fetches and parses the real IUDBEDR series", async () => {
    const { points } = await fetchSeriesPoints("IUDBEDR");
    expect(points.length).toBeGreaterThan(5);
    const latest = points.at(-1)!;
    expect(latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(latest.value).toBeGreaterThan(0);
    expect(latest.value).toBeLessThan(20);
  });

  it("fetches and parses the real upcoming MPC dates page", async () => {
    const { dates } = await fetchMpcDates();
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
