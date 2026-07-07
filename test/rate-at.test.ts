import { describe, expect, it } from "vitest";
import { rateAt } from "../src/tools/rate-at.js";
import type { RateEntry } from "../src/tools/rate-history.js";

const entries: RateEntry[] = [
  { date: "2024-08-01", rate: 5.0, changeBps: null },
  { date: "2024-11-07", rate: 4.75, changeBps: -25 },
  { date: "2025-12-18", rate: 3.75, changeBps: -100 },
];

describe("rateAt", () => {
  it("returns the rate in force on the queried date", () => {
    expect(rateAt(entries, "2025-06-15")).toEqual({ rate: 4.75, effectiveDate: "2024-11-07" });
  });

  it("counts a change as in force from its effective date itself", () => {
    expect(rateAt(entries, "2024-11-07")).toEqual({ rate: 4.75, effectiveDate: "2024-11-07" });
    expect(rateAt(entries, "2024-11-06")).toEqual({ rate: 5.0, effectiveDate: "2024-08-01" });
  });

  it("returns the latest rate for dates after the last change", () => {
    expect(rateAt(entries, "2026-01-01")).toEqual({ rate: 3.75, effectiveDate: "2025-12-18" });
  });

  it("returns null for dates before the series begins", () => {
    expect(rateAt(entries, "2024-07-31")).toBeNull();
  });
});
