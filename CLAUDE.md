# boe-mcp

TypeScript MCP server exposing Bank of England base rate data.
Published to npm as `boe-mcp`.

## Commands

- `npm run build` — compile TypeScript to `dist/`
- `npm run dev` — watch mode
- `npm start` — run the server
- `npm test` — unit tests (no network)
- `npm run test:live` — integration smoke test against real BoE endpoints

## Architecture

Claude Code → MCP Server (stdio) → in-memory TTL cache → BoE IADB API

No auth required. All data from public BoE endpoints.

## Project structure

src/
index.ts          # server entry, tool registration
boe-client.ts     # BoE API calls + CSV/HTML parsing
cache.ts          # generic TTL cache
data.ts           # shared cached accessors used by the tools
tools/
    current-rate.ts
    rate-history.ts
    next-meeting.ts
test/                 # vitest tests + fixtures (test/live/ hits the network)
docs/specs/design.md  # full design spec — read this first

## Tools exposed

| Tool | Description |
|------|-------------|
| `get_current_rate` | Current base rate, effective date, months held |
| `get_rate_history` | Last N rate changes with basis points (default 10) |
| `get_rate_at` | Base rate in force on a given historical date |
| `get_next_mpc_meeting` | Date of next MPC meeting and days until it |

## Testing

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Git workflow
- Never push directly to main
- Always work on a feature branch and open a PR

## Workflow
- Before implementing any file or feature, propose a plan and wait for approval
- Write tests before implementation (create the test file first, then implement)
- After wiring up a new tool in index.ts, smoke test with:
`npx @modelcontextprotocol/inspector node dist/index.js`