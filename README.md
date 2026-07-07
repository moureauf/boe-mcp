# boe-mcp

An MCP (Model Context Protocol) server that gives Claude Code — or any MCP client — live Bank of England base rate data: the current rate and how long it has been held, the history of recent rate changes, and the date of the next Monetary Policy Committee announcement. It runs over stdio, needs no API key or configuration, and caches responses in memory so repeated questions don't re-hit the BoE.

## Tools

| Tool | Description | Example output |
|------|-------------|----------------|
| `get_current_rate` | Current base rate, effective date, months held at this level | `{ "rate": 3.75, "effectiveDate": "2025-12-18", "monthsHeld": 6, "source": "https://www.bankofengland.co.uk/boeapps/iadb/...", "cachedAt": "2026-07-07T04:11:28Z" }` |
| `get_rate_history` | Last N rate changes (default 10) — date, rate, move in basis points vs previous (`null` for the earliest known entry) | `{ "entries": [{ "date": "2025-12-18", "rate": 3.75, "changeBps": -25 }, ...], "source": "...", "cachedAt": "..." }` |
| `get_next_mpc_meeting` | Date of the next scheduled MPC announcement and days until it | `{ "date": "2026-07-30", "daysUntil": 23, "source": "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates", "cachedAt": "..." }` |

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

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `BOE_CACHE_TTL_MINUTES` | `60` | How long to cache BoE responses in memory |

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

## Releasing

Publishing is automated: pushing a `v*` tag runs `.github/workflows/publish.yml`, which builds, tests, and publishes to npm. It needs an `NPM_TOKEN` secret (an npm automation token) configured in the repository settings. See [RELEASING.md](RELEASING.md) for the exact steps.

## License

MIT
