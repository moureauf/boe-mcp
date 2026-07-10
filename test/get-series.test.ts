import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseIadbCsv } from "../src/boe-client.js";
import {
  DEFAULT_SERIES_LIMIT,
  filterPoints,
  getSeriesData,
  normaliseSeriesCode,
} from "../src/tools/get-series.js";

const sonia = parseIadbCsv(
  readFileSync(new URL("./fixtures/iudsoia.csv", import.meta.url), "utf8"),
);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("normaliseSeriesCode", () => {
  it("uppercases a valid code", () => {
    expect(normaliseSeriesCode("iudsoia")).toBe("IUDSOIA");
    expect(normaliseSeriesCode("XUDLuss")).toBe("XUDLUSS");
  });

  it("rejects codes that are too short, too long, or non-alphanumeric", () => {
    expect(() => normaliseSeriesCode("ABC")).toThrow(/invalid series code/i);
    expect(() => normaliseSeriesCode("ABCDEFGHIJKLM")).toThrow(/invalid series code/i);
    expect(() => normaliseSeriesCode("IUD BEDR")).toThrow(/invalid series code/i);
    expect(() => normaliseSeriesCode("IUD-BEDR")).toThrow(/invalid series code/i);
  });
});

describe("filterPoints", () => {
  it("returns the most recent DEFAULT_SERIES_LIMIT points when unfiltered", () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      date: `2020-01-${String((i % 28) + 1).padStart(2, "0")}`,
      value: i,
    }));
    const out = filterPoints(many);
    expect(out).toHaveLength(DEFAULT_SERIES_LIMIT);
    expect(out.at(-1)).toEqual(many.at(-1));
  });

  it("filters inclusively on from and to", () => {
    const out = filterPoints(sonia, "2025-02-01", "2025-08-31");
    expect(out.map((p) => p.date)).toEqual([
      "2025-02-06",
      "2025-02-07",
      "2025-05-08",
      "2025-05-09",
      "2025-08-07",
      "2025-08-08",
    ]);
  });

  it("applies limit to the most recent points after date filtering", () => {
    const out = filterPoints(sonia, "2025-02-01", "2025-08-31", 3);
    expect(out.map((p) => p.date)).toEqual(["2025-05-09", "2025-08-07", "2025-08-08"]);
  });

  it("treats the from bound as inclusive of the exact date", () => {
    expect(filterPoints(sonia, "2025-12-18").map((p) => p.date)).toEqual([
      "2025-12-18",
      "2025-12-19",
    ]);
  });
});

describe("getSeriesData", () => {
  function stubCsv(csv: string) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(csv, { status: 200 })));
  }

  it("rejects malformed date inputs", async () => {
    await expect(getSeriesData("IUDBEDR", "2025/01/01")).rejects.toThrow(/invalid from date/i);
    await expect(getSeriesData("IUDBEDR", undefined, "01-01-2025")).rejects.toThrow(
      /invalid to date/i,
    );
  });

  it("rejects a reversed date range", async () => {
    await expect(getSeriesData("IUDBEDR", "2025-06-01", "2025-01-01")).rejects.toThrow(
      /from .* is after to/i,
    );
  });

  it("attaches catalog metadata for a known code and returns filtered points", async () => {
    stubCsv(readFileSync(new URL("./fixtures/iudsoia.csv", import.meta.url), "utf8"));
    const result = await getSeriesData("iudsoia", "2025-08-01", undefined, 2);
    expect(result.seriesCode).toBe("IUDSOIA");
    expect(result.name).toContain("SONIA");
    expect(result.unit).toBe("percent per annum");
    expect(result.frequency).toContain("daily");
    expect(result.points).toEqual([
      { date: "2025-12-18", value: 3.69 },
      { date: "2025-12-19", value: 3.69 },
    ]);
    expect(result.source).toContain("bankofengland.co.uk");
    expect(result.cachedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("omits metadata fields for a valid but non-catalogued code", async () => {
    stubCsv("DATE,UNCATLOG1\n01 Aug 2024,1.2300\n");
    const result = await getSeriesData("UNCATLOG1");
    expect(result.seriesCode).toBe("UNCATLOG1");
    expect(result.name).toBeUndefined();
    expect(result.unit).toBeUndefined();
    expect(result.frequency).toBeUndefined();
    expect(result.points).toEqual([{ date: "2024-08-01", value: 1.23 }]);
  });

  it("gives a friendly, code-specific error for an unknown/empty series", async () => {
    stubCsv("<html>Series not found</html>");
    await expect(getSeriesData("NOSUCH99")).rejects.toThrow(
      /Unknown or empty IADB series "NOSUCH99" — use list_series/,
    );
  });

  it("serves stale cached points with stale:true when a later refetch fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("DATE,STALETST\n01 Aug 2024,5.0000\n", { status: 200 }))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const fresh = await getSeriesData("STALETST");
    expect(fresh.stale).toBeUndefined();

    vi.advanceTimersByTime(61 * 60 * 1000); // past the default 60-minute TTL
    const stale = await getSeriesData("STALETST");
    expect(stale.stale).toBe(true);
    expect(stale.points).toEqual(fresh.points);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
