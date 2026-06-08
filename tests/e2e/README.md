# tests/e2e

Playwright end-to-end tests. Run with `bun run test:e2e` (requires a built
extension: `bun run build`, and the wasm glue from `bun run wasm`).

- `fixtures.ts` — loads the built MV3 extension (`.output/chrome-mv3`) into a
  persistent Chrome context and exposes the extension id.
- `server.ts` — static server (`:5199`) serving `pages/` at `/` and the
  generated wasm glue at `/wasm/`; started automatically via `webServer`.
- `highlight.spec.ts` — seeds a word via the service worker, loads a page, and
  asserts the content script (WASM-first) highlights it. Covers the CJK
  UTF-16-offset path.
- `matcher.bench.spec.ts` — imports the real wasm module and asserts its
  matches equal a faithful JS port of the legacy algorithm on a large input;
  records both timings.

Browser: system Chrome (no Playwright-managed binary). Override the path with
`PLAYWRIGHT_CHROME`.
