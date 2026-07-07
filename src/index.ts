#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getCurrentRate } from "./tools/current-rate.js";
import { DEFAULT_HISTORY_LIMIT, getRateHistory } from "./tools/rate-history.js";
import { getNextMpcMeeting } from "./tools/next-meeting.js";

const server = new McpServer({ name: "boe-mcp", version: "0.1.0" });

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
            .describe("Move in basis points vs the previous level; null for the earliest entry"),
        }),
      ),
      ...sourceFields,
    },
  },
  ({ limit }) => respond(() => getRateHistory(limit ?? DEFAULT_HISTORY_LIMIT)),
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

const transport = new StdioServerTransport();
await server.connect(transport);
