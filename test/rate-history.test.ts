import { describe, expect, it } from "vitest";
import { toRateEntries } from "../src/tools/rate-history.js";

describe("toRateEntries (changeBps computation)", () => {
  it("computes basis-point moves against the previous entry", () => {
    const entries = toRateEntries([
      { date: "2024-08-01", value: 5.0 },
      { date: "2024-11-07", value: 4.75 },
      { date: "2025-02-06", value: 4.5 },
    ]);
    expect(entries.map((e) => e.changeBps)).toEqual([null, -25, -25]);
  });

  it("returns null changeBps for the first entry of the series", () => {
    const entries = toRateEntries([{ date: "2021-12-16", value: 0.25 }]);
    expect(entries).toEqual([{ date: "2021-12-16", rate: 0.25, changeBps: null }]);
  });

  it("handles upward moves and >25bps jumps", () => {
    const entries = toRateEntries([
      { date: "2022-06-16", value: 1.25 },
      { date: "2022-08-04", value: 1.75 },
      { date: "2022-11-03", value: 3.0 },
    ]);
    expect(entries.map((e) => e.changeBps)).toEqual([null, 50, 125]);
  });

  it("collapses consecutive duplicate rates into a single change entry", () => {
    // if the series ever reports unchanged observations, they are not "changes"
    const entries = toRateEntries([
      { date: "2025-08-07", value: 4.0 },
      { date: "2025-09-18", value: 4.0 },
      { date: "2025-12-18", value: 3.75 },
    ]);
    expect(entries).toEqual([
      { date: "2025-08-07", rate: 4.0, changeBps: null },
      { date: "2025-12-18", rate: 3.75, changeBps: -25 },
    ]);
  });

  it("avoids floating point noise in bps (e.g. 4.5 -> 4.25)", () => {
    const entries = toRateEntries([
      { date: "2025-02-06", value: 4.5 },
      { date: "2025-05-08", value: 4.25 },
    ]);
    expect(entries[1].changeBps).toBe(-25);
  });
});
