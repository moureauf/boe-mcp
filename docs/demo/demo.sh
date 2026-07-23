#!/usr/bin/env bash
# Calls the real boe-mcp server via MCP Inspector's CLI mode and pretty-prints
# the JSON result. Used to record docs/demo/demo.gif with VHS — not shipped.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Trims `source`/`cachedAt` for a legible GIF — full fields are documented
# in the README's tool table.
call() {
  npx --no-install @modelcontextprotocol/inspector --cli node dist/index.js \
    --method tools/call --tool-name "$1" 2>/dev/null \
    | jq -r '.content[0].text' | jq -C 'del(.source, .cachedAt)'
}

call "$1"
