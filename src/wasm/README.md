# src/wasm

Frontend glue for the Rust→WASM word matcher (`crates/wasm-matcher`).

- `matcherLoader.ts` — synchronous, cached `initSync` loader over the
  base64-embedded binary; throws on failure (no JS fallback — a browser
  without WASM is unsupported by design).
- `generated/` — produced by `bun run wasm` (wasm-bindgen glue + `.wasm` +
  `matcher-inline.ts` base64 payload). Gitignored; rebuild before
  `compile`/`build`.

`matcherLoader` runs only in the **background service worker**
(`entrypoints/background.ts`): a content script lives in the host page's
isolated world and inherits the page CSP, so on sites without
`wasm-unsafe-eval` (GitHub, X, …) `new WebAssembly.Module` throws
`CompileError`. The worker's extension CSP permits WASM. Content scripts reach
the matcher over messaging through `src/content-scripts/matcherFacade.ts`,
which parses the wordsList into active/deleted sets and skips re-syncing the
worker when they are unchanged.
