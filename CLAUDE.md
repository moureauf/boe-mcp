# boe-mcp

TypeScript MCP server exposing Bank of England base rate data.
Published to npm as `boe-mcp`.

## Commands

- `npm run build` — compile TypeScript to `dist/`
- `npm run dev` — watch mode
- `npm start` — run the server
- `npm test` — unit tests (no network)
- `npm run test:live` — integration smoke test against real BoE endpoints
- `npm run lint` — check formatting/lint rules (Biome)
- `npm run lint:fix` — apply Biome fixes

## Architecture

Claude Code → MCP Server (stdio by default; opt-in Streamable HTTP) → in-memory TTL cache → BoE IADB API

No auth required. All data from public BoE endpoints.

Transports: stdio is the default. HTTP mode is opt-in via `--http [port]` or
`BOE_MCP_HTTP_PORT` (bind host `BOE_MCP_HTTP_HOST`, default 127.0.0.1) and runs
the SDK's StreamableHTTPServerTransport statelessly — a fresh server per POST.

## Project structure

src/
index.ts          # thin entry point: transport selection (stdio vs --http)
server.ts         # createServer(): tool registration (x-release-please-version marker lives here)
http.ts           # opt-in Streamable HTTP transport (stateless), /mcp + /healthz
boe-client.ts     # BoE API calls + CSV/HTML parsing
cache.ts          # generic TTL cache
data.ts           # shared cached accessors used by the tools
series-catalog.ts # curated IADB series catalog + lookup (for list_series)
tools/
    current-rate.ts
    rate-history.ts
    rate-at.ts
    rate-stats.ts
    next-meeting.ts
    mpc-dates.ts
    list-series.ts
    get-series.ts
test/                 # vitest tests + fixtures (test/live/ hits the network)
docs/specs/design.md  # full design spec — read this first

## Tools exposed

| Tool | Description |
|------|-------------|
| `get_current_rate` | Current base rate, effective date, months held |
| `get_rate_history` | Last N rate changes with basis points (default 10) |
| `get_rate_at` | Base rate in force on a given historical date |
| `get_rate_stats` | Min/max/time-weighted average, start/end rates and net bps move over a date range |
| `get_next_mpc_meeting` | Date of next MPC meeting and days until it |
| `get_mpc_dates` | All upcoming MPC announcement dates with days until each |
| `list_series` | Curated catalog of well-known IADB series (code, name, description, unit, frequency) |
| `get_series` | Observations for any IADB series by code, with optional from/to dates and limit |

## Configuration env vars

| Env var | Purpose |
|---------|---------|
| `BOE_CACHE_TTL_MINUTES` | Cache TTL (default 60, 0 disables) |
| `BOE_MCP_HTTP_PORT` | Enable HTTP mode on this port (also `--http [port]` flag) |
| `BOE_MCP_HTTP_HOST` | HTTP bind host (default 127.0.0.1; 0.0.0.0 exposes to the network) |
| `BOE_IADB_BASE_URL` / `BOE_MPC_DATES_URL` | Override endpoints (fixture testing) |

## Testing

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Git workflow
- Never push directly to main
- Always work on a feature branch and open a PR

## Workflow
- In interactive sessions, propose a plan before implementing substantial new features; in autonomous sessions, proceed once the task is agreed
- Write tests before implementation (create the test file first, then implement)
- After wiring up a new tool in index.ts, smoke test with:
`npx @modelcontextprotocol/inspector node dist/index.js`