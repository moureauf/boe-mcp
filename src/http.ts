import {
  createServer as createNodeHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

export const DEFAULT_HTTP_PORT = 3000;
export const DEFAULT_HTTP_HOST = "127.0.0.1";

export type HttpConfig = { port: number; host: string };

/**
 * Decide whether to run in HTTP mode and with what port/host.
 *
 * HTTP mode is strictly opt-in: `--http [port]` on the command line or the
 * BOE_MCP_HTTP_PORT env var. Returns undefined otherwise, which keeps stdio
 * as the default transport. Precedence for the port: `--http <port>` >
 * BOE_MCP_HTTP_PORT > 3000. Bind host: BOE_MCP_HTTP_HOST > 127.0.0.1.
 */
export function resolveHttpConfig(
  argv: string[],
  env: Record<string, string | undefined>,
): HttpConfig | undefined {
  const flagIndex = argv.indexOf("--http");
  const envPort = env.BOE_MCP_HTTP_PORT?.trim();
  if (flagIndex === -1 && !envPort) return undefined;

  let port: number | undefined;
  const flagArg = flagIndex === -1 ? undefined : argv[flagIndex + 1];
  if (flagArg !== undefined && /^\d+$/.test(flagArg)) {
    port = Number(flagArg);
  } else if (envPort) {
    if (!/^\d+$/.test(envPort)) {
      throw new Error(`Invalid BOE_MCP_HTTP_PORT: "${envPort}" is not a port number`);
    }
    port = Number(envPort);
  }
  port ??= DEFAULT_HTTP_PORT;
  if (port > 65535) {
    throw new Error(`Invalid HTTP port ${port}: must be between 0 and 65535`);
  }
  const host = env.BOE_MCP_HTTP_HOST?.trim() || DEFAULT_HTTP_HOST;
  return { port, host };
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

/**
 * Host-header allowlist for the SDK's DNS-rebinding protection. Only
 * enumerable when bound to loopback — the legitimate Host values a remote
 * deployment is reached by (its public hostname) can't be known here, so on
 * non-loopback binds protection is left off and the operator is expected to
 * front the server with network-level controls (see README).
 */
function loopbackAllowedHosts(port: number): string[] {
  return ["127.0.0.1", "localhost", "[::1]"].flatMap((h) => [`${h}:${port}`, h]);
}

function writeJson(res: ServerResponse, status: number, body: object, allow?: string): void {
  res.writeHead(status, {
    "content-type": "application/json",
    ...(allow ? { allow } : {}),
  });
  res.end(JSON.stringify(body));
}

function methodNotAllowed(res: ServerResponse): void {
  writeJson(
    res,
    405,
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Method Not Allowed: this server runs in stateless Streamable HTTP mode — send JSON-RPC via POST /mcp (there is no SSE stream or session to resume)",
      },
      id: null,
    },
    "POST",
  );
}

/**
 * Serve one POST /mcp request in stateless mode: a fresh McpServer +
 * StreamableHTTPServerTransport pair per request (the SDK's documented
 * stateless pattern — no session IDs, no shared state, safe to scale
 * horizontally). Both are torn down when the response closes.
 */
async function handleMcpPost(
  req: IncomingMessage,
  res: ServerResponse,
  allowedHosts: string[] | undefined,
): Promise<void> {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
    enableJsonResponse: true, // plain JSON responses; nothing here needs SSE streaming
    ...(allowedHosts
      ? { enableDnsRebindingProtection: true, allowedHosts }
      : {}),
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

export type HttpServerHandle = {
  port: number;
  host: string;
  close: () => Promise<void>;
};

/**
 * Start the Streamable HTTP transport on a plain node:http server.
 *
 * Routes: POST /mcp (JSON-RPC), GET/DELETE /mcp → 405, GET /healthz → 200,
 * anything else → 404. Pass port 0 for an ephemeral port; the handle reports
 * the real one. Logs one startup line to stderr (never stdout, which is the
 * protocol channel in stdio mode).
 */
export function startHttpServer(port: number, host: string): Promise<HttpServerHandle> {
  // Computed after listen so ephemeral ports (port 0) are covered too.
  let allowedHosts: string[] | undefined;

  const httpServer = createNodeHttpServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (path === "/mcp") {
      if (req.method === "POST") {
        handleMcpPost(req, res, allowedHosts).catch((err) => {
          console.error(`boe-mcp http: request failed: ${err}`);
          if (!res.headersSent) {
            writeJson(res, 500, {
              jsonrpc: "2.0",
              error: { code: -32603, message: "Internal server error" },
              id: null,
            });
          } else {
            res.end();
          }
        });
      } else {
        methodNotAllowed(res);
      }
    } else if (path === "/healthz" && (req.method === "GET" || req.method === "HEAD")) {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
    } else {
      writeJson(res, 404, { error: "Not found" });
    }
  });

  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      const address = httpServer.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      allowedHosts = LOOPBACK_HOSTS.has(host) ? loopbackAllowedHosts(actualPort) : undefined;
      console.error(
        `boe-mcp: Streamable HTTP transport (stateless) listening on http://${host}:${actualPort}/mcp`,
      );
      resolve({
        port: actualPort,
        host,
        close: () =>
          new Promise<void>((resolveClose, rejectClose) => {
            httpServer.close((err) => (err ? rejectClose(err) : resolveClose()));
            // Drop keep-alive connections so close() doesn't hang.
            httpServer.closeAllConnections();
          }),
      });
    });
  });
}
