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

Versioning and the changelog are automated by
[release-please](https://github.com/googleapis/release-please) (`.github/workflows/release-please.yml`),
driven by [Conventional Commits](https://www.conventionalcommits.org) in PR
titles / commit messages (`fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING
CHANGE` → major).

1. Land your changes on `main` with conventional-commit messages.
2. release-please keeps an open **"chore: release X.Y.Z"** PR that bumps the
   version everywhere (`package.json`, `src/index.ts`, both fields in
   `server.json`) and updates `CHANGELOG.md`. Review and **merge it** — that
   creates the `vX.Y.Z` git tag and GitHub release.
3. **Publish:** go to **Actions → Publish → Run workflow** (on `main`). It
   builds, tests, `npm publish --provenance`, and publishes `server.json` to the
   MCP registry. (Publishing is a deliberate manual step; the guard skips npm if
   the version is already there.)

The `version is in sync` test guards against the four version locations drifting
if you ever bump by hand. Pushing a `vX.Y.Z` tag manually also triggers
`publish.yml`, so a hand-cut release still works.

The MCP registry publish is automated inside `publish.yml` (the `mcp-registry`
job, via `mcp-publisher` + GitHub OIDC), so no separate step is needed. To
publish the registry manifest by hand: `mcp-publisher login github && mcp-publisher publish`.

## Manual fallback (if Actions is unavailable)

```bash
npm ci && npm test && npm publish --provenance --access public
```

Requires `npm login` and, if your account enforces 2FA, either an OTP prompt or
a granular token with 2FA bypass.
