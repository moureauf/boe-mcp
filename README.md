# boe-mcp

[![npm](https://img.shields.io/npm/v/boe-mcp?logo=npm)](https://www.npmjs.com/package/boe-mcp)
[![CI](https://github.com/moureauf/boe-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/moureauf/boe-mcp/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/boe-mcp)](https://www.npmjs.com/package/boe-mcp)
[![license](https://img.shields.io/npm/l/boe-mcp)](./LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.moureauf%2Fboe--mcp-blue)](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.moureauf/boe-mcp)

An MCP (Model Context Protocol) server that gives Claude Code — or any MCP client — live Bank of England base rate data: the current rate and how long it has been held, the history of recent rate changes, and the date of the next Monetary Policy Committee announcement. It runs over stdio, needs no API key or configuration, and caches responses in memory so repeated questions don't re-hit the BoE.

Published on npm as [`boe-mcp`](https://www.npmjs.com/package/boe-mcp) with build [provenance](https://docs.npmjs.com/generating-provenance-statements/) — install and run it with `npx -y boe-mcp`.

## Tools

| Tool | Description | Example output |
|------|-------------|----------------|
| `get_current_rate` | Current base rate, effective date, months held at this level | `{ "rate": 3.75, "effectiveDate": "2025-12-18", "monthsHeld": 6, "source": "https://www.bankofengland.co.uk/boeapps/iadb/...", "cachedAt": "2026-07-07T04:11:28Z" }` |
| `get_rate_history` | Last N rate changes (default 10) — date, rate, move in basis points vs previous (`null` for the earliest known entry) | `{ "entries": [{ "date": "2025-12-18", "rate": 3.75, "changeBps": -25 }, ...], "source": "...", "cachedAt": "..." }` |
| `get_rate_at` | The base rate in force on a specific historical date | `{ "date": "2020-03-15", "rate": 0.25, "effectiveDate": "2020-03-11", "source": "...", "cachedAt": "..." }` |
| `get_next_mpc_meeting` | Date of the next scheduled MPC announcement and days until it | `{ "date": "2026-07-30", "daysUntil": 23, "source": "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates", "cachedAt": "..." }` |
| `list_series` | Curated catalog of well-known IADB series (policy rates, market rates, FX, household rates) with code, name, description, unit and frequency — a starting point for `get_series` | `{ "series": [{ "code": "IUDSOIA", "name": "SONIA (Sterling Overnight Index Average)", "description": "...", "unit": "percent per annum", "frequency": "daily (business days)" }, ...], "note": "get_series also accepts any other IADB code..." }` |
| `get_series` | Fetch observations for **any** BoE IADB series by code, with optional `from`/`to` ISO dates and a `limit` (1–500, default 50) on the most recent points | `{ "seriesCode": "IUDSOIA", "name": "SONIA (Sterling Overnight Index Average)", "unit": "percent per annum", "frequency": "daily (business days)", "points": [{ "date": "2025-12-19", "value": 3.69 }, ...], "source": "...", "cachedAt": "..." }` |

`get_series` accepts any valid IADB code (not only the catalogued ones); an unknown or empty code returns a clean `Unknown or empty IADB series "XXXX" — use list_series for known codes` message. Use `list_series` to discover codes.

If the BoE is unreachable and a previously cached value exists, tools serve the cached data with `"stale": true` so the caller can flag the caveat. With no cache at all they return a clean error message.

## Installation

Add to your Claude Code `settings.json`:

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

Or use the CLI:

```bash
claude mcp add boe -- npx -y boe-mcp
```

<details>
<summary>Claude Desktop</summary>

Add to `claude_desktop_config.json`:

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

</details>

<details>
<summary>Cursor</summary>

Add to `~/.cursor/mcp.json`:

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

</details>

<details>
<summary>VS Code</summary>

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "boe": {
      "command": "npx",
      "args": ["-y", "boe-mcp"]
    }
  }
}
```

</details>

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `BOE_CACHE_TTL_MINUTES` | `60` | How long to cache BoE responses in memory (`0` disables caching) |

## Data sources

- **Base rate**: the Bank of England Statistical Interactive Database (IADB), series `IUDBEDR`, via its public CSV endpoint. No auth, no key. Honest caveat: the IADB is not officially documented as a public API — it has been stable for many years and is widely used, but the Bank makes no compatibility promises, so a breaking change is possible in principle.
- **MPC dates**: parsed from the BoE's public [upcoming MPC dates page](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates). The parser deliberately avoids depending on the page's markup (it scans the visible text for dates), so cosmetic redesigns won't break it.

## Running from source

```bash
git clone https://github.com/moureauf/boe-mcp.git
cd boe-mcp
npm install
npm run build
npm start            # runs the stdio server
```

Test and inspect:

```bash
npm test             # unit tests (HTTP mocked, no network)
npm run test:live    # integration smoke test against the real BoE endpoints
npx @modelcontextprotocol/inspector node dist/index.js
```

`BOE_IADB_BASE_URL` and `BOE_MPC_DATES_URL` can override the endpoint URLs, which is useful for testing against fixtures.

## Contributing & releasing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow (making changes, testing, adding tools, versioning) and how the release pipeline connects GitHub, npm, and the MCP registry. Publishing is automated: pushing a `v*` tag runs `.github/workflows/publish.yml`, which builds, tests, and publishes to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC — no token secret, with a provenance attestation) and to the official MCP registry. Exact commands and one-time setup are in [RELEASING.md](RELEASING.md).

## License

MIT
