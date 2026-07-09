# boe-mcp Design Spec
*2026-04-24*

## Overview

A TypeScript MCP server that exposes Bank of England base rate data to Claude Code. Published as an npm package (`boe-mcp`), runnable via `npx` with zero configuration beyond a single Claude Code settings entry. No authentication required — all data sourced from publicly accessible BoE endpoints.

Part of a planned family of UK macro data MCPs (`boe-mcp`, `ons-mcp`) built as independent packages with single responsibility each.

---

## Tools Exposed

| Tool | Description |
|------|-------------|
| `get_current_rate` | Current base rate, effective date, months held at current level |
| `get_rate_history` | Last N rate changes — date, rate, direction, basis points moved. Default N=10, configurable by caller |
| `get_rate_at` | Base rate in force on a given historical date |
| `get_next_mpc_meeting` | Date of next scheduled MPC meeting and days until it |

---

## Architecture

```
Claude Code → MCP Server (stdio) → in-memory TTL cache → BoE IADB API (on miss)
```

The server is a Node.js process spawned by Claude Code as a child process over stdio transport. No persistent background process, no ports.

### Data Sources

- **Base rate data**: BoE Statistical Interactive Database (IADB), series code `IUDBEDR`. Public CSV endpoint, no auth, no API key.
- **MPC meeting dates**: BoE upcoming MPC dates page. Lightweight HTML parse. No auth.

Both sources are publicly accessible without registration. The BoE IADB is not officially documented as a public API but has been stable for years and is widely used.

### Caching (`src/cache.ts`)

Generic in-memory TTL cache: `Map<key, { data, fetchedAt }>`.

- Default TTL: 1 hour (configurable via `BOE_CACHE_TTL_MINUTES` env var)
- On cache hit within TTL: return immediately
- On cache miss or expired: fetch live, update cache
- On fetch failure with stale data: return stale data with `stale: true` flag — Claude surfaces this as a caveat to the user
- On fetch failure with no cache: return clean error message

### BoE Client (`src/boe-client.ts`)

Single module for all HTTP calls and response parsing. Built around series codes as config — fetching any IADB series is a matter of passing a different code. This makes future extension (adding new series) additive only, requiring no structural changes.

### Data Types

```typescript
interface RateEntry {
  date: string;        // ISO 8601
  rate: number;        // e.g. 3.75
  changeBps: number | null;  // basis points vs previous; null for first entry
}

interface RateHistory {
  entries: RateEntry[];
  source: string;      // URL fetched
  cachedAt: string;    // ISO 8601 timestamp
  stale?: boolean;     // present and true if serving stale cache
}

interface NextMeeting {
  date: string;        // ISO 8601
  daysUntil: number;
}
```

---

## Project Structure

```
boe-mcp/
├── src/
│   ├── index.ts               # MCP server entry point, tool registration
│   ├── tools/
│   │   ├── current-rate.ts    # get_current_rate tool handler
│   │   ├── rate-history.ts    # get_rate_history tool handler
│   │   ├── rate-at.ts         # get_rate_at tool handler
│   │   └── next-meeting.ts    # get_next_mpc_meeting tool handler
│   ├── boe-client.ts          # BoE API calls + CSV/HTML parsing
│   ├── data.ts                # shared cached accessors used by the tools
│   └── cache.ts               # Generic TTL cache
├── dist/                      # Compiled output (gitignored)
├── package.json               # bin entry → dist/index.js
├── tsconfig.json
├── README.md
└── .github/
    └── workflows/
        └── publish.yml        # Auto-publish to npm on version tag
```

---

## Distribution

- **Package name**: `boe-mcp`
- **Compiled**: `tsc` to `dist/`, not bundled — keeps output readable
- **bin entry**: `package.json` `bin` field points to `dist/index.js`
- **npm publish**: triggered automatically by GitHub Actions on push of a `v*` tag

### User installation (Claude Code settings.json)

```json
{
  "mcpServers": {
    "boe": {
      "command": "npx",
      "args": ["-y", "boe-mcp"]
    }
  }
}
```

No API keys, no environment variables required for basic use.

---

## Future Extensions

The architecture is intentionally open to extension without structural change:

- **Additional BoE series** (mortgage approvals, exchange rates, gilt yields): add a series code and a new tool file
- **MPC vote breakdowns / meeting minutes**: add an HTML parser for BoE minutes pages
- **ONS data** (CPI, GDP): separate `ons-mcp` package following the same pattern

A wrapper/aggregator MCP combining `boe-mcp` and `ons-mcp` may be worth considering once both exist, but is not planned now.

---

## README Structure

1. What it does (one paragraph)
2. Tools — table with name, description, example output
3. Installation — the one-line Claude Code config snippet
4. Configuration — `BOE_CACHE_TTL_MINUTES` env var
5. Data sources — note on BoE IADB public access and stability caveat
6. Contributing / running from source
