# tests/e2e

Playwright end-to-end tests. Run `bun run build:test` first (they read the
built `.output/chrome-mv3`), then `bun run test:e2e`.

Tests load the **real built extension** into a persistent Chromium context via
`--load-extension`, so they exercise the real background service worker, real
`chrome.storage`, and real messaging (see
`docs/adr/0003-e2e-real-loaded-extension.md`). This is the only setup under
which the worker-owns-its-word-set design
(`docs/adr/0002-worker-owns-word-set.md`) can be validated.

- `bundleHarness.ts` — `setupBundleHarness(opts)` launches a persistent
  Chromium context with the extension loaded, opens the content page, seeds
  `chrome.storage` (via the worker) when `seedWords` is given, and intercepts
  the bing `trans` lookup with `context.route` so runs stay offline. It returns
  the `page`, the `worker`, `recycleWorker()` (CDP `Target.closeTarget` on the
  service-worker target — a deterministic stand-in for a ~30s idle recycle), and
  `waitForWorker()`. `selectWord` dispatches a real selection + mouseup;
  `STARTUP_MS` covers the content script's 2s startup delay. `chromiumBinary()`
  resolves a Chromium build that accepts `--load-extension` (branded Chrome
  ≥137 dropped the flag), preferring `PLAYWRIGHT_CHROME`, then Playwright's
  managed Chromium, then the ms-playwright cache.
- `server.ts` — static server (`:5199`) serving `pages/` at `/` and the
  generated wasm glue at `/wasm/` (used by the bench specs); started
  automatically via `webServer`.
- `highlight.spec.ts` — seeds a word and asserts the real pipeline highlights
  it on load. Covers the CJK UTF-16-offset path.
- `worker-restart.spec.ts` — the regression this refactor targets: recycles the
  background worker mid-session, then mutates the live page and asserts the
  rescan still highlights (the worker rehydrated its word set from storage),
  proving a fresh worker instance served the match.
- `selection-tooltip.spec.ts` — selects a word and asserts a transient
  translation card without nested highlight markup; also covers page-wide
  highlighting after selection, silent handling of missing dictionary results,
  a GitHub-like inline-link DOM regression, and the stopword retranslate dot.
- `csp-matcher.spec.ts` — guards the strict-CSP fix: loads a page with a
  GitHub-like CSP (no `wasm-unsafe-eval`) and asserts a selected word still
  highlights page-wide; plus pins that the MV3 extension CSP permits WASM.
- `matcher.bench.spec.ts` / `perf.bench.spec.ts` — matcher correctness vs a JS
  oracle and page-scan cost attribution; these load the wasm glue directly, not
  the extension.

Browser: a Playwright-provided **Chromium** binary is required (branded Chrome
can no longer load unpacked extensions). Run `npx playwright install chromium`
or point `PLAYWRIGHT_CHROME` at a compatible build. A display is needed
(extensions require headed Chromium); use `xvfb` in headless CI.
