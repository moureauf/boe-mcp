// All HTTP calls to Bank of England endpoints and the parsing of their
// responses. Series codes are configuration: adding a future IADB series
// (mortgage approvals, gilt yields, ...) is a matter of passing a new code.

export interface SeriesPoint {
  date: string; // ISO 8601 (YYYY-MM-DD)
  value: number;
}

const IADB_BASE_URL =
  process.env.BOE_IADB_BASE_URL ??
  "https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp";

export const MPC_DATES_URL =
  process.env.BOE_MPC_DATES_URL ??
  "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

function monthNumber(name: string): number | null {
  const idx = MONTHS.findIndex((m) => m.startsWith(name.toLowerCase().slice(0, 3)));
  return idx === -1 ? null : idx + 1;
}

function toIso(day: string, monthName: string, year: string): string | null {
  const month = monthNumber(monthName);
  const d = Number(day);
  if (month === null || !Number.isInteger(d) || d < 1 || d > 31) return null;
  // round-trip through Date to reject calendar-impossible dates like 31 Feb
  const parsed = new Date(Date.UTC(Number(year), month - 1, d));
  if (parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== d) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function iadbCsvUrl(seriesCode: string, from = "01/Jan/1975"): string {
  const params = new URLSearchParams({
    "csv.x": "yes",
    Datefrom: from,
    Dateto: "now",
    SeriesCodes: seriesCode,
    CSVF: "TN",
    UsingCodes: "Y",
    VPD: "Y",
    VFD: "N",
  });
  return `${IADB_BASE_URL}?${params}`;
}

// IADB CSV rows look like `18 Dec 2025,3.7500` under a `DATE,<CODE>` header.
// Parse defensively: tolerate quotes and whitespace, skip anything malformed.
export function parseIadbCsv(csv: string): SeriesPoint[] {
  const rowPattern = /^"?\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\s*"?\s*,\s*"?\s*(-?\d+(?:\.\d+)?)\s*"?\s*$/;
  const points: SeriesPoint[] = [];
  for (const line of csv.split(/\r?\n/)) {
    const match = rowPattern.exec(line.trim());
    if (!match) continue;
    const [, day, monthName, year, value] = match;
    const date = toIso(day, monthName, year);
    if (date === null) continue;
    points.push({ date, value: Number(value) });
  }
  if (points.length === 0) {
    throw new Error("BoE IADB response contained no data rows");
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#0*160;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function extractDates(text: string): string[] {
  const datePattern =
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/gi;
  const dates = new Set<string>();
  for (const [, day, monthName, year] of text.matchAll(datePattern)) {
    const iso = toIso(day, monthName, year);
    if (iso !== null) dates.add(iso);
  }
  return [...dates].sort();
}

// The MPC dates page layout has changed over time, so don't rely on specific
// markup: strip tags and pick up every "5 February 2026"-style date in the
// visible text. To avoid picking up unrelated dates in navigation, teasers or
// the footer, prefer the <main> content region when it exists and contains
// dates; otherwise scan the whole page.
export function parseMpcDates(html: string): string[] {
  const main = /<main[\s>][\s\S]*?<\/main>/i.exec(html);
  let dates = main ? extractDates(visibleText(main[0])) : [];
  if (dates.length === 0) {
    dates = extractDates(visibleText(html));
  }
  if (dates.length === 0) {
    throw new Error("No MPC dates found on the BoE upcoming-MPC-dates page");
  }
  return dates;
}

async function fetchText(url: string, accept: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept, "user-agent": "boe-mcp (+https://github.com/moureauf/boe-mcp)" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(`Could not reach the Bank of England (${url}): ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new Error(`Bank of England returned HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

export async function fetchSeriesPoints(
  seriesCode: string,
): Promise<{ points: SeriesPoint[]; source: string }> {
  const source = iadbCsvUrl(seriesCode);
  const csv = await fetchText(source, "text/csv");
  return { points: parseIadbCsv(csv), source };
}

export async function fetchMpcDates(): Promise<{ dates: string[]; source: string }> {
  const html = await fetchText(MPC_DATES_URL, "text/html");
  return { dates: parseMpcDates(html), source: MPC_DATES_URL };
}
