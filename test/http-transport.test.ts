import { request as httpRequest } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveHttpConfig, startHttpServer } from "../src/http.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
};

/**
 * POST a JSON-RPC message to /mcp the way a Streamable HTTP client does.
 * The SDK may answer with plain JSON (enableJsonResponse) or an SSE body,
 * so parse whichever content type comes back.
 */
async function postMcp(
  baseUrl: string,
  body: unknown,
): Promise<{ status: number; message: JsonRpcResponse | undefined }> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  let message: JsonRpcResponse | undefined;
  if (contentType.includes("text/event-stream")) {
    const dataLines = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim());
    const last = dataLines[dataLines.length - 1];
    message = last ? (JSON.parse(last) as JsonRpcResponse) : undefined;
  } else if (text.length > 0) {
    message = JSON.parse(text) as JsonRpcResponse;
  }
  return { status: res.status, message };
}

function initializeRequest(id: number): object {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "http-transport-test", version: "0.0.0" },
    },
  };
}

/**
 * Raw request via node:http so we can spoof the Host header — fetch/undici
 * silently drops it, which would make the DNS-rebinding test a no-op.
 */
function rawRequest(options: {
  port: number;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port: options.port,
        method: options.method,
        path: options.path,
        headers: options.headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// HTTP transport (real sockets, ephemeral port, no BoE network access —
// initialize and tools/list never trigger an upstream fetch)
// ---------------------------------------------------------------------------

describe("HTTP transport", () => {
  let handle: Awaited<ReturnType<typeof startHttpServer>>;
  let baseUrl: string;

  beforeAll(async () => {
    handle = await startHttpServer(0, "127.0.0.1");
    baseUrl = `http://127.0.0.1:${handle.port}`;
  });

  afterAll(async () => {
    await handle.close();
  });

  it("binds an ephemeral port and reports the real one", () => {
    expect(handle.port).toBeGreaterThan(0);
  });

  it("answers initialize with server info name boe-mcp", async () => {
    const { status, message } = await postMcp(baseUrl, initializeRequest(1));
    expect(status).toBe(200);
    expect(message?.error).toBeUndefined();
    const result = message?.result as
      | { serverInfo?: { name?: string; version?: string }; protocolVersion?: string }
      | undefined;
    expect(result?.serverInfo?.name).toBe("boe-mcp");
    expect(result?.protocolVersion).toBeTruthy();
  });

  it("lists all six tools over HTTP", async () => {
    const { status, message } = await postMcp(baseUrl, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    expect(status).toBe(200);
    expect(message?.error).toBeUndefined();
    const tools = (message?.result as { tools?: { name: string }[] } | undefined)?.tools ?? [];
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_current_rate",
      "get_next_mpc_meeting",
      "get_rate_at",
      "get_rate_history",
      "get_series",
      "list_series",
    ]);
  });

  it("rejects GET /mcp with 405 and a JSON-RPC error body (stateless: no SSE stream)", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      headers: { accept: "application/json, text/event-stream" },
    });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    const body = (await res.json()) as JsonRpcResponse;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error?.code).toBe(-32000);
  });

  it("rejects DELETE /mcp with 405 (stateless: no session to terminate)", async () => {
    const res = await fetch(`${baseUrl}/mcp`, { method: "DELETE" });
    expect(res.status).toBe(405);
    const body = (await res.json()) as JsonRpcResponse;
    expect(body.error?.message).toMatch(/POST/);
  });

  it("returns 404 for unknown paths", async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
  });

  it("serves GET /healthz for hosting platform health checks", async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("rejects a spoofed Host header on loopback (DNS-rebinding protection)", async () => {
    const { status } = await rawRequest({
      port: handle.port,
      method: "POST",
      path: "/mcp",
      headers: {
        host: "evil.example.com",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(initializeRequest(3)),
    });
    expect(status).toBe(403);
  });

  it("handles concurrent requests, each on a fresh stateless server instance", async () => {
    const [a, b] = await Promise.all([
      postMcp(baseUrl, initializeRequest(10)),
      postMcp(baseUrl, { jsonrpc: "2.0", id: 11, method: "tools/list", params: {} }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Transport selection (pure function, no sockets)
// ---------------------------------------------------------------------------

describe("resolveHttpConfig", () => {
  it("returns undefined with no flag and no env — stdio stays the default", () => {
    expect(resolveHttpConfig([], {})).toBeUndefined();
    expect(resolveHttpConfig(["--verbose"], { PATH: "/usr/bin" })).toBeUndefined();
  });

  it("--http alone defaults to port 3000 on 127.0.0.1", () => {
    expect(resolveHttpConfig(["--http"], {})).toEqual({ port: 3000, host: "127.0.0.1" });
  });

  it("--http <port> uses the explicit port", () => {
    expect(resolveHttpConfig(["--http", "8080"], {})).toEqual({ port: 8080, host: "127.0.0.1" });
  });

  it("--http <port> wins over BOE_MCP_HTTP_PORT", () => {
    expect(resolveHttpConfig(["--http", "8080"], { BOE_MCP_HTTP_PORT: "9090" })?.port).toBe(8080);
  });

  it("--http alone falls back to BOE_MCP_HTTP_PORT", () => {
    expect(resolveHttpConfig(["--http"], { BOE_MCP_HTTP_PORT: "9090" })?.port).toBe(9090);
  });

  it("BOE_MCP_HTTP_PORT alone enables HTTP mode without the flag", () => {
    expect(resolveHttpConfig([], { BOE_MCP_HTTP_PORT: "4000" })).toEqual({
      port: 4000,
      host: "127.0.0.1",
    });
  });

  it("BOE_MCP_HTTP_HOST overrides the bind host", () => {
    expect(resolveHttpConfig(["--http"], { BOE_MCP_HTTP_HOST: "0.0.0.0" })?.host).toBe("0.0.0.0");
  });

  it("rejects a non-numeric or out-of-range port", () => {
    expect(() => resolveHttpConfig([], { BOE_MCP_HTTP_PORT: "abc" })).toThrow(/BOE_MCP_HTTP_PORT/);
    expect(() => resolveHttpConfig(["--http", "70000"], {})).toThrow(/port/i);
  });
});
