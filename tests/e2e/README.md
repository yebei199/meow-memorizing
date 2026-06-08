# tests/e2e

Playwright end-to-end tests. Run with `bun run test:e2e` (requires a built
extension: `bun run build`, and the wasm glue from `bun run wasm`).

Tests do **not** load the unpacked extension: recent Chrome (≥ ~137; 148 here)
blocks `--load-extension`, and CDP `Extensions.loadUnpacked` leaves the
extension inert (worker never starts, content scripts never inject) — so
extension-loading tests could only ever skip. Instead the real built content
bundle is injected into a normal page with a faked `browser`/`chrome` surface,
and the WASM-matcher messages are routed to a second CSP-free page running the
real matcher (a stand-in for the background worker). This runs in any Chrome.

- `bundleHarness.ts` — `setupBundleHarness` (injects the bundle, fakes storage
  + messaging, spins up the worker stand-in) and `selectWord` (dispatches a
  real selection + mouseup). `STARTUP_MS` covers the bundle's 2s startup delay
  before its selection listener attaches.
- `server.ts` — static server (`:5199`) serving `pages/` at `/` and the
  generated wasm glue at `/wasm/`; started automatically via `webServer`.
- `highlight.spec.ts` — seeds a word, loads a page, asserts the content
  pipeline (WASM matcher over messaging) highlights it. Covers the CJK
  UTF-16-offset path.
- `selection-tooltip.spec.ts` — selects a word and asserts a transient
  translation card appears without nested highlight markup; also covers
  immediate page-wide highlighting after selection and a GitHub-like
  inline-link DOM regression.
- `csp-matcher.spec.ts` — guards the strict-CSP fix: injects the bundle into a
  page with a GitHub-like CSP (no `wasm-unsafe-eval`) and asserts a selected
  word still highlights page-wide; plus pins that the MV3 extension CSP the
  worker runs under actually permits WASM.
- `matcher.bench.spec.ts` — imports the real wasm module and asserts its
  matches equal an independent correct JS oracle on a large input; records
  both timings.

Browser: system Chrome (no Playwright-managed binary). Override the path with
`PLAYWRIGHT_CHROME`. All specs need a fresh `bun run build` (they read the
built `.output/chrome-mv3` bundle + manifest).
