# Releasing

One-time setup:

1. `npm login` (or verify with `npm whoami`).
2. Create an npm **automation** token: `npm token create --type=automation` (or via npmjs.com → Access Tokens).
3. Add it as the `NPM_TOKEN` secret in the GitHub repo: Settings → Secrets and variables → Actions → New repository secret.

Publishing 0.1.0 (version is already set in `package.json`):

```bash
git checkout main && git pull        # after the PR is merged
git tag v0.1.0
git push origin v0.1.0
```

The `publish.yml` workflow triggers on the tag push: it installs, builds, runs the unit tests, and runs `npm publish`. Watch it under the repo's Actions tab; the package appears at https://www.npmjs.com/package/boe-mcp.

For subsequent releases: bump `version` in `package.json` (and the version passed to `McpServer` in `src/index.ts`), commit via PR, then tag `vX.Y.Z` matching the new version and push the tag.

Manual fallback (if Actions is unavailable):

```bash
npm ci && npm test && npm publish
```
