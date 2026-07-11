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

> **One-time setup:** release-please opens its release PR using the built-in
> `GITHUB_TOKEN`, which requires **Settings → Actions → General → Workflow
> permissions → "Allow GitHub Actions to create and approve pull requests"** to
> be enabled. Without it the workflow fails with *"GitHub Actions is not
> permitted to create or approve pull requests."* The release-please workflow
> also has a `workflow_dispatch` trigger, so you can re-run it from
> **Actions → release-please → Run workflow** after changing the setting.

1. Land your changes on `main` with conventional-commit messages.
2. release-please keeps an open **"chore: release X.Y.Z"** PR that bumps the
   version everywhere (`package.json`, `src/server.ts`, both fields in
   `server.json`) and updates `CHANGELOG.md`. Review and **merge it** — that
   creates the `vX.Y.Z` git tag and GitHub release, and the workflow then
   dispatches **Publish** automatically on the new tag. It builds, tests,
   `npm publish --provenance`, and publishes `server.json` to the MCP registry.
3. Nothing else — but **Actions → Publish → Run workflow** still works as a
   manual (re-)publish of whatever version `package.json` has on the chosen
   ref, and the guard skips npm if the version is already there.

> Why the dispatch step exists: tags created by release-please use the built-in
> `GITHUB_TOKEN`, and tag pushes made with that token never trigger
> `on: push: tags` workflows. `workflow_dispatch` is exempt from that rule, so
> the release-please job dispatches `publish.yml` itself. The `v0.2.0` release
> was recovered manually before this chain existed.

The `version is in sync` test guards against the four version locations drifting
if you ever bump by hand. Pushing a `vX.Y.Z` tag manually also triggers
`publish.yml`, so a hand-cut release still works.

Note: the CI checks required by branch protection don't start on the
release-please branch automatically (same `GITHUB_TOKEN` rule), so merging the
release PR needs either a human-credentialed push to its branch or an admin
merge. An empty commit to the branch is enough to kick CI.

The MCP registry publish is automated inside `publish.yml` (the `mcp-registry`
job, via `mcp-publisher` + GitHub OIDC), so no separate step is needed. To
publish the registry manifest by hand: `mcp-publisher login github && mcp-publisher publish`.

## Manual fallback (if Actions is unavailable)

```bash
npm ci && npm test && npm publish --provenance --access public
```

Requires `npm login` and, if your account enforces 2FA, either an OTP prompt or
a granular token with 2FA bypass.
