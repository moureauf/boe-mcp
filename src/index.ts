#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

// The x-release-please-version marker lives on the McpServer construction
// line in src/server.ts (see release-please-config.json extra-files).

const transport = new StdioServerTransport();
await createServer().connect(transport);
