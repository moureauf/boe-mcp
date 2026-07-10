# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-07-10

### Security
- Harden the MPC-page HTML stripping against crafted `<script>`/`<style>` end
  tags (e.g. `</script >`) that could otherwise slip date-like text past the
  filter (CodeQL `js/bad-tag-filter`). The body is matched with an unrolled
  loop, so the fix introduces no ReDoS.

### Changed
- Add least-privilege `permissions: contents: read` to the CI and live-canary
  workflows (CodeQL `actions/missing-workflow-permissions`).

## [0.1.2] - 2026-07-08

### Changed
- **Require Node.js >= 20.** Node 18 reached end-of-life in April 2025 and the
  test toolchain (vitest 4) no longer supports it. CI now runs on Node 20 and 24.
- Update the `zod` runtime dependency to v4 and refresh dev dependencies
  (vitest 4, `@types/node` 26, GitHub Actions).

### Added
- Automated publishing to the official MCP registry from the release workflow
  (`mcp-publisher` via GitHub OIDC), so one tag ships to npm and the registry.
- `CONTRIBUTING.md` documenting the development and release workflow.
- `SECURITY.md` with private vulnerability reporting.

## [0.1.1] - 2026-07-08

### Added
- Listed on the official MCP registry via `server.json` and the `mcpName` field.
- npm discoverability: README badges, richer description and keywords, and
  `author` / `homepage` / `bugs` metadata.
- A `version is in sync` test guarding the version across `package.json`,
  `src/index.ts`, and `server.json`.

### Changed
- Publishing moved to npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/)
  (OIDC, no token) with a build provenance attestation.

## [0.1.0] - 2026-07-07

### Added
- Initial release: an MCP server over stdio exposing Bank of England base rate
  data, with four tools — `get_current_rate`, `get_rate_history`, `get_rate_at`,
  and `get_next_mpc_meeting`.
- In-memory TTL cache (`BOE_CACHE_TTL_MINUTES`) with stale-on-error fallback.
- Structured tool output (JSON Schema) alongside the text response.
- Published to npm with a build provenance attestation.

[0.1.3]: https://github.com/moureauf/boe-mcp/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/moureauf/boe-mcp/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/moureauf/boe-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/moureauf/boe-mcp/releases/tag/v0.1.0
