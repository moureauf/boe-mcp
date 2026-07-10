// Curated catalog of well-known Bank of England IADB series, surfaced by the
// `list_series` tool as a convenience. This is NOT an exhaustive list: the
// `get_series` tool accepts ANY valid IADB series code, not only these — the
// catalog just gives an LLM a starting set of useful, human-labelled series
// across policy rates, market rates, FX and household rates.
//
// Each code below is a genuine, long-standing IADB series. The `unit` and
// `frequency` strings describe how to read the numbers the endpoint returns.
// The live integration test (`test/live/iadb.live.test.ts`) fetches every code
// here end-to-end, so a code that ever stops returning parseable rows is caught
// by `npm run test:live` before it can ship.

export interface SeriesCatalogEntry {
  code: string; // IADB series code, e.g. "IUDBEDR"
  name: string; // short human-readable name
  description: string; // one-line description of what the series measures
  unit: string; // how to read a value, e.g. "percent per annum"
  frequency: string; // observation cadence, e.g. "daily", "monthly"
}

export const SERIES_CATALOG: SeriesCatalogEntry[] = [
  {
    code: "IUDBEDR",
    name: "Official Bank Rate",
    description:
      "The Bank of England's official Bank Rate, set by the Monetary Policy Committee. The same series that powers the get_current_rate / get_rate_history tools.",
    unit: "percent per annum",
    frequency: "daily (changes only on MPC decisions)",
  },
  {
    code: "IUDSOIA",
    name: "SONIA (Sterling Overnight Index Average)",
    description:
      "The SONIA benchmark: the effective overnight interest rate paid by banks for unsecured sterling transactions. The near-risk-free reference rate for sterling markets.",
    unit: "percent per annum",
    frequency: "daily (business days)",
  },
  {
    code: "XUDLUSS",
    name: "US dollar / sterling spot exchange rate",
    description:
      "Daily spot exchange rate of the US dollar into sterling — how many US dollars one pound buys.",
    unit: "US dollars per £1",
    frequency: "daily (business days)",
  },
  {
    code: "XUDLERS",
    name: "Euro / sterling spot exchange rate",
    description:
      "Daily spot exchange rate of the euro into sterling — how many euros one pound buys.",
    unit: "euros per £1",
    frequency: "daily (business days)",
  },
  {
    code: "XUDLBK67",
    name: "Sterling effective exchange rate index",
    description:
      "The broad sterling effective exchange rate index (ERI): a trade-weighted measure of sterling against a basket of currencies.",
    unit: "index (January 2005 = 100)",
    frequency: "daily (business days)",
  },
  {
    code: "IUMBV34",
    name: "2-year fixed 75% LTV mortgage rate",
    description:
      "Quoted household interest rate for a 2-year fixed-rate mortgage at 75% loan-to-value from UK monetary financial institutions.",
    unit: "percent per annum",
    frequency: "monthly",
  },
];

export const CATALOG_NOTE =
  "This is a curated shortlist. get_series also accepts any other Bank of England IADB series code (not only the ones listed here) — browse the full database at https://www.bankofengland.co.uk/boeapps/database/ and pass its code to get_series.";

// Case-insensitive lookup by series code; undefined for codes not in the catalog
// (get_series still fetches those, just without name/unit/frequency metadata).
export function lookupSeries(code: string): SeriesCatalogEntry | undefined {
  const upper = code.toUpperCase();
  return SERIES_CATALOG.find((entry) => entry.code === upper);
}
