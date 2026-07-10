#!/bin/bash
set -euo pipefail

# Install dependencies so tests, lint and build work immediately in a fresh
# session. Only runs in Claude Code on the web (remote) — local sessions manage
# their own node_modules. `npm install` (not `npm ci`) is idempotent and
# cache-friendly across container reuse.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
npm install --no-audit --no-fund
