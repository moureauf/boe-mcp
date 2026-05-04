# boe-mcp

MCP server exposing Bank of England base rate data to Claude Code. No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `get_current_rate` | Current base rate, effective date, months held at current level |
| `get_rate_history` | Last N rate changes — date, rate, direction, basis points moved |
| `get_next_mpc_meeting` | Date of next scheduled MPC meeting and days until it |

## Installation

Add to your Claude Code `settings.json`:

```json
{
"mcpServers": {
    "boe": {
    "command": "npx",
    "args": ["-y", "@moureauf/boe-mcp"]
    }
}
}

Configuration

┌───────────────────────┬─────────┬────────────────────────────┐
│        Env var        │ Default │        Description         │
├───────────────────────┼─────────┼────────────────────────────┤
│ BOE_CACHE_TTL_MINUTES │ 60      │ How long to cache BoE data │
└───────────────────────┴─────────┴────────────────────────────┘

Data sources

- Base rate: BoE IADB series IUDBEDR — public, no auth
- MPC dates: BoE website — parsed from public HTML

Running from source

git clone https://github.com/moureauf/boe-mcp.git
cd boe-mcp
npm install
npm run build
npm start