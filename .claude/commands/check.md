---
description: Build, test, and lint the project (pre-PR gate)
---

Run the project's full local check and report results concisely:

1. `npm run build` — TypeScript compile to `dist/`
2. `npm test` — unit tests (vitest, no network)
3. `npm run lint` — Biome lint

If anything fails, show the failing output and stop; otherwise report a one-line green summary. Do not commit or push.
