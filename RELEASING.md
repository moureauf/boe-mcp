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

1. Bump `version` in `package.json` and the version passed to `McpServer` in
   `src/index.ts` (keep them in sync), via a PR to `main`.
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

## Manual fallback (if Actions is unavailable)

```bash
npm ci && npm test && npm publish --provenance --access public
```

Requires `npm login` and, if your account enforces 2FA, either an OTP prompt or
a granular token with 2FA bypass.
