# Contributing & development

How the project is developed, tested, and released. For the design rationale see
[`docs/specs/design.md`](docs/specs/design.md); for exact release commands see
[`RELEASING.md`](RELEASING.md).

## Prerequisites

- Node.js **>= 20** (CI runs the tests on 20 and 24)
- npm

## Getting started

```bash
git clone https://github.com/moureauf/boe-mcp.git
cd boe-mcp
npm install
npm run build      # tsc -> dist/
npm test           # unit tests (network mocked)
```

## Project layout

```
src/
  index.ts          # MCP server + tool registration (stdio transport)
  boe-client.ts     # all HTTP + CSV/HTML parsing (series code is config)
  cache.ts          # generic in-memory TTL cache
  data.ts           # shared cached accessors used by the tools
  tools/            # one file per tool (current-rate, rate-history, rate-at, next-meeting)
test/               # vitest unit tests + fixtures; test/live/ hits the real BoE
server.json         # official MCP registry manifest
```

## Development loop

```bash
npm run dev         # tsc --watch

# drive the server interactively with the MCP inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

The client (`boe-client.ts`) reads its endpoints from `BOE_IADB_BASE_URL` and
`BOE_MPC_DATES_URL`. Point them at a local fixture server to exercise the tools
end-to-end without hitting the BoE — this is how the server is verified in
sandboxes where `bankofengland.co.uk` is unreachable.

## Testing

- `npm test` — unit tests, **no network** (HTTP is mocked, CSV/HTML come from
  `test/fixtures/`). This is what CI runs, on Node 20 and 24.
- `npm run test:live` — integration smoke test against the **real** BoE
  endpoints. Excluded from PR CI; runs weekly via the `live-canary` workflow and
  can be triggered manually (Actions → Live canary → Run workflow). Run it before
  a release if you touched parsing.

Repo convention: **write the test first**, then implement (see existing
`test/*.test.ts` for the pattern). Keep unit tests network-free.

## Making a change

1. Branch off `main` (never commit to `main` directly).
2. Add/adjust tests, implement, `npm run build && npm test && npm run lint`.
3. Open a PR with a [Conventional Commits](https://www.conventionalcommits.org)
   title (`fix:`, `feat:`, `chore:`, `docs:` …) — release-please uses it to
   decide the next version and changelog entry. CI
   (`.github/workflows/ci.yml`) runs build + tests on Node 20 & 24 and Biome
   lint.
4. Squash-merge once green (the PR title becomes the squash commit message).

`main` is protected: it requires a pull request and the CI checks
**`build (20)`** and **`build (24)`** to pass before merging, so a red PR
cannot be merged. (You can also add `lint` as a required check.)

Lint/format is [Biome](https://biomejs.dev): `npm run lint` to check,
`npm run lint:fix` to auto-fix (import order etc.). The formatter is off — Biome
is used for linting only.

### Adding a new tool or data series

The architecture is built so this is additive. A new IADB series is just a new
series code passed to `fetchSeriesPoints` in `boe-client.ts` — no structural
change. A new tool is a new file in `src/tools/` plus a `registerTool` block in
`index.ts` (give it an `inputSchema`/`outputSchema` like the others). Add its
row to the tools table in `README.md`.

## Versioning

The version lives in **four** places and is kept in sync automatically by
release-please (and guarded by the `version is in sync` test in
`test/version-sync.test.ts`):

- `package.json` → `version`
- `src/index.ts` → `new McpServer({ version })` (marked `x-release-please-version`)
- `server.json` → `version` **and** `packages[0].version`

You don't bump these by hand — release-please does it in the release PR based on
your conventional-commit messages. Semver: `fix:` → patch, `feat:` → minor,
`feat!:` / `BREAKING CHANGE:` → major.

## Releasing

Version bump + changelog are automated by
[release-please](https://github.com/googleapis/release-please); publishing is a
manual button. In short:

1. Merge PRs to `main` with conventional-commit titles.
2. release-please maintains a **"chore: release X.Y.Z"** PR — merge it to create
   the `vX.Y.Z` tag + GitHub release.
3. **Actions → Publish → Run workflow** publishes to npm (trusted publishing +
   provenance) and the MCP registry.

Full details, including the one-time trusted-publisher setup and manual
fallbacks, are in [`RELEASING.md`](RELEASING.md).

> Versions are immutable on both npm and the MCP registry. release-please always
> bumps first; the publish workflow's guard safely skips npm if the version is
> already there.

## How the pieces connect

```
commits (Conventional Commits) ──▶ release-please PR ──(merge)──▶ vX.Y.Z tag + release
                                                                         │
                                              Actions ▸ Publish ◀────────┘ (manual)
                                                  ├──▶ npm registry   (boe-mcp, with provenance → this repo/commit)
                                                  └──▶ MCP registry    (io.github.moureauf/boe-mcp → the npm package)
```

- **npm** hosts the runnable package (`npx -y boe-mcp`); provenance ties each
  published version to the exact GitHub commit + workflow that built it.
- The **MCP registry** entry (`server.json`) is a thin pointer to the npm
  package, so MCP clients can discover the server. It's verified against the
  `mcpName` field in `package.json`.
- **GitHub** is the source of truth; the repo's npm URL (in "About") and the
  provenance/registry links close the loop between the three.
