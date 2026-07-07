import { describe, expect, it } from "vitest";
import { monthsBetween } from "../src/tools/current-rate.js";

describe("monthsBetween (months-held arithmetic)", () => {
  it("counts whole months elapsed", () => {
    expect(monthsBetween("2025-12-18", new Date(Date.UTC(2026, 6, 6)))).toBe(6);
  });

  it("counts a month only once the day-of-month is reached", () => {
    expect(monthsBetween("2025-12-18", new Date(Date.UTC(2026, 0, 17)))).toBe(0);
    expect(monthsBetween("2025-12-18", new Date(Date.UTC(2026, 0, 18)))).toBe(1);
    expect(monthsBetween("2025-12-18", new Date(Date.UTC(2026, 0, 19)))).toBe(1);
  });

  it("handles year boundaries", () => {
    expect(monthsBetween("2023-08-03", new Date(Date.UTC(2024, 7, 1)))).toBe(11);
    expect(monthsBetween("2023-08-03", new Date(Date.UTC(2024, 7, 3)))).toBe(12);
  });

  it("returns 0 for a change earlier today", () => {
    expect(monthsBetween("2026-07-06", new Date(Date.UTC(2026, 6, 6)))).toBe(0);
  });

  it("never returns a negative count", () => {
    expect(monthsBetween("2026-08-01", new Date(Date.UTC(2026, 6, 6)))).toBe(0);
  });
});
