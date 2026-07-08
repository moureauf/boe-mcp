# Releasing

`boe-mcp` is published to npm by the `publish.yml` GitHub Actions workflow using
**npm trusted publishing** (OIDC) — no `NPM_TOKEN` secret required. Every
published version carries a provenance attestation.

## One-time setup (already done for 0.1.0)

On npmjs.com, on the package page → **Settings → Trusted publisher**, add a
GitHub Actions publisher:

- Organization / user: `moureauf`
- Repository: `boe-mcp`
- Workflow filename: `publish.yml`
- Environment: (leave blank)

Once configured, the `NPM_TOKEN` secret can be deleted from the GitHub repo and
the bootstrap token revoked on npm — the workflow authenticates via OIDC.

## Cutting a release

1. Bump `version` in `package.json`, the version passed to `McpServer` in
   `src/index.ts`, and both `version` fields in `server.json` — via a PR to
   `main`. The `version is in sync` test fails if any of these drift.
2. Tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull
   git tag vX.Y.Z            # must match package.json version
   git push origin vX.Y.Z
   ```

The tag push triggers `publish.yml`: install → build → test → `npm publish
--provenance`. Watch it under the repo's **Actions** tab; the version appears at
https://www.npmjs.com/package/boe-mcp. You can also run it from **Actions →
Publish → Run workflow** (it publishes whatever version is in `package.json`).

## Listing on the official MCP registry

`server.json` (repo root) is the manifest for the [official MCP registry](https://github.com/modelcontextprotocol/registry). After the matching npm version is published (the registry verifies ownership via the `mcpName` field in `package.json`):

```bash
# one-time: install the CLI, then authenticate for the io.github.moureauf/* namespace
mcp-publisher login github
# publish the manifest (run mcp-publisher init first to regenerate if the schema has moved)
mcp-publisher publish
```

Re-run `mcp-publisher publish` after each release so the registry points at the current version.

## Manual fallback (if Actions is unavailable)

```bash
npm ci && npm test && npm publish --provenance --access public
```

Requires `npm login` and, if your account enforces 2FA, either an OTP prompt or
a granular token with 2FA bypass.
