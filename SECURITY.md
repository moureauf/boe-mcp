# Security Policy

## Supported versions

Only the latest published version of `boe-mcp` on npm receives fixes. Please
upgrade before reporting.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately via GitHub's [private vulnerability reporting](https://github.com/moureauf/boe-mcp/security/advisories/new)
(Security → Report a vulnerability). I aim to acknowledge within a few days.

## Scope

`boe-mcp` is a read-only MCP server: it makes unauthenticated HTTPS requests to
public Bank of England endpoints and returns parsed data over stdio. It stores
no secrets, writes no files, and runs no user-supplied code. The most relevant
concerns are therefore parsing of untrusted upstream responses and the
integrity of the published npm package (which ships with build
[provenance](https://docs.npmjs.com/generating-provenance-statements/)).
