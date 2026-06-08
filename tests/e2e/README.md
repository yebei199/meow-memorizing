# tests/e2e

Playwright end-to-end tests. Run with `bun run test:e2e` (requires a built
extension: `bun run build`, and the wasm glue from `bun run wasm`).

- `fixtures.ts` — loads the built MV3 extension (`.output/chrome-mv3`) into a
  persistent Chrome context and exposes the extension id.
- `server.ts` — static server (`:5199`) serving `pages/` at `/` and the
  generated wasm glue at `/wasm/`; started automatically via `webServer`.
- `highlight.spec.ts` — seeds a word via the service worker, loads a page, and
  asserts the content script (WASM) highlights it. Covers the CJK
  UTF-16-offset path. Auto-skips when the extension's service worker can't be
  reached (see below).
- `selection-tooltip.spec.ts` — opens a real Google search page, selects a
  word in that page context, and asserts a transient translation card appears
  without nested highlight markup inside the card; also covers immediate
  page-wide highlighting after selection and a GitHub-like inline-link DOM
  regression.
- `matcher.bench.spec.ts` — imports the real wasm module and asserts its
  matches equal an independent correct JS oracle on a large input; records
  both timings. Does not need the extension loaded.

Browser: system Chrome (no Playwright-managed binary). Override the path with
`PLAYWRIGHT_CHROME`.

## Loading the extension (headless limitation)

Chrome (≥ ~128, here 148) refuses `--load-extension` of an unpacked
extension in headless mode, so `highlight.spec.ts` self-skips on a sandbox/CI
host with no display. To run it for real, give Chrome a display:

- Local desktop: a headed system Chrome loads the extension normally
  (`bun run dev` is the manual equivalent).
- CI / headless host: wrap the run in a virtual display —
  `xvfb-run -a bun run test:e2e`.

`matcher.bench.spec.ts` does not load the extension and runs everywhere.
