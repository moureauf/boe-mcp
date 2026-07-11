# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/moureauf/boe-mcp/compare/boe-mcp-v0.1.3...boe-mcp-v0.2.0) (2026-07-11)


### Features

* generic IADB series access — get_series and list_series tools ([#32](https://github.com/moureauf/boe-mcp/issues/32)) ([c8d9673](https://github.com/moureauf/boe-mcp/commit/c8d9673dafb914e56853cded6a45e1eb31643eb5))
* get_mpc_dates and get_rate_stats tools ([#34](https://github.com/moureauf/boe-mcp/issues/34)) ([a65c57b](https://github.com/moureauf/boe-mcp/commit/a65c57b2d1e44f32143060d3425b60d8fc211b4e))
* implement boe-mcp server end-to-end ([e4e0585](https://github.com/moureauf/boe-mcp/commit/e4e0585c7c426097655b9d7aa87241259bb33dfd))
* implement generic TTL cache ([607bd25](https://github.com/moureauf/boe-mcp/commit/607bd258b6d71719586a3f3e4feb4e48fcc80e01))
* implement generic TTL cache ([ca1d69e](https://github.com/moureauf/boe-mcp/commit/ca1d69ef87d77c70ed2fd21e201eb810e859a228))
* live-endpoint canary workflow + get_rate_at tool ([08dd026](https://github.com/moureauf/boe-mcp/commit/08dd026a8348470703c05be7afdffc0ed4e2c1ab))
* opt-in Streamable HTTP transport alongside stdio ([#35](https://github.com/moureauf/boe-mcp/issues/35)) ([2d88aa3](https://github.com/moureauf/boe-mcp/commit/2d88aa33ceac5efb7e29b209258eb3e1d48c2834))
* structured output, provenance, dependabot + review fixes ([793e3ea](https://github.com/moureauf/boe-mcp/commit/793e3ea0ba7ccd918b4f48e655dfe64c1fdee131))


### Bug Fixes

* **ci:** --access public required for provenance on first publish ([d47f0db](https://github.com/moureauf/boe-mcp/commit/d47f0db96f8fd2a1283729eb3e915bab21b524fc))
* **ci:** correct mcp-publisher download URL; split registry into its own job ([9be928b](https://github.com/moureauf/boe-mcp/commit/9be928b3832fa05c45e5e19324d9f6e922eba512))
* **ci:** correct mcp-publisher download URL; split registry job ([e838140](https://github.com/moureauf/boe-mcp/commit/e838140f7542746848a9705bc371ef3351740261))
* **ci:** drop `npm install -g npm@latest` from publish (sigstore bug) ([#26](https://github.com/moureauf/boe-mcp/issues/26)) ([68d88b9](https://github.com/moureauf/boe-mcp/commit/68d88b9c0ba99f071b97b72bcbb4414f0684f261))
* **ci:** Node 20/24 + drop EOL Node 18; MCP registry publish, SECURITY.md ([5294856](https://github.com/moureauf/boe-mcp/commit/52948569b12047e3b74376c2a66a77489e484e5f))
* **ci:** run on Node 20/24, drop EOL Node 18; registry + security ([1ecdd93](https://github.com/moureauf/boe-mcp/commit/1ecdd93d213b620be9929cdf8f6006181d894f7c))

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
