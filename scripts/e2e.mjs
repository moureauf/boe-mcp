// Minimal MCP client: spawns the built server over stdio and calls all three
// tools. If BOE_IADB_BASE_URL/BOE_MPC_DATES_URL are set they are forwarded to
// the server (used to point at a local fixture server in sandboxed CI).
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const server = spawn("node", ["dist/index.js"], {
  cwd: process.env.SERVER_CWD ?? process.cwd(),
  env: process.env,
  stdio: ["pipe", "pipe", "inherit"],
});

const pending = new Map();
let nextId = 1;

const rl = createInterface({ input: server.stdout });
rl.on("line", (line) => {
  if (!line.trim()) return;
  const msg = JSON.parse(line);
  if (msg.id !== undefined && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

function request(method, params) {
  const id = nextId++;
  const p = new Promise((resolve, reject) => {
    pending.set(id, resolve);
    setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 30_000);
  });
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return p;
}

function notify(method) {
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
}

const init = await request("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "e2e-check", version: "0.0.0" },
});
console.log(`initialized: ${init.result.serverInfo.name} v${init.result.serverInfo.version}`);
notify("notifications/initialized");

const tools = await request("tools/list", {});
console.log("tools:", tools.result.tools.map((t) => t.name).join(", "));

let failed = false;
for (const [name, args] of [
  ["get_current_rate", {}],
  ["get_rate_history", { limit: 5 }],
  ["get_next_mpc_meeting", {}],
]) {
  const res = await request("tools/call", { name, arguments: args });
  const text = res.result?.content?.[0]?.text ?? JSON.stringify(res);
  const isError = res.result?.isError ?? false;
  console.log(`\n=== ${name}${isError ? " (ERROR)" : ""} ===\n${text}`);
  if (isError || res.error) failed = true;
}

server.kill();
process.exit(failed ? 1 : 0);
