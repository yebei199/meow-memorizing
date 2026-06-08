# src/wasm

Frontend glue for the Rust→WASM word matcher (`crates/wasm-matcher`).

- `matcherLoader.ts` — synchronous, cached `initSync` loader over the
  base64-embedded binary; throws on failure (no JS fallback — a browser
  without WASM is unsupported by design).
- `generated/` — produced by `bun run wasm` (wasm-bindgen glue + `.wasm` +
  `matcher-inline.ts` base64 payload). Gitignored; rebuild before
  `compile`/`build`.

The wordsList parsing + automata-caching wrapper lives in
`src/content-scripts/matcherFacade.ts`.
