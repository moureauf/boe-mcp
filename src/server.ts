import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCurrentRate } from "./tools/current-rate.js";
import {
  DEFAULT_SERIES_LIMIT,
  getSeriesData,
  MAX_SERIES_LIMIT,
} from "./tools/get-series.js";
import { listSeries } from "./tools/list-series.js";
import { getUpcomingMpcDates } from "./tools/mpc-dates.js";
import { getNextMpcMeeting } from "./tools/next-meeting.js";
import { getRateAt } from "./tools/rate-at.js";
import { DEFAULT_HISTORY_LIMIT, getRateHistory } from "./tools/rate-history.js";
import { getRateStats } from "./tools/rate-stats.js";

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

// Successful responses carry the payload both as structuredContent (validated
// against the tool's outputSchema) and as JSON text for clients that only read
// text content. Failures become a clean, human-readable message (never a stack
// trace). Stale cache results keep their stale:true flag so the caller can
// surface the caveat.
async function respond(handler: () => Promise<object>): Promise<ToolResult> {
  try {
    const result = await handler();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: { ...result },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}

const isoDate = z.string().describe("ISO 8601 date (YYYY-MM-DD)");
const sourceFields = {
  source: z.string().describe("URL the data was fetched from"),
  cachedAt: z.string().describe("When the data was fetched (ISO 8601 timestamp)"),
  stale: z
    .boolean()
    .optional()
    .describe("Present and true when the BoE was unreachable and this is stale cached data"),
};

/**
 * Build a fully configured boe-mcp server with all tools registered.
 *
 * A fresh instance per call: the stdio entry point connects one to a
 * StdioServerTransport, and the stateless HTTP transport creates one per
 * incoming request.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: "boe-mcp", version: "0.1.3" }); // x-release-please-version

  server.registerTool(
    "get_current_rate",
    {
      title: "Current BoE base rate",
      description:
        "Get the current Bank of England base rate, the date it took effect, and how many whole months it has been held at this level.",
      inputSchema: {},
      outputSchema: {
        rate: z.number().describe("Current base rate in percent, e.g. 3.75"),
        effectiveDate: isoDate.describe("Date the current level took effect"),
        monthsHeld: z.number().int().describe("Whole months the rate has been at this level"),
        ...sourceFields,
      },
    },
    () => respond(() => getCurrentRate()),
  );

  server.registerTool(
    "get_rate_history",
    {
      title: "BoE base rate history",
      description:
        "Get the last N Bank of England base rate changes: date, new rate, and the move in basis points vs the previous level (null for the earliest known entry).",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(`Number of rate changes to return (default ${DEFAULT_HISTORY_LIMIT})`),
      },
      outputSchema: {
        entries: z.array(
          z.object({
            date: isoDate,
            rate: z.number().describe("Base rate in percent after this change"),
            changeBps: z
              .number()
              .int()
              .nullable()
              .describe(
                "Move in basis points vs the previous level; null for the earliest entry",
              ),
          }),
        ),
        ...sourceFields,
      },
    },
    ({ limit }) => respond(() => getRateHistory(limit ?? DEFAULT_HISTORY_LIMIT)),
  );

  server.registerTool(
    "get_rate_at",
    {
      title: "BoE base rate on a date",
      description:
        "Get the Bank of England base rate that was in force on a specific historical date, and when that level took effect.",
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO 8601 date (YYYY-MM-DD)")
          .describe("The date to look up, ISO 8601 (YYYY-MM-DD)"),
      },
      outputSchema: {
        date: isoDate.describe("The queried date"),
        rate: z.number().describe("Base rate in percent in force on that date"),
        effectiveDate: isoDate.describe("Date this rate level took effect"),
        ...sourceFields,
      },
    },
    ({ date }) => respond(() => getRateAt(date)),
  );

  server.registerTool(
    "get_rate_stats",
    {
      title: "BoE base rate statistics over a range",
      description:
        "Get summary statistics of the Bank of England base rate over a date range: minimum and maximum (with the date each level first applied), the time-weighted average, and the rates in force at the start and end of the window with the net move in basis points. Both dates are optional — omit them for the full available history through today. The rate level in force on the start date counts even if it took effect earlier.",
      inputSchema: {
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO 8601 date (YYYY-MM-DD)")
          .optional()
          .describe(
            "Start of the window, ISO 8601 (YYYY-MM-DD). Defaults to the start of the available series",
          ),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO 8601 date (YYYY-MM-DD)")
          .optional()
          .describe(
            "End of the window (inclusive), ISO 8601 (YYYY-MM-DD). Defaults to today; must not be in the future",
          ),
      },
      outputSchema: {
        from: isoDate.describe(
          "Effective window start used (the first available data point when `from` was omitted or predates the series)",
        ),
        to: isoDate.describe("Effective window end used (today when `to` was omitted)"),
        min: z.object({
          rate: z.number().describe("Lowest base rate in percent in force during the window"),
          date: isoDate.describe(
            "First date this level was in force within the window (the window start for a level carried in from before it)",
          ),
        }),
        max: z.object({
          rate: z.number().describe("Highest base rate in percent in force during the window"),
          date: isoDate.describe(
            "First date this level was in force within the window (the window start for a level carried in from before it)",
          ),
        }),
        average: z
          .number()
          .describe(
            "Time-weighted average rate in percent: each level weighted by the number of calendar days it was in force within the window (not a plain mean of the sparse change points), rounded to 4 decimal places",
          ),
        startRate: z.number().describe("Rate in percent in force on the window start date"),
        endRate: z.number().describe("Rate in percent in force on the window end date"),
        changeBps: z
          .number()
          .int()
          .describe("Net move over the window: endRate minus startRate, in basis points"),
        ...sourceFields,
      },
    },
    ({ from, to }) => respond(() => getRateStats(from, to)),
  );

  server.registerTool(
    "get_next_mpc_meeting",
    {
      title: "Next MPC meeting",
      description:
        "Get the date of the next scheduled Bank of England Monetary Policy Committee announcement and the number of days until it.",
      inputSchema: {},
      outputSchema: {
        date: isoDate.describe("Date of the next MPC announcement"),
        daysUntil: z.number().int().describe("Calendar days from today until the announcement"),
        ...sourceFields,
      },
    },
    () => respond(() => getNextMpcMeeting()),
  );

  server.registerTool(
    "get_mpc_dates",
    {
      title: "Upcoming MPC announcement dates",
      description:
        "Get every upcoming Bank of England Monetary Policy Committee announcement date on the published schedule (typically a year or more ahead), each with the number of calendar days until it. Use get_next_mpc_meeting when only the next date is needed.",
      inputSchema: {},
      outputSchema: {
        dates: z
          .array(
            z.object({
              date: isoDate.describe("Date of the MPC announcement"),
              daysUntil: z
                .number()
                .int()
                .describe("Calendar days from today until the announcement (0 = today)"),
            }),
          )
          .describe("All published announcement dates on or after today, ascending"),
        ...sourceFields,
      },
    },
    () => respond(() => getUpcomingMpcDates()),
  );

  server.registerTool(
    "list_series",
    {
      title: "List known BoE IADB series",
      description:
        "List a curated catalog of well-known Bank of England IADB statistical series (policy rates, market rates, exchange rates, household rates) with their code, name, description, unit and frequency. Use this to discover series codes to pass to get_series. get_series also accepts any other IADB code, not only these.",
      inputSchema: {},
      outputSchema: {
        series: z.array(
          z.object({
            code: z
              .string()
              .describe("IADB series code, e.g. IUDBEDR — pass this to get_series"),
            name: z.string().describe("Short human-readable name of the series"),
            description: z.string().describe("One-line description of what the series measures"),
            unit: z.string().describe("How to read a value, e.g. 'percent per annum'"),
            frequency: z.string().describe("Observation cadence, e.g. 'daily', 'monthly'"),
          }),
        ),
        note: z
          .string()
          .describe(
            "Note explaining that get_series accepts any IADB code, not only the listed ones",
          ),
      },
    },
    () => respond(async () => listSeries()),
  );

  server.registerTool(
    "get_series",
    {
      title: "Get a BoE IADB time series",
      description:
        "Fetch observations for any Bank of England IADB statistical series by its code (e.g. IUDSOIA for SONIA, XUDLUSS for USD/GBP). Optionally restrict to a date range and cap how many of the most recent points are returned. Use list_series to discover codes; any valid IADB code works, not only catalogued ones.",
      inputSchema: {
        seriesCode: z
          .string()
          .regex(/^[A-Z0-9]{4,12}$/i, "must be 4–12 letters or digits (e.g. IUDBEDR)")
          .describe("IADB series code, e.g. IUDSOIA, XUDLUSS, IUMBV34 (case-insensitive)"),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO 8601 date (YYYY-MM-DD)")
          .optional()
          .describe("Only return observations on or after this ISO 8601 date (YYYY-MM-DD)"),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO 8601 date (YYYY-MM-DD)")
          .optional()
          .describe("Only return observations on or before this ISO 8601 date (YYYY-MM-DD)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_SERIES_LIMIT)
          .optional()
          .describe(
            `Maximum number of most-recent observations to return after date filtering (default ${DEFAULT_SERIES_LIMIT}, max ${MAX_SERIES_LIMIT})`,
          ),
      },
      outputSchema: {
        seriesCode: z.string().describe("The resolved (uppercased) IADB series code"),
        name: z.string().optional().describe("Series name, present when the code is catalogued"),
        unit: z.string().optional().describe("Value unit, present when the code is catalogued"),
        frequency: z
          .string()
          .optional()
          .describe("Observation cadence, present when the code is catalogued"),
        points: z.array(
          z.object({
            date: isoDate.describe("Observation date"),
            value: z.number().describe("Observed value in the series' unit"),
          }),
        ),
        ...sourceFields,
      },
    },
    ({ seriesCode, from, to, limit }) =>
      respond(() => getSeriesData(seriesCode, from, to, limit ?? DEFAULT_SERIES_LIMIT)),
  );

  return server;
}
