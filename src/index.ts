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
  isError?: boolean;
};

// Successful responses are JSON; failures become a clean, human-readable
// message (never a stack trace). Stale cache results keep their stale:true
// flag so the caller can surface the caveat.
async function respond(handler: () => Promise<object>): Promise<ToolResult> {
  try {
    const result = await handler();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}

server.registerTool(
  "get_current_rate",
  {
    title: "Current BoE base rate",
    description:
      "Get the current Bank of England base rate, the date it took effect, and how many whole months it has been held at this level.",
    inputSchema: {},
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
  },
  () => respond(() => getNextMpcMeeting()),
);

const transport = new StdioServerTransport();
await server.connect(transport);
