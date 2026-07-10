import { describe, expect, it } from "vitest";
import { CATALOG_NOTE, lookupSeries, SERIES_CATALOG } from "../src/series-catalog.js";
import { listSeries } from "../src/tools/list-series.js";

describe("series catalog integrity", () => {
  it("is non-empty and has a solid spread of entries", () => {
    expect(SERIES_CATALOG.length).toBeGreaterThanOrEqual(6);
  });

  it("has unique, canonical (uppercase, well-formed) codes", () => {
    const codes = SERIES_CATALOG.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{4,12}$/);
      expect(code).toBe(code.toUpperCase());
    }
  });

  it("has every required field populated on every entry", () => {
    for (const entry of SERIES_CATALOG) {
      for (const field of ["code", "name", "description", "unit", "frequency"] as const) {
        expect(typeof entry[field]).toBe("string");
        expect(entry[field].length).toBeGreaterThan(0);
      }
    }
  });

  it("includes the existing bank rate series so it is discoverable", () => {
    expect(SERIES_CATALOG.some((e) => e.code === "IUDBEDR")).toBe(true);
  });
});

describe("lookupSeries", () => {
  it("finds a catalogued series case-insensitively", () => {
    expect(lookupSeries("iudsoia")?.name).toContain("SONIA");
    expect(lookupSeries("IUDSOIA")?.code).toBe("IUDSOIA");
  });

  it("returns undefined for codes not in the catalog", () => {
    expect(lookupSeries("ZZZZZZ")).toBeUndefined();
  });
});

describe("listSeries tool", () => {
  it("returns the catalog and a note pointing at get_series for any code", () => {
    const result = listSeries();
    expect(result.series).toBe(SERIES_CATALOG);
    expect(result.note).toBe(CATALOG_NOTE);
    expect(result.note).toMatch(/get_series/);
  });
});
