import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseIadbCsv } from "../src/boe-client.js";

const fixture = readFileSync(new URL("./fixtures/iudbedr.csv", import.meta.url), "utf8");

describe("parseIadbCsv", () => {
  it("parses every data row of the fixture", () => {
    const points = parseIadbCsv(fixture);
    expect(points).toHaveLength(20);
  });

  it("converts IADB dates to ISO 8601 and values to numbers", () => {
    const points = parseIadbCsv(fixture);
    expect(points[0]).toEqual({ date: "2021-12-16", value: 0.25 });
    expect(points.at(-1)).toEqual({ date: "2025-12-18", value: 3.75 });
  });

  it("returns points sorted by date ascending", () => {
    const points = parseIadbCsv(fixture);
    const dates = points.map((p) => p.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("skips the header, blank lines and malformed rows", () => {
    const messy = 'DATE,IUDBEDR\n\n"01 Feb 2024", 5.25 \nnot a row\n02 Feb 2024,notanumber\n';
    expect(parseIadbCsv(messy)).toEqual([{ date: "2024-02-01", value: 5.25 }]);
  });

  it("throws a clean error when no rows can be parsed", () => {
    expect(() => parseIadbCsv("<html>error page</html>")).toThrow(/no data rows/i);
  });
});
