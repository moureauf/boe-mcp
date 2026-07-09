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
2. Add/adjust tests, implement, `npm run build && npm test`.
3. Open a PR. CI (`.github/workflows/ci.yml`) runs build + tests on Node 20 & 24.
4. Squash-merge once green.

`main` is protected: it requires a pull request and the CI checks
**`build (20)`** and **`build (24)`** to pass before merging, so a red PR
cannot be merged.

### Adding a new tool or data series

The architecture is built so this is additive. A new IADB series is just a new
series code passed to `fetchSeriesPoints` in `boe-client.ts` — no structural
change. A new tool is a new file in `src/tools/` plus a `registerTool` block in
`index.ts` (give it an `inputSchema`/`outputSchema` like the others). Add its
row to the tools table in `README.md`.

## Versioning

The version lives in **four** places and must stay in sync — the
`version is in sync` test in `test/version-sync.test.ts` fails otherwise:

- `package.json` → `version`
- `src/index.ts` → `new McpServer({ version })`
- `server.json` → `version` **and** `packages[0].version`

Bump all of them in the release PR, and add a matching entry to
[`CHANGELOG.md`](CHANGELOG.md). Use semver; pre-1.0 we treat user-visible
changes (new tools, dropped Node versions) as minor and fixes as patch.

## Releasing

Full pipeline, one tag. After the version-bump PR is merged to `main`:

```bash
git checkout main && git pull
git tag vX.Y.Z            # must equal package.json version
git push origin vX.Y.Z
```

Pushing the tag triggers [`.github/workflows/publish.yml`](.github/workflows/publish.yml),
which:

1. builds + tests,
2. publishes to **npm** via [trusted publishing](https://docs.npmjs.com/trusted-publishers/)
   (OIDC — no token) with a build **provenance** attestation, then
3. publishes the same version to the **official MCP registry** with
   `mcp-publisher` (OIDC again — the `io.github.moureauf/*` namespace is proven
   by repo ownership).

You can also run it from Actions → Publish → Run workflow (it ships whatever
version is in `package.json`). See [`RELEASING.md`](RELEASING.md) for the
one-time trusted-publisher setup and a manual fallback.

> Versions are immutable on both npm and the MCP registry: you cannot re-publish
> an existing version. Always bump before releasing; re-running publish for a
> version that already shipped will fail (expected).

## How the pieces connect

```
GitHub repo ──(git tag v*)──▶ publish.yml
                                  ├──▶ npm registry      (boe-mcp, with provenance → links back to this repo/commit)
                                  └──▶ MCP registry       (io.github.moureauf/boe-mcp → points at the npm package)
```

- **npm** hosts the runnable package (`npx -y boe-mcp`); provenance ties each
  published version to the exact GitHub commit + workflow that built it.
- The **MCP registry** entry (`server.json`) is a thin pointer to the npm
  package, so MCP clients can discover the server. It's verified against the
  `mcpName` field in `package.json`.
- **GitHub** is the source of truth; the repo's npm URL (in "About") and the
  provenance/registry links close the loop between the three.
