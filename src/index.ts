#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveHttpConfig, startHttpServer } from "./http.js";
import { createServer } from "./server.js";

// The x-release-please-version marker lives on the McpServer construction
// line in src/server.ts (see release-please-config.json extra-files).

let httpConfig: ReturnType<typeof resolveHttpConfig>;
try {
  httpConfig = resolveHttpConfig(process.argv.slice(2), process.env);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

if (httpConfig) {
  await startHttpServer(httpConfig.port, httpConfig.host);
} else {
  // Default: stdio, exactly as before HTTP mode existed. stdout is the
  // protocol channel — nothing else may write to it.
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
}
