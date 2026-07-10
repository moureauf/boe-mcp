import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMpcDates, fetchSeriesPoints, iadbCsvUrl } from "../src/boe-client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("iadbCsvUrl", () => {
  it("builds the CSV endpoint for a configurable series code", () => {
    const url = iadbCsvUrl("IUDBEDR");
    expect(url).toContain("SeriesCodes=IUDBEDR");
    expect(url).toContain("csv.x=yes");
    // a future series is just a different code — nothing else changes
    expect(iadbCsvUrl("LPMVTVX")).toContain("SeriesCodes=LPMVTVX");
  });

  it("defaults to the full history through now", () => {
    const url = iadbCsvUrl("IUDBEDR");
    expect(url).toContain("Datefrom=01%2FJan%2F1975");
    expect(url).toContain("Dateto=now");
  });

  it("accepts an explicit Dateto for a bounded server-side window", () => {
    const url = iadbCsvUrl("IUDSOIA", "01/Jan/2020", "31/Dec/2020");
    expect(url).toContain("Datefrom=01%2FJan%2F2020");
    expect(url).toContain("Dateto=31%2FDec%2F2020");
  });
});

describe("fetchSeriesPoints", () => {
  it("fetches and parses the CSV for the given series", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("DATE,IUDBEDR\n01 Aug 2024,5.0000\n", { status: 200 })),
    );
    const { points, source } = await fetchSeriesPoints("IUDBEDR");
    expect(points).toEqual([{ date: "2024-08-01", value: 5.0 }]);
    expect(source).toContain("bankofengland.co.uk");
  });

  it("throws a clean error on HTTP failure (no stack traces in the message)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await expect(fetchSeriesPoints("IUDBEDR")).rejects.toThrow(/503/);
  });
});

describe("fetchMpcDates", () => {
  it("fetches and parses the MPC dates page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<li>Thursday 30 July 2026</li>", { status: 200 })),
    );
    const { dates } = await fetchMpcDates();
    expect(dates).toEqual(["2026-07-30"]);
  });
});
